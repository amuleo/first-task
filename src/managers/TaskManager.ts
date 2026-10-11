/* ════════════════════════════════════════════════════════════
   📋 مدیریت تسک‌ها — منطق اصلی
   ✅ استخراج از نوت‌ها + ادغام با ایندکس
   ✅ آمار (Jalali-aware)
   ✅ پین / انجام / ویرایش
   ✅ کش هوشمند (hash + mtime)
   ════════════════════════════════════════════════════════════ */

import { App, TFile } from 'obsidian';
import type {
    ExtractedTask,
    FirstTaskSettings,
    CompletedStats,
    TaskIndexEntry,
} from '../types';
import { VaultScanner } from './VaultScanner';
import { TaskExtractor } from './TaskExtractor';
import { IndexManager } from './IndexManager';
import { hashContent } from '../utils/hash';
import {
    isToday,
    isTomorrow,
    isWithinNextWeek,
    isThisMonth,
    isThisYear,
    startOfDay,
    startOfYesterday,
    startOfDaysAgo,
    getJalaliYearStart,
    getJalaliPrevMonthStart,
    getGregorianYearStart,
    getGregorianPrevMonthStart,
} from '../utils/jalaliDate';

/* حد تحمل انحراف ساعت کاربر (۵ دقیقه) */
const CLOCK_DRIFT_TOLERANCE = 5 * 60 * 1000;

export class TaskManager {
    private tasks: Map<string, ExtractedTask> = new Map();
    private stats: CompletedStats = {
        today: 0,
        yesterday: 0,
        this_week: 0,
        last_month: 0,
        this_year: 0,
        total: 0,
    };
    private lastSyncTs = 0;

    constructor(
        private app: App,
        private scanner: VaultScanner,
        private extractor: TaskExtractor,
        private index: IndexManager,
        private getSettings: () => FirstTaskSettings
    ) {}

    private get settings(): FirstTaskSettings {
        return this.getSettings();
    }

    /* ═══════════════════════════════════════════════════════
       🚀 راه‌اندازی اولیه
       ═══════════════════════════════════════════════════════ */
    async initialize(): Promise<void> {
        /* ─── اطمینان از پوشه + لود ایندکس ─── */
        await this.index.ensureFolder();
        await this.index.loadIndex();
        await this.index.loadFileCache();

        /* ─── اسکن کامل ─── */
        await this.rescanAll();
    }

    /* ═══════════════════════════════════════════════════════
       🔄 اسکن کامل والت
       ═══════════════════════════════════════════════════════ */
    async rescanAll(): Promise<void> {
        const files = this.scanner.getMarkdownFiles();
        const newTasks = new Map<string, ExtractedTask>();

        /* ─── پردازش دسته‌ای برای سرعت ─── */
        const chunks = this.chunkArray(files, 15);
        for (const chunk of chunks) {
            const results = await Promise.all(
                chunk.map(f => this.scanSingleFile(f))
            );
            for (const tasks of results) {
                for (const task of tasks) {
                    newTasks.set(task._id, task);
                }
            }
        }

        /* ─── ادغام با ایندکس ─── */
        for (const task of newTasks.values()) {
            const entry = this.index.getEntry(task._id);
            task.description = entry.description;
            task.due_date_iso = entry.due_date_iso;
            task.category = entry.category;
            task.pinned = entry.pinned;
        }

        this.tasks = newTasks;
        this.lastSyncTs = Date.now();

        /* ─── ذخیره کش فایل‌ها ─── */
        await this.index.saveFileCache();

        /* ─── پاکسازی ایندکس‌های یتیم ─── */
        await this.index.cleanupOrphans(new Set(this.tasks.keys()));

        /* ─── محاسبه آمار ─── */
        this.recomputeStats();
    }

