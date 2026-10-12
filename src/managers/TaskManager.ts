/* ════════════════════════════════════════════════════════════
   📋 مدیریت تسک‌ها — v0.1.2
   ✅ متدهای دسته‌بندی + فیلتر زمانی برای Planner
   ✅ فیلتر بر اساس دسته برای پنل اصلی
   ✅ رفع باگ پین (بروزرسانی سریع)
   ════════════════════════════════════════════════════════════ */

import { App, TFile } from 'obsidian';
import type {
    ExtractedTask,
    FirstTaskSettings,
    CompletedStats,
    CategoryStats,
    TaskIndexEntry,
    CategoryDef,
    PlannerCard,
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
       راه‌اندازی
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
       اسکن
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

        for (const task of newTasks.values()) {
            const entry = this.index.getEntry(task._id);
            this.applyEntry(task, entry);

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

    removeTasksForFile(path: string): void {
        for (const [id, task] of this.tasks.entries()) {
            if (task._source_file === path) {
                this.tasks.delete(id);
            }
        }
        this.index.removeFileCache(path);
    }

    getTasksForFile(path: string): ExtractedTask[] {
        const result: ExtractedTask[] = [];
        for (const task of this.tasks.values()) {
            if (task._source_file === path) result.push(task);
        }
        return result;
    }

    /* ═══════════════════════════════════════════════════════
       آمار
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
       گرفتن تسک‌ها
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
       فیلتر بر اساس دسته (برای پنل اصلی)
       ═══════════════════════════════════════════════════════ */
    getPendingByCategory(categoryId: string): ExtractedTask[] {
        const pending = this.getPendingTasks();

        if (!categoryId) return pending;

        if (categoryId === 'none') {
            return pending.filter(t => !t.category);
        }

        return pending.filter(t => t.category === categoryId);
    }

    getCompletedByCategory(categoryId: string): ExtractedTask[] {
        const completed = this.getCompletedTasks();

        if (!categoryId) return completed;

        if (categoryId === 'none') {
            return completed.filter(t => !t.category);
        }

        return completed.filter(t => t.category === categoryId);
    }

    /* ═══════════════════════════════════════════════════════
       دسته‌بندی داینامیک
       ═══════════════════════════════════════════════════════ */
    getTaskDynamicCategories(task: ExtractedTask): string[] {
        const cats: string[] = [];
        const ts = task.due_date_ts;
        if (!ts) return cats;

        const dyn = this.settings.dynamicCategories;

        if (isTodayTs(ts)) cats.push('today');
        if (dyn.tomorrow && isTomorrowTs(ts)) cats.push('tomorrow');
        if (dyn.this_week && isWithinNextWeekTs(ts)) cats.push('this_week');
        if (dyn.this_month && isThisMonthTs(ts)) cats.push('this_month');
        if (dyn.this_year && isThisYearTs(ts)) cats.push('this_year');

        return cats;
    }

    /* ═══════════════════════════════════════════════════════
       Planner: فیلتر زمانی
       ═══════════════════════════════════════════════════════ */
    filterByCard(tasks: ExtractedTask[], card: PlannerCard): ExtractedTask[] {
        const now = Date.now();
        const today = startOfDay(now);

        switch (card) {
            case 'past':
                return tasks
                    .filter(t => t.due_date_ts > 0 && t.due_date_ts < today)
                    .sort((a, b) => a.due_date_ts - b.due_date_ts);

            case 'today':
                return tasks.filter(t => isTodayTs(t.due_date_ts)).sort(this.sortTasks);

            case 'tomorrow':
                return tasks.filter(t => isTomorrowTs(t.due_date_ts)).sort(this.sortTasks);

            case 'this_week':
                return tasks.filter(t => isWithinNextWeekTs(t.due_date_ts)).sort(this.sortTasks);

            case 'this_month':
                return tasks.filter(t => isThisMonthTs(t.due_date_ts)).sort(this.sortTasks);

            case 'this_year':
                return tasks.filter(t => isThisYearTs(t.due_date_ts)).sort(this.sortTasks);

            case 'no_date':
                return tasks.filter(t => !t.due_date_ts).sort(this.sortTasks);

            case 'all':
            default:
                return [...tasks].sort((a, b) => {
                    if (a.due_date_ts && !b.due_date_ts) return -1;
                    if (!a.due_date_ts && b.due_date_ts) return 1;
                    if (a.due_date_ts && b.due_date_ts) {
                        return a.due_date_ts - b.due_date_ts;
                    }
                    return this.sortTasks(a, b);
                });
        }
    }

    getTasksByCategory(categoryId: string): ExtractedTask[] {
        return this.getPendingByCategory(categoryId);
    }

    getCategoryStats(categoryId: string): CategoryStats {
        const tasks = this.getTasksByCategory(categoryId);
        return {
            past: this.filterByCard(tasks, 'past').length,
            today: this.filterByCard(tasks, 'today').length,
            tomorrow: this.filterByCard(tasks, 'tomorrow').length,
            this_week: this.filterByCard(tasks, 'this_week').length,
            this_month: this.filterByCard(tasks, 'this_month').length,
            this_year: this.filterByCard(tasks, 'this_year').length,
            no_date: this.filterByCard(tasks, 'no_date').length,
            all: tasks.length,
        };
    }

    /* ═══════════════════════════════════════════════════════
       دسته‌بندی‌ها
       ═══════════════════════════════════════════════════════ */
    getCategories(): CategoryDef[] {
        return this.categories.getAll();
    }

    getCategoryDisplayName(id: string): string {
        return this.categories.getDisplayName(id, this.settings.language);
    }

    /* ═══════════════════════════════════════════════════════
       تغییرات تسک
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

            const now = new Date();
            const newCompleted = !task.completed;

            const patch: Partial<TaskIndexEntry> = {
                completed_jalali: newCompleted ? getJalaliDateFull(now) : '',
                completed_gregorian: newCompleted ? getGregorianDateFull(now) : '',
                completed_ts: newCompleted ? now.getTime() : 0,
            };

            if (!task.created_ts) {
                patch.created_jalali = getJalaliDateFull(now);
                patch.created_gregorian = getGregorianDateFull(now);
                patch.created_ts = now.getTime();
            }

            await this.index.updateEntry(taskId, patch);

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

    async togglePin(taskId: string): Promise<{ ok: boolean; pinned: boolean }> {
        const task = this.tasks.get(taskId);
        if (!task) return { ok: false, pinned: false };

        const newPinned = !task.pinned;
        await this.index.updateEntry(taskId, { pinned: newPinned });
        task.pinned = newPinned;
        return { ok: true, pinned: newPinned };
    }

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

                        const newId = generateTaskId(task._source_file, updates.title.trim());
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

    /* ═══════════════════════════════════════════════════════
       اطلاعات کمکی
       ═══════════════════════════════════════════════════════ */
    getStats(): CompletedStats { return this.stats; }
    getLastSyncTs(): number { return this.lastSyncTs; }
    getTaskCount(): number { return this.tasks.size; }
    getDisplayNoteName(path: string): string { return getDisplayNoteName(path); }
    getScannableFiles(): TFile[] { return this.scanner.getMarkdownFiles(); }

    private chunkArray<T>(arr: T[], size: number): T[][] {
        const out: T[][] = [];
        for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
        return out;
    }
}
