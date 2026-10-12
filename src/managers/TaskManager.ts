/* ════════════════════════════════════════════════════════════
   📋 مدیریت تسک‌ها — v0.2.0
   ✅ ذخیره تمام اطلاعات در ایندکس (نه markdown)
   ✅ زمان ساخت + زمان اتمام خودکار
   ✅ دو تاریخ (شمسی + میلادی) برای سوییچ داینامیک
   ✅ دسته‌بندی‌ها از CategoriesManager
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
import { CategoriesManager } from './CategoriesManager';
import { hashContent, generateTaskId } from '../utils/hash';
import { getDisplayNoteName } from '../utils/noteUtils';
import {
    isTodayTs, isTomorrowTs, isWithinNextWeekTs, isThisMonthTs, isThisYearTs,
    startOfDay, startOfYesterday, startOfDaysAgo,
    getJalaliYearStart, getJalaliPrevMonthStart,
    getGregorianYearStart, getGregorianPrevMonthStart,
    getJalaliDateFull, getGregorianDateFull,
} from '../utils/jalaliDate';

export class TaskManager {
    private tasks: Map<string, ExtractedTask> = new Map();
    private stats: CompletedStats = {
        today: 0, yesterday: 0, this_week: 0,
        last_month: 0, this_year: 0, total: 0,
    };
    private lastSyncTs = 0;

    constructor(
        private app: App,
        private scanner: VaultScanner,
        private extractor: TaskExtractor,
        private index: IndexManager,
        private categories: CategoriesManager,
        private getSettings: () => FirstTaskSettings
    ) {}

    private get settings(): FirstTaskSettings {
        return this.getSettings();
    }

    /* ═══════════════════════════════════════════════════════
       🚀 راه‌اندازی
       ═══════════════════════════════════════════════════════ */
    async initialize(): Promise<void> {
        await this.index.ensureFolder();
        await this.categories.ensureFile();
        await this.index.loadIndex();
        await this.index.loadFileCache();
        await this.categories.load();
        await this.rescanAll();
    }

    /* ═══════════════════════════════════════════════════════
       🔄 اسکن کامل
       ═══════════════════════════════════════════════════════ */
    async rescanAll(): Promise<void> {
        const files = this.scanner.getMarkdownFiles();
        const newTasks = new Map<string, ExtractedTask>();

        const chunks = this.chunkArray(files, 15);
        for (const chunk of chunks) {
            const results = await Promise.all(
                chunk.map(f => this.scanSingleFile(f))
            );
            for (const tasks of results) {
                for (const task of tasks) newTasks.set(task._id, task);
            }
        }

        /* ─── ادغام با ایندکس ─── */
        for (const task of newTasks.values()) {
            const entry = this.index.getEntry(task._id);
            this.applyEntry(task, entry);

            /* ─── اگه تسک جدید بود و created_ts نداشت ─── */
            if (!entry.created_ts) {
                await this.setCreatedTime(task._id);
                const refreshed = this.index.getEntry(task._id);
                this.applyEntry(task, refreshed);
            }
        }

        this.tasks = newTasks;
        this.lastSyncTs = Date.now();

        await this.index.saveFileCache();
        await this.index.cleanupOrphans(new Set(this.tasks.keys()));
        this.recomputeStats();
    }

    private applyEntry(task: ExtractedTask, entry: TaskIndexEntry): void {
        task.description = entry.description || '';
        task.category = entry.category || '';
        task.pinned = entry.pinned === true;
        task.due_date_jalali = entry.due_date_jalali || '';
        task.due_date_gregorian = entry.due_date_gregorian || '';
        task.due_date_ts = entry.due_date_ts || 0;
        task.created_jalali = entry.created_jalali || '';
        task.created_gregorian = entry.created_gregorian || '';
        task.created_ts = entry.created_ts || 0;
        task.completed_jalali = entry.completed_jalali || '';
        task.completed_gregorian = entry.completed_gregorian || '';
        task.completed_ts = entry.completed_ts || 0;
    }

    private async setCreatedTime(taskId: string): Promise<void> {
        const now = new Date();
        await this.index.updateEntry(taskId, {
            created_jalali: getJalaliDateFull(now),
            created_gregorian: getGregorianDateFull(now),
            created_ts: now.getTime(),
        });
    }

    /* ─── اسکن یه فایل ─── */
    private async scanSingleFile(file: TFile): Promise<ExtractedTask[]> {
        const content = await this.scanner.readFile(file);
        if (!content) return [];

        const stat = this.scanner.getFileStat(file);
        const hash = hashContent(content);
        const tasks = this.extractor.extractFromContent(content, file.path);

        this.index.updateFileCache(file.path, {
            mtime: stat.mtime,
            size: stat.size,
            hash,
        });

        return tasks;
    }

    /* ─── اسکن یه فایل (بعد از تغییر) ─── */
    async rescanFile(file: TFile): Promise<void> {
        if (!this.scanner.shouldInclude(file)) {
            this.removeTasksForFile(file.path);
            return;
        }

        const content = await this.scanner.readFile(file);
        if (!content) return;

        this.removeTasksForFile(file.path);

        const tasks = this.extractor.extractFromContent(content, file.path);

        for (const task of tasks) {
            const entry = this.index.getEntry(task._id);
            this.applyEntry(task, entry);

            if (!entry.created_ts) {
                await this.setCreatedTime(task._id);
                const refreshed = this.index.getEntry(task._id);
                this.applyEntry(task, refreshed);
            }

            this.tasks.set(task._id, task);
        }

        const stat = this.scanner.getFileStat(file);
        this.index.updateFileCache(file.path, {
            mtime: stat.mtime,
            size: stat.size,
            hash: hashContent(content),
        });

        await this.index.saveFileCache();
        await this.index.cleanupOrphans(new Set(this.tasks.keys()));
        this.recomputeStats();
    }

    /* ─── حذف تسک‌های یه فایل ─── */
    removeTasksForFile(path: string): void {
        for (const [id, task] of this.tasks.entries()) {
            if (task._source_file === path) {
                this.tasks.delete(id);
            }
        }
        this.index.removeFileCache(path);
    }

    /* ─── تسک‌های یه فایل ─── */
    getTasksForFile(path: string): ExtractedTask[] {
        const result: ExtractedTask[] = [];
        for (const task of this.tasks.values()) {
            if (task._source_file === path) result.push(task);
        }
        return result;
    }

    /* ═══════════════════════════════════════════════════════
       📊 آمار (بر اساس completed_ts ایندکس)
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

        /* ─── تسک‌های انجام‌شده با completed_ts معتبر ─── */
        const completed = Array.from(this.tasks.values()).filter(t =>
            t.completed && t.completed_ts > 0
        );

        this.stats = {
            today: completed.filter(t => t.completed_ts >= todayStart).length,
            yesterday: completed.filter(t =>
                t.completed_ts >= yesterdayStart && t.completed_ts < todayStart
            ).length,
            this_week: completed.filter(t => t.completed_ts >= weekStart).length,
            last_month: completed.filter(t => t.completed_ts >= prevMonthStart).length,
            this_year: completed.filter(t => t.completed_ts >= yearStart).length,
            total: completed.length,
        };
    }

    /* ═══════════════════════════════════════════════════════
       📋 گرفتن تسک‌ها
       ═══════════════════════════════════════════════════════ */
    getAllTasks(): ExtractedTask[] { return Array.from(this.tasks.values()); }

    getPendingTasks(): ExtractedTask[] {
        return Array.from(this.tasks.values())
            .filter(t => !t.completed)
            .sort(this.sortTasks);
    }

    getCompletedTasks(): ExtractedTask[] {
        return Array.from(this.tasks.values())
            .filter(t => t.completed)
            .sort((a, b) => b.completed_ts - a.completed_ts);
    }

    getTaskById(id: string): ExtractedTask | null {
        return this.tasks.get(id) || null;
    }

    private sortTasks = (a: ExtractedTask, b: ExtractedTask): number => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return a.title.localeCompare(b.title, 'fa');
    };

    /* ═══════════════════════════════════════════════════════
       🏷️ دسته‌بندی‌های داینامیک (بر اساس due_date_ts)
       ═══════════════════════════════════════════════════════ */
    getTaskDynamicCategories(task: ExtractedTask): string[] {
        const cats: string[] = [];
        const ts = task.due_date_ts;
        if (!ts) return cats;

        const dyn = this.settings.dynamicCategories;

        /* ─── امروز (اجباری) ─── */
        if (isTodayTs(ts)) cats.push('today');

        if (dyn.tomorrow && isTomorrowTs(ts)) cats.push('tomorrow');
        if (dyn.this_week && isWithinNextWeekTs(ts)) cats.push('this_week');
        if (dyn.this_month && isThisMonthTs(ts)) cats.push('this_month');
        if (dyn.this_year && isThisYearTs(ts)) cats.push('this_year');

        return cats;
    }

    /* ─── نام نمایشی نوت ─── */
    getDisplayNoteName(path: string): string {
        return getDisplayNoteName(path);
    }

    /* ─── فایل‌های قابل اسکن ─── */
    getScannableFiles(): TFile[] {
        return this.scanner.getMarkdownFiles();
    }

    /* ─── دسته‌بندی‌ها ─── */
    getCategories(): CategoryDef[] {
        return this.categories.getAll();
    }

    getCategoryDisplayName(id: string): string {
        return this.categories.getDisplayName(id, this.settings.language);
    }

    /* ═══════════════════════════════════════════════════════
       ✅ انجام / انجام نشده
       ═══════════════════════════════════════════════════════ */
    async toggleComplete(taskId: string): Promise<boolean> {
        const task = this.tasks.get(taskId);
        if (!task) return false;

        const file = this.scanner.getFileByPath(task._source_file);
        if (!file) return false;

        try {
            const content = await this.scanner.readFile(file);
            const newContent = this.extractor.toggleTaskInContent(
                content, task._source_file, taskId
            );
            if (newContent === null) return false;

            await this.app.vault.modify(file, newContent);

            /* ─── آپدیت ایندکس ─── */
            const now = new Date();
            const newCompleted = !task.completed;

            const patch: Partial<TaskIndexEntry> = {
                completed_jalali: newCompleted ? getJalaliDateFull(now) : '',
                completed_gregorian: newCompleted ? getGregorianDateFull(now) : '',
                completed_ts: newCompleted ? now.getTime() : 0,
            };

            /* اگه تسک تازه ساخته شده بود و created_ts نداره */
            if (!task.created_ts) {
                patch.created_jalali = getJalaliDateFull(now);
                patch.created_gregorian = getGregorianDateFull(now);
                patch.created_ts = now.getTime();
            }

            await this.index.updateEntry(taskId, patch);

            /* ─── آپدیت حافظه ─── */
            task.completed = newCompleted;
            task.completed_jalali = patch.completed_jalali || '';
            task.completed_gregorian = patch.completed_gregorian || '';
            task.completed_ts = patch.completed_ts || 0;
            if (patch.created_ts) {
                task.created_jalali = patch.created_jalali || '';
                task.created_gregorian = patch.created_gregorian || '';
                task.created_ts = patch.created_ts;
            }

            this.recomputeStats();
            return true;
        } catch (e) {
            console.warn('[First Task] toggleComplete failed:', e);
            return false;
        }
    }

    /* ═══════════════════════════════════════════════════════
       📌 پین / آنپین
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
       ✏️ ویرایش کامل تسک (توی مودال جزئیات)
       ═══════════════════════════════════════════════════════ */
    async updateTaskFull(
        taskId: string,
        updates: {
            title: string;
            description: string;
            category: string;
            dueDateJalali: string;
            dueDateGregorian: string;
            dueDateTs: number;
        }
    ): Promise<boolean> {
        const task = this.tasks.get(taskId);
        if (!task) return false;

        const file = this.scanner.getFileByPath(task._source_file);
        if (!file) return false;

        try {
            /* ─── اگه عنوان تغییر کرده، توی markdown عوض کن ─── */
            if (updates.title.trim() && updates.title.trim() !== task.title) {
                const content = await this.scanner.readFile(file);
                const lines = content.split('\n');
                const lineIdx = this.extractor.findTaskLine(content, task._source_file, taskId);

                if (lineIdx !== -1) {
                    const oldLine = lines[lineIdx];
                    const match = /^(\s*[-*+]\s+\[([ xX])\]\s+)(.+?)(\s*)$/.exec(oldLine);
                    if (match) {
                        lines[lineIdx] = `${match[1]}${updates.title.trim()}${match[4]}`;
                        await this.app.vault.modify(file, lines.join('\n'));

                        /* ─── تغییر ID چون عنوان عوض شده ─── */
                        const newId = generateTaskId(task._source_file, updates.title.trim());

                        /* ─── منتقل کردن ایندکس به ID جدید ─── */
                        const oldEntry = this.index.getEntry(taskId);
                        await this.index.removeEntry(taskId);
                        await this.index.updateEntry(newId, {
                            ...oldEntry,
                            description: updates.description,
                            category: updates.category,
                            due_date_jalali: updates.dueDateJalali,
                            due_date_gregorian: updates.dueDateGregorian,
                            due_date_ts: updates.dueDateTs,
                        });

                        this.tasks.delete(taskId);
                        await this.rescanFile(file);
                        this.recomputeStats();
                        return true;
                    }
                }
            }

            /* ─── اگه عنوان عوض نشده، فقط ایندکس رو آپدیت کن ─── */
            await this.index.updateEntry(taskId, {
                description: updates.description,
                category: updates.category,
                due_date_jalali: updates.dueDateJalali,
                due_date_gregorian: updates.dueDateGregorian,
                due_date_ts: updates.dueDateTs,
            });

            task.description = updates.description;
            task.category = updates.category;
            task.due_date_jalali = updates.dueDateJalali;
            task.due_date_gregorian = updates.dueDateGregorian;
            task.due_date_ts = updates.dueDateTs;

            this.recomputeStats();
            return true;
        } catch (e) {
            console.warn('[First Task] updateTaskFull failed:', e);
            return false;
        }
    }

    /* ═══════════════════════════════════════════════════════
       ➕ ساخت تسک جدید
       ═══════════════════════════════════════════════════════ */
    async createTask(
        title: string,
        sourceFile: string,
        description: string = '',
        category: string = '',
        dueDateJalali: string = '',
        dueDateGregorian: string = '',
        dueDateTs: number = 0
    ): Promise<boolean> {
        const file = this.scanner.getFileByPath(sourceFile);
        if (!file) return false;

        try {
            const content = await this.scanner.readFile(file);
            const result = this.extractor.addTaskToContent(content, title);
            await this.app.vault.modify(file, result.content);

            const newId = generateTaskId(sourceFile, title);
            const now = new Date();

            await this.index.updateEntry(newId, {
                description,
                category,
                pinned: false,
                due_date_jalali: dueDateJalali,
                due_date_gregorian: dueDateGregorian,
                due_date_ts: dueDateTs,
                created_jalali: getJalaliDateFull(now),
                created_gregorian: getGregorianDateFull(now),
                created_ts: now.getTime(),
            });

            await this.rescanFile(file);
            return true;
        } catch (e) {
            console.warn('[First Task] createTask failed:', e);
            return false;
        }
    }

    /* ═══════════════════════════════════════════════════════
       🗑️ حذف تسک
       ═══════════════════════════════════════════════════════ */
    async deleteTask(taskId: string): Promise<boolean> {
        const task = this.tasks.get(taskId);
        if (!task) return false;

        const file = this.scanner.getFileByPath(task._source_file);
        if (!file) return false;

        try {
            const content = await this.scanner.readFile(file);
            const newContent = this.extractor.removeTaskFromContent(
                content, task._source_file, taskId
            );
            if (newContent === null) return false;

            await this.app.vault.modify(file, newContent);

            await this.index.removeEntry(taskId);
            this.tasks.delete(taskId);

            this.recomputeStats();
            return true;
        } catch (e) {
            console.warn('[First Task] deleteTask failed:', e);
            return false;
        }
    }

    /* ─── اطلاعات کمکی ─── */
    getStats(): CompletedStats { return this.stats; }
    getLastSyncTs(): number { return this.lastSyncTs; }
    getTaskCount(): number { return this.tasks.size; }

    private chunkArray<T>(arr: T[], size: number): T[][] {
        const out: T[][] = [];
        for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
        return out;
    }
}

/* نیاز به import CategoryDef */
import type { CategoryDef } from '../types';