    /* ═══════════════════════════════════════════════════════
       📄 اسکن یه فایل (با کش هوشمند)
       ═══════════════════════════════════════════════════════ */
    private async scanSingleFile(file: TFile): Promise<ExtractedTask[]> {
        const stat = this.scanner.getFileStat(file);
        const cached = this.index.getFileCache(file.path);

        /* ─── چک mtime ─── */
        if (cached && cached.mtime === stat.mtime && cached.size === stat.size) {
            /* mtime و size یکی‌ان → از کش استفاده کن */
            /* ولی تسک‌ها رو باید دوباره استخراج کنیم */
            /* چون ایندکس توی index.json نگه داشته می‌شه */
        }

        /* ─── خوندن محتوا ─── */
        const content = await this.scanner.readFile(file);
        if (!content) return [];

        /* ─── چک hash (اگه mtime عوض شده ولی محتوا یکی) ─── */
        const hash = hashContent(content);
        if (cached && cached.hash === hash) {
            /* محتوا یکی → از تسک‌های فعلی استفاده کن */
            return this.getTasksForFile(file.path);
        }

        /* ─── استخراج ─── */
        const tasks = this.extractor.extractFromContent(content, file.path);

        /* ─── ذخیره کش ─── */
        this.index.updateFileCache(file.path, {
            mtime: stat.mtime,
            size: stat.size,
            hash,
        });

        return tasks;
    }

    /* ═══════════════════════════════════════════════════════
       📖 اسکن یه فایل به‌صورت single (بعد از تغییر)
       ═══════════════════════════════════════════════════════ */
    async rescanFile(file: TFile): Promise<void> {
        if (!this.scanner.shouldInclude(file)) {
            /* فایل الان نباید شامل باشه → تسک‌هاش رو حذف کن */
            this.removeTasksForFile(file.path);
            return;
        }

        const content = await this.scanner.readFile(file);
        if (!content) return;

        /* ─── حذف تسک‌های قبلی این فایل ─── */
        this.removeTasksForFile(file.path);

        /* ─── استخراج ─── */
        const tasks = this.extractor.extractFromContent(content, file.path);

        /* ─── ادغام با ایندکس ─── */
        for (const task of tasks) {
            const entry = this.index.getEntry(task._id);
            task.description = entry.description;
            task.due_date_iso = entry.due_date_iso;
            task.category = entry.category;
            task.pinned = entry.pinned;

            this.tasks.set(task._id, task);
        }

        /* ─── آپدیت کش ─── */
        const stat = this.scanner.getFileStat(file);
        this.index.updateFileCache(file.path, {
            mtime: stat.mtime,
            size: stat.size,
            hash: hashContent(content),
        });

        /* ─── پاکسازی + آمار ─── */
        await this.index.saveFileCache();
        await this.index.cleanupOrphans(new Set(this.tasks.keys()));
        this.recomputeStats();
    }

    /* ═══════════════════════════════════════════════════════
       🗑️ حذف تسک‌های یه فایل (وقتی فایل حذف/تغییر می‌کنه)
       ═══════════════════════════════════════════════════════ */
    removeTasksForFile(path: string): void {
        for (const [id, task] of this.tasks.entries()) {
            if (task._source_file === path) {
                this.tasks.delete(id);
            }
        }
        this.index.removeFileCache(path);
    }

    /* ═══════════════════════════════════════════════════════
       📖 گرفتن تسک‌های یه فایل (از حافظه)
       ═══════════════════════════════════════════════════════ */
    getTasksForFile(path: string): ExtractedTask[] {
        const result: ExtractedTask[] = [];
        for (const task of this.tasks.values()) {
            if (task._source_file === path) {
                result.push(task);
            }
        }
        return result;
    }

