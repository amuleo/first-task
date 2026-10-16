/* ════════════════════════════════════════════════════════════
   📋 مدیریت تسک‌ها — v0.3.0
   ✅ File cache skip (سرعت بالا)
   ✅ Debounced save
   ✅ رفع باگ آمار
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
    BulkUpdates,
} from '../types';
import { VaultScanner } from './VaultScanner';
import { TaskExtractor } from './TaskExtractor';
import { IndexManager } from './IndexManager';
import { CategoriesManager } from './CategoriesManager';
import { hashContent, generateTaskId } from '../utils/hash';
import { getDisplayNoteName } from '../utils/noteUtils';
import {
    isPastTs, isTodayTs, isTomorrowTs, isThisWeekTs, isThisMonthTs, isThisYearTs,
    isNextWeekTs, isNextMonthTs, isNextYearTs,
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
    private ready = false;

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

    isReady(): boolean {
        return this.ready;
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
       🆕 اسکن کامل — با file cache skip
       ═══════════════════════════════════════════════════════ */
    async rescanAll(): Promise<void> {
        const files = this.scanner.getMarkdownFiles();
        const newTasks = new Map<string, ExtractedTask>();

        /* ─── فایل‌هایی که تغییر نکردن رو skip کن ─── */
        const filesToScan: TFile[] = [];
        const skippedFiles: TFile[] = [];

        for (const file of files) {
            const stat = this.scanner.getFileStat(file);
            const cached = this.index.getFileCache(file.path);

            if (cached &&
                cached.mtime === stat.mtime &&
                cached.size === stat.size) {
                skippedFiles.push(file);
                continue;
            }

            filesToScan.push(file);
        }

        /* ─── فقط فایل‌های تغییرکرده رو اسکن کن ─── */
        const chunks = this.chunkArray(filesToScan, 15);
        for (const chunk of chunks) {
            const results = await Promise.all(
                chunk.map(f => this.scanSingleFile(f))
            );
            for (const tasks of results) {
                for (const task of tasks) newTasks.set(task._id, task);
            }
        }

        /* ─── فایل‌های skip‌شده → از tasks قبلی بردار ─── */
        const skippedPaths = new Set(skippedFiles.map(f => f.path));
        for (const [id, task] of this.tasks.entries()) {
            if (skippedPaths.has(task._source_file)) {
                newTasks.set(id, task);
            }
        }

        /* ─── بازیابی متادیتا ─── */
        await this.recoverOrphanMetadata(newTasks);

        /* ─── اعمال entryها ─── */
        for (const task of newTasks.values()) {
            /* اگه تسک از skip اومده، نیازی به applyEntry نیست */
            if (task.description || task.category || task.due_date_ts ||
                task.created_ts || task.completed_ts) {
                continue;
            }

            const entry = this.index.getEntry(task._id);
            this.applyEntry(task, entry);

            if (entry._title !== task.title ||
                entry._source_file !== task._source_file) {
                await this.index.updateEntry(task._id, {
                    _title: task.title,
                    _source_file: task._source_file,
                });
            }

            if (!entry.created_ts && this.settings.autoFillCreatedTime) {
                await this.setCreatedTime(task._id);
                const refreshed = this.index.getEntry(task._id);
                this.applyEntry(task, refreshed);
            }

            await this.ensureCompletedTime(task);
        }

        this.tasks = newTasks;
        this.lastSyncTs = Date.now();
        this.ready = true;

        /* 🆕 فایل‌های تازه اسکن‌شده رو توی cache ذخیره کن */
        for (const file of filesToScan) {
            const stat = this.scanner.getFileStat(file);
            const content = await this.scanner.readFile(file);
            if (content) {
                this.index.updateFileCache(file.path, {
                    mtime: stat.mtime,
                    size: stat.size,
                    hash: hashContent(content),
                });
            }
        }

        await this.index.cleanupOrphans(new Set(this.tasks.keys()));
        this.recomputeStats();
    }

    /* ═══════════════════════════════════════════════════════
       بازیابی خودکار متادیتا
       ═══════════════════════════════════════════════════════ */
    private async recoverOrphanMetadata(
        newTasks: Map<string, ExtractedTask>
    ): Promise<void> {
        const currentIds = new Set(newTasks.keys());
        const allEntries = this.index.exportAllEntries();

        const orphansByFile = new Map<string, Array<[string, TaskIndexEntry]>>();
        for (const [id, entry] of allEntries) {
            if (currentIds.has(id)) continue;
            if (!entry._source_file) continue;
            if (!orphansByFile.has(entry._source_file)) {
                orphansByFile.set(entry._source_file, []);
            }
            orphansByFile.get(entry._source_file)!.push([id, entry]);
        }

        let recovered = 0;

        for (const [filePath, orphans] of orphansByFile) {
            const tasksWithoutMeta: Array<[string, ExtractedTask]> = [];
            for (const [taskId, task] of newTasks) {
                if (task._source_file !== filePath) continue;
                if (this.index.hasEntry(taskId)) continue;
                tasksWithoutMeta.push([taskId, task]);
            }

            for (const [orphanId, orphanEntry] of orphans) {
                if (!orphanEntry._title) continue;

                const matchIdx = tasksWithoutMeta.findIndex(
                    ([_, task]) => task.title === orphanEntry._title
                );
                if (matchIdx === -1) continue;

                const [taskId] = tasksWithoutMeta.splice(matchIdx, 1)[0];
                await this.index.moveEntry(orphanId, taskId);
                recovered++;
            }
        }

        if (recovered > 0) {
            console.log(
                `[First Task] Recovered metadata for ${recovered} task(s)`
            );
        }
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

    private async ensureCompletedTime(task: ExtractedTask): Promise<void> {
        if (!task.completed) return;
        if (task.completed_ts > 0) return;

        const file = this.scanner.getFileByPath(task._source_file);
        const fallbackTs = file?.stat.mtime || Date.now();

        await this.index.updateEntry(task._id, {
            completed_jalali: getJalaliDateFull(new Date(fallbackTs)),
            completed_gregorian: getGregorianDateFull(new Date(fallbackTs)),
            completed_ts: fallbackTs,
        });

        task.completed_jalali = getJalaliDateFull(new Date(fallbackTs));
        task.completed_gregorian = getGregorianDateFull(new Date(fallbackTs));
        task.completed_ts = fallbackTs;
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

        const currentIds = new Set(tasks.map(t => t._id));
        const orphans: Array<[string, TaskIndexEntry]> = [];
        for (const [id, entry] of this.index.exportAllEntries()) {
            if (currentIds.has(id)) continue;
            if (entry._source_file !== file.path) continue;
            orphans.push([id, entry]);
        }

        const tasksWithoutMeta: Array<[string, ExtractedTask]> = [];
        for (const task of tasks) {
            if (this.index.hasEntry(task._id)) continue;
            tasksWithoutMeta.push([task._id, task]);
        }

        for (const [orphanId, orphanEntry] of orphans) {
            if (!orphanEntry._title) continue;
            const idx = tasksWithoutMeta.findIndex(
                ([_, t]) => t.title === orphanEntry._title
            );
            if (idx === -1) continue;
            const [taskId] = tasksWithoutMeta.splice(idx, 1)[0];
            await this.index.moveEntry(orphanId, taskId);
        }

        for (const task of tasks) {
            const entry = this.index.getEntry(task._id);
            this.applyEntry(task, entry);

            if (entry._title !== task.title ||
                entry._source_file !== task._source_file) {
                await this.index.updateEntry(task._id, {
                    _title: task.title,
                    _source_file: task._source_file,
                });
            }

            if (!entry.created_ts && this.settings.autoFillCreatedTime) {
                await this.setCreatedTime(task._id);
                const refreshed = this.index.getEntry(task._id);
                this.applyEntry(task, refreshed);
            }

            await this.ensureCompletedTime(task);
            this.tasks.set(task._id, task);
        }

        const stat = this.scanner.getFileStat(file);
        this.index.updateFileCache(file.path, {
            mtime: stat.mtime,
            size: stat.size,
            hash: hashContent(content),
        });

        if (this.ready) {
            await this.index.cleanupOrphans(new Set(this.tasks.keys()));
        }

        this.recomputeStats();
    }

    removeTasksForFile(path: string): void {
        for (const [id, task] of this.tasks.entries()) {
            if (task._source_file === path) this.tasks.delete(id);
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

        const completed = Array.from(this.tasks.values()).filter(t => t.completed);

        const effectiveTime = (t: ExtractedTask): number => {
            if (t.completed_ts > 0) return t.completed_ts;
            if (t.created_ts > 0) return t.created_ts;
            return 0;
        };

        this.stats = {
            today: completed.filter(t => {
                const et = effectiveTime(t);
                return et > 0 && et >= todayStart;
            }).length,
            yesterday: completed.filter(t => {
                const et = effectiveTime(t);
                return et > 0 && et >= yesterdayStart && et < todayStart;
            }).length,
            this_week: completed.filter(t => {
                const et = effectiveTime(t);
                return et > 0 && et >= weekStart;
            }).length,
            last_month: completed.filter(t => {
                const et = effectiveTime(t);
                return et > 0 && et >= prevMonthStart;
            }).length,
            this_year: completed.filter(t => {
                const et = effectiveTime(t);
                return et > 0 && et >= yearStart;
            }).length,
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
            .sort((a, b) => {
                const ta = a.completed_ts || a.created_ts || 0;
                const tb = b.completed_ts || b.created_ts || 0;
                return tb - ta;
            });
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
       فیلتر بر اساس دسته
       ═══════════════════════════════════════════════════════ */
    getPendingByCategory(categoryId: string): ExtractedTask[] {
        const pending = this.getPendingTasks();
        if (!categoryId) return pending;
        if (categoryId === 'none') return pending.filter(t => !t.category);
        return pending.filter(t => t.category === categoryId);
    }

    getCompletedByCategory(categoryId: string): ExtractedTask[] {
        const completed = this.getCompletedTasks();
        if (!categoryId) return completed;
        if (categoryId === 'none') return completed.filter(t => !t.category);
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
        const useJalali = this.settings.useJalaliDate;
        const weekStart = this.settings.weekStartDay;

        if (isTodayTs(ts)) cats.push('today');
        if (dyn.tomorrow && isTomorrowTs(ts)) cats.push('tomorrow');
        if (dyn.this_week && isThisWeekTs(ts, weekStart)) cats.push('this_week');
        if (dyn.this_month && isThisMonthTs(ts, useJalali)) cats.push('this_month');
        if (dyn.this_year && isThisYearTs(ts, useJalali)) cats.push('this_year');

        return cats;
    }

    /* ═══════════════════════════════════════════════════════
       Planner
       ═══════════════════════════════════════════════════════ */
    filterByCard(tasks: ExtractedTask[], card: PlannerCard): ExtractedTask[] {
        const useJalali = this.settings.useJalaliDate;
        const weekStart = this.settings.weekStartDay;

        switch (card) {
            case 'past':
                return tasks
                    .filter(t => t.due_date_ts > 0 && isPastTs(t.due_date_ts))
                    .sort((a, b) => a.due_date_ts - b.due_date_ts);

            case 'today':
                return tasks.filter(t => isTodayTs(t.due_date_ts)).sort(this.sortTasks);

            case 'tomorrow':
                return tasks.filter(t => isTomorrowTs(t.due_date_ts)).sort(this.sortTasks);

            case 'this_week':
                return tasks
                    .filter(t => isThisWeekTs(t.due_date_ts, weekStart) && !isPastTs(t.due_date_ts))
                    .sort(this.sortTasks);

            case 'next_week':
                return tasks
                    .filter(t => isNextWeekTs(t.due_date_ts, weekStart))
                    .sort(this.sortTasks);

            case 'this_month':
                return tasks
                    .filter(t => isThisMonthTs(t.due_date_ts, useJalali) && !isPastTs(t.due_date_ts))
                    .sort(this.sortTasks);

            case 'next_month':
                return tasks
                    .filter(t => isNextMonthTs(t.due_date_ts, useJalali))
                    .sort(this.sortTasks);

            case 'this_year':
                return tasks
                    .filter(t => isThisYearTs(t.due_date_ts, useJalali) && !isPastTs(t.due_date_ts))
                    .sort(this.sortTasks);

            case 'next_year':
                return tasks
                    .filter(t => isNextYearTs(t.due_date_ts, useJalali))
                    .sort(this.sortTasks);

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
            next_week: this.filterByCard(tasks, 'next_week').length,
            this_month: this.filterByCard(tasks, 'this_month').length,
            next_month: this.filterByCard(tasks, 'next_month').length,
            this_year: this.filterByCard(tasks, 'this_year').length,
            next_year: this.filterByCard(tasks, 'next_year').length,
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

    hasTasksWithoutCategory(): boolean {
        return this.getPendingTasks().some(t => !t.category);
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

            if (!task.created_ts && this.settings.autoFillCreatedTime) {
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

                        const newContent = lines.join('\n');
                        const newOccurrences = newContent
                            .split('\n')
                            .filter(line => {
                                const m = /^\s*[-*+]\s+\[([ xX])\]\s+(.+?)\s*$/.exec(line);
                                return m && m[2].trim() === updates.title.trim();
                            })
                            .length - 1;

                        const newId = generateTaskId(
                            task._source_file,
                            updates.title.trim(),
                            Math.max(0, newOccurrences)
                        );

                        const oldEntry = this.index.getEntry(taskId);
                        await this.index.removeEntry(taskId);
                        await this.index.updateEntry(newId, {
                            ...oldEntry,
                            _title: updates.title.trim(),
                            _source_file: task._source_file,
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

            const existingOccurrences = content
                .split('\n')
                .filter(line => {
                    const m = /^\s*[-*+]\s+\[([ xX])\]\s+(.+?)\s*$/.exec(line);
                    return m && m[2].trim() === title;
                })
                .length;

            const result = this.extractor.addTaskToContent(content, title);
            await this.app.vault.modify(file, result.content);

            const newId = generateTaskId(sourceFile, title, existingOccurrences);
            const now = new Date();

            await this.index.updateEntry(newId, {
                _title: title,
                _source_file: sourceFile,
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
       حذف گروهی
       ═══════════════════════════════════════════════════════ */
    async bulkDelete(taskIds: string[]): Promise<boolean> {
        if (taskIds.length === 0) return false;

        const byFile = new Map<string, ExtractedTask[]>();
        for (const id of taskIds) {
            const task = this.tasks.get(id);
            if (!task) continue;
            if (!byFile.has(task._source_file)) byFile.set(task._source_file, []);
            byFile.get(task._source_file)!.push(task);
        }

        for (const [filePath, tasks] of byFile) {
            const file = this.scanner.getFileByPath(filePath);
            if (!file) continue;

            let content = await this.scanner.readFile(file);

            const sortedTasks = [...tasks].sort((a, b) => b._source_line - a._source_line);

            for (const task of sortedTasks) {
                const currentLine = this.extractor.findTaskLine(content, filePath, task._id);
                if (currentLine !== -1) {
                    const lines = content.split('\n');
                    lines.splice(currentLine, 1);
                    content = lines.join('\n');
                }

                await this.index.removeEntry(task._id);
                this.tasks.delete(task._id);
            }

            await this.app.vault.modify(file, content);
        }

        this.recomputeStats();
        return true;
    }

    /* ═══════════════════════════════════════════════════════
       انجام / برگرداندن گروهی
       ═══════════════════════════════════════════════════════ */
    async bulkComplete(taskIds: string[], completed: boolean): Promise<boolean> {
        if (taskIds.length === 0) return false;

        const byFile = new Map<string, ExtractedTask[]>();
        for (const id of taskIds) {
            const task = this.tasks.get(id);
            if (!task) continue;
            if (task.completed === completed) continue;
            if (!byFile.has(task._source_file)) byFile.set(task._source_file, []);
            byFile.get(task._source_file)!.push(task);
        }

        if (byFile.size === 0) return true;

        const now = new Date();
        const nowJalali = getJalaliDateFull(now);
        const nowGregorian = getGregorianDateFull(now);
        const nowTs = now.getTime();

        for (const [filePath, tasks] of byFile) {
            const file = this.scanner.getFileByPath(filePath);
            if (!file) continue;

            let content = await this.scanner.readFile(file);

            for (const task of tasks) {
                const newContent = this.extractor.toggleTaskInContent(content, filePath, task._id);
                if (newContent === null) continue;
                content = newContent;

                const patch: Partial<TaskIndexEntry> = {};
                if (completed) {
                    patch.completed_jalali = nowJalali;
                    patch.completed_gregorian = nowGregorian;
                    patch.completed_ts = nowTs;
                } else {
                    patch.completed_jalali = '';
                    patch.completed_gregorian = '';
                    patch.completed_ts = 0;
                }

                if (!task.created_ts && this.settings.autoFillCreatedTime) {
                    patch.created_jalali = nowJalali;
                    patch.created_gregorian = nowGregorian;
                    patch.created_ts = nowTs;
                }

                await this.index.updateEntry(task._id, patch);

                task.completed = completed;
                task.completed_jalali = patch.completed_jalali || '';
                task.completed_gregorian = patch.completed_gregorian || '';
                task.completed_ts = patch.completed_ts || 0;
                if (patch.created_ts) {
                    task.created_jalali = patch.created_jalali || '';
                    task.created_gregorian = patch.created_gregorian || '';
                    task.created_ts = patch.created_ts;
                }
            }

            await this.app.vault.modify(file, content);
        }

        this.recomputeStats();
        return true;
    }

    /* ═══════════════════════════════════════════════════════
       ویرایش گروهی
       ═══════════════════════════════════════════════════════ */
    async bulkUpdate(taskIds: string[], updates: BulkUpdates): Promise<boolean> {
        if (taskIds.length === 0) return false;

        if (updates.applyCompleted) {
            await this.bulkComplete(taskIds, updates.completed);
        }

        if (updates.applyNote && updates.targetFile) {
            return await this.bulkMoveAndUpdate(taskIds, updates);
        }

        for (const id of taskIds) {
            const task = this.tasks.get(id);
            if (!task) continue;

            const patch: Partial<TaskIndexEntry> = {};

            if (updates.applyCategory) patch.category = updates.category;
            if (updates.applyDate) {
                patch.due_date_jalali = updates.dueDateJalali;
                patch.due_date_gregorian = updates.dueDateGregorian;
                patch.due_date_ts = updates.dueDateTs;
            }
            if (updates.applyPin) patch.pinned = updates.pinned;

            if (Object.keys(patch).length > 0) {
                await this.index.updateEntry(id, patch);

                if (patch.category !== undefined) task.category = patch.category;
                if (patch.due_date_jalali !== undefined) task.due_date_jalali = patch.due_date_jalali;
                if (patch.due_date_gregorian !== undefined) task.due_date_gregorian = patch.due_date_gregorian;
                if (patch.due_date_ts !== undefined) task.due_date_ts = patch.due_date_ts;
                if (patch.pinned !== undefined) task.pinned = patch.pinned;
            }
        }

        this.recomputeStats();
        return true;
    }

    private async bulkMoveAndUpdate(taskIds: string[], updates: BulkUpdates): Promise<boolean> {
        const targetFile = this.scanner.getFileByPath(updates.targetFile);
        if (!targetFile) return false;

        const collected: { task: ExtractedTask; entry: TaskIndexEntry }[] = [];
        for (const id of taskIds) {
            const task = this.tasks.get(id);
            if (!task) continue;
            const entry = this.index.getEntry(id);
            collected.push({ task, entry });
        }
        if (collected.length === 0) return false;

        const byFile = new Map<string, { task: ExtractedTask; entry: TaskIndexEntry }[]>();
        for (const item of collected) {
            const path = item.task._source_file;
            if (!byFile.has(path)) byFile.set(path, []);
            byFile.get(path)!.push(item);
        }

        for (const [filePath, items] of byFile) {
            const file = this.scanner.getFileByPath(filePath);
            if (!file) continue;

            let content = await this.scanner.readFile(file);
            const sortedItems = [...items].sort((a, b) => b.task._source_line - a.task._source_line);

            for (const { task } of sortedItems) {
                const line = this.extractor.findTaskLine(content, filePath, task._id);
                if (line !== -1) {
                    const lines = content.split('\n');
                    lines.splice(line, 1);
                    content = lines.join('\n');
                }
                await this.index.removeEntry(task._id);
                this.tasks.delete(task._id);
            }

            await this.app.vault.modify(file, content);
        }

        let targetContent = await this.scanner.readFile(targetFile);

        const existing = this.extractor.extractFromContent(targetContent, targetFile.path);
        const titleCount = new Map<string, number>();
        for (const t of existing) {
            titleCount.set(t.title, (titleCount.get(t.title) || 0) + 1);
        }

        for (const { task, entry } of collected) {
            const occ = titleCount.get(task.title) || 0;
            titleCount.set(task.title, occ + 1);

            const result = this.extractor.addTaskToContent(targetContent, task.title);
            targetContent = result.content;

            const newId = generateTaskId(targetFile.path, task.title, occ);

            const newEntry: TaskIndexEntry = {
                _title: task.title,
                _source_file: targetFile.path,
                description: entry.description,
                category: updates.applyCategory ? updates.category : entry.category,
                pinned: updates.applyPin ? updates.pinned : entry.pinned,
                due_date_jalali: updates.applyDate ? updates.dueDateJalali : entry.due_date_jalali,
                due_date_gregorian: updates.applyDate ? updates.dueDateGregorian : entry.due_date_gregorian,
                due_date_ts: updates.applyDate ? updates.dueDateTs : entry.due_date_ts,
                created_jalali: entry.created_jalali,
                created_gregorian: entry.created_gregorian,
                created_ts: entry.created_ts,
                completed_jalali: entry.completed_jalali,
                completed_gregorian: entry.completed_gregorian,
                completed_ts: entry.completed_ts,
            };

            await this.index.updateEntry(newId, newEntry);
        }

        await this.app.vault.modify(targetFile, targetContent);
        await this.rescanFile(targetFile);

        return true;
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