    /* ═══════════════════════════════════════════════════════
       📊 محاسبه آمار
       ═══════════════════════════════════════════════════════ */
    private recomputeStats(): void {
        const now = Date.now();
        const useJalali = this.settings.useJalaliDate;

        const todayStart = startOfDay(now);
        const yesterdayStart = startOfYesterday(now);
        const weekStart = startOfDaysAgo(now, 6);

        let yearStart: number;
        let prevMonthStart: number;

        if (useJalali) {
            yearStart = getJalaliYearStart(now);
            prevMonthStart = getJalaliPrevMonthStart(now);
        } else {
            yearStart = getGregorianYearStart(now);
            prevMonthStart = getGregorianPrevMonthStart(now);
        }

        /* ─── فیلتر تسک‌های انجام‌شده معتبر ─── */
        const upperBound = now + CLOCK_DRIFT_TOLERANCE;
        const completed = Array.from(this.tasks.values()).filter(t =>
            t.completed
        );

        this.stats = {
            today: completed.filter(t => this.isCompletedSince(t, todayStart)).length,
            yesterday: completed.filter(t =>
                this.isCompletedSince(t, yesterdayStart) &&
                !this.isCompletedSince(t, todayStart)
            ).length,
            this_week: completed.filter(t => this.isCompletedSince(t, weekStart)).length,
            last_month: completed.filter(t => this.isCompletedSince(t, prevMonthStart)).length,
            this_year: completed.filter(t => this.isCompletedSince(t, yearStart)).length,
            total: completed.length,
        };
    }

    /* ═══════════════════════════════════════════════════════
       🕐 چک: تسک انجام شده بعد از این زمان؟
       (چون تسک‌ها هیچ timestamp ندارن، از mtime فایل استفاده می‌کنیم)
       ═══════════════════════════════════════════════════════ */
    private isCompletedSince(task: ExtractedTask, since: number): boolean {
        /* ─── گرفتن mtime فایل مبدأ ─── */
        const file = this.scanner.getFileByPath(task._source_file);
        if (!file) return false;
        return file.stat.mtime >= since;
    }

    /* ═══════════════════════════════════════════════════════
       📋 گرفتن تسک‌ها
       ═══════════════════════════════════════════════════════ */
    getAllTasks(): ExtractedTask[] {
        return Array.from(this.tasks.values());
    }

    getPendingTasks(): ExtractedTask[] {
        return Array.from(this.tasks.values())
            .filter(t => !t.completed)
            .sort(this.sortTasks);
    }

    getCompletedTasks(): ExtractedTask[] {
        return Array.from(this.tasks.values())
            .filter(t => t.completed)
            .sort((a, b) => {
                const fa = this.scanner.getFileByPath(a._source_file);
                const fb = this.scanner.getFileByPath(b._source_file);
                const ma = fa?.stat.mtime || 0;
                const mb = fb?.stat.mtime || 0;
                return mb - ma;
            });
    }

    getTaskById(id: string): ExtractedTask | null {
        return this.tasks.get(id) || null;
    }

    /* ═══════════════════════════════════════════════════════
       🔀 مرتب‌سازی (پین اول، بعد جدیدترین)
       ═══════════════════════════════════════════════════════ */
    private sortTasks = (a: ExtractedTask, b: ExtractedTask): number => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return a.title.localeCompare(b.title, 'fa');
    };

    /* ═══════════════════════════════════════════════════════
       🏷️ گرفتن دسته‌بندی‌های یه تسک (کاربر + داینامیک)
       ═══════════════════════════════════════════════════════ */
    getTaskCategories(task: ExtractedTask): string[] {
        const cats: string[] = [];

        /* ─── دسته‌ی کاربر (از ایندکس) ─── */
        if (task.category) {
            cats.push(task.category);
        }

        /* ─── دسته‌های داینامیک (بر اساس due_date) ─── */
        if (task.due_date_iso) {
            const dyn = this.settings.dynamicCategories;

            /* ─── امروز (اجباری) ─── */
            if (isToday(task.due_date_iso)) {
                cats.push('today');
            }

            if (dyn.tomorrow && isTomorrow(task.due_date_iso)) {
                cats.push('tomorrow');
            }
            if (dyn.this_week && isWithinNextWeek(task.due_date_iso)) {
                cats.push('this_week');
            }
            if (dyn.this_month && isThisMonth(task.due_date_iso)) {
                cats.push('this_month');
            }
            if (dyn.this_year && isThisYear(task.due_date_iso)) {
                cats.push('this_year');
            }
        }

        return cats;
    }

    /* ═══════════════════════════════════════════════════════
       🏷️ گرفتن همه‌ی دسته‌های کاربر (برای dropdown ها)
       ═══════════════════════════════════════════════════════ */
    getUserCategories(): string[] {
        const set = new Set<string>();
        for (const task of this.tasks.values()) {
            if (task.category) set.add(task.category);
        }
        return Array.from(set).sort();
    }

    /* ═══════════════════════════════════════════════════════
       ✅ انجام / انجام نشده (تغییر markdown)
       ═══════════════════════════════════════════════════════ */
    async toggleComplete(taskId: string): Promise<boolean> {
        const task = this.tasks.get(taskId);
        if (!task) return false;

        const file = this.scanner.getFileByPath(task._source_file);
        if (!file) return false;

        try {
            const content = await this.scanner.readFile(file);
            const newContent = this.extractor.toggleTaskInContent(
                content,
                task._source_file,
                taskId
            );

            if (newContent === null) return false;

            await this.app.vault.modify(file, newContent);

            /* ─── آپدیت حافظه ─── */
            task.completed = !task.completed;

            /* ─── آمار ─── */
            this.recomputeStats();

            return true;
        } catch (e) {
            console.warn('[First Task] toggleComplete failed:', e);
            return false;
        }
    }

    /* ═══════════════════════════════════════════════════════
       📌 پین / آنپین (فقط ایندکس)
       ═══════════════════════════════════════════════════════ */
    async togglePin(taskId: string): Promise<boolean> {
        const task = this.tasks.get(taskId);
        if (!task) return false;

        const newPinned = !task.pinned;

        await this.index.updateEntry(taskId, { pinned: newPinned });

        task.pinned = newPinned;
        return true;
    }

    /* ═══════════════════════════════════════════════════════
       ✏️ آپدیت توضیحات / تاریخ / دسته (فقط ایندکس)
       ═══════════════════════════════════════════════════════ */
    async updateTaskInfo(taskId: string, patch: Partial<TaskIndexEntry>): Promise<boolean> {
        const task = this.tasks.get(taskId);
        if (!task) return false;

        await this.index.updateEntry(taskId, patch);

        if (patch.description !== undefined) task.description = patch.description;
        if (patch.due_date_iso !== undefined) task.due_date_iso = patch.due_date_iso;
        if (patch.category !== undefined) task.category = patch.category;
        if (patch.pinned !== undefined) task.pinned = patch.pinned;

        this.recomputeStats();
        return true;
    }

    /* ═══════════════════════════════════════════════════════
       ➕ ساخت تسک جدید (افزودن به فایل مبدأ)
       ═══════════════════════════════════════════════════════ */
    async createTask(
        title: string,
        sourceFile: string,
        description: string = '',
        dueDateIso: string = '',
        category: string = ''
    ): Promise<boolean> {
        const file = this.scanner.getFileByPath(sourceFile);
        if (!file) return false;

        try {
            const content = await this.scanner.readFile(file);
            const result = this.extractor.addTaskToContent(content, title);

            await this.app.vault.modify(file, result.content);

            /* ─── تسک جدید رو توی ایندکس ذخیره کن ─── */
            const { generateTaskId } = await import('../utils/hash');
            const newId = generateTaskId(sourceFile, title);

            await this.index.updateEntry(newId, {
                description,
                due_date_iso: dueDateIso,
                category,
                pinned: false,
            });

            /* ─── فایل رو rescan کن ─── */
            await this.rescanFile(file);

            return true;
        } catch (e) {
            console.warn('[First Task] createTask failed:', e);
            return false;
        }
    }

    /* ═══════════════════════════════════════════════════════
       📊 اطلاعات کمکی
       ═══════════════════════════════════════════════════════ */
    getStats(): CompletedStats {
        return this.stats;
    }

    getLastSyncTs(): number {
        return this.lastSyncTs;
    }

    getTaskCount(): number {
        return this.tasks.size;
    }

    /* ═══════════════════════════════════════════════════════
       🛠️ ابزار
       ═══════════════════════════════════════════════════════ */
    private chunkArray<T>(arr: T[], size: number): T[][] {
        const out: T[][] = [];
        for (let i = 0; i < arr.length; i += size) {
            out.push(arr.slice(i, i + size));
        }
        return out;
    }
}
