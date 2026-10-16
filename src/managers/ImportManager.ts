/* ════════════════════════════════════════════════════════════
   📥 ImportManager — پل بین نوت‌ها و Desktop
   ✅ کشف تسک‌های انجام‌نشده در نوت‌ها
   ✅ Import دسته‌ای به Desktop
   ✅ انتقال تسک‌های موجود از TaskManager
   ✅ حذف خط کامل از نوت (بدون جای خالی)
   ════════════════════════════════════════════════════════════ */

import { App, TFile } from 'obsidian';
import type {
    DiscoveredTask,
    ImportOptions,
    ImportResult,
    DesktopTask,
    ExtractedTask,
} from '../types';
import { TaskManager } from './TaskManager';
import { DesktopStore } from './DesktopStore';
import { VaultScanner } from './VaultScanner';
import { TaskExtractor } from './TaskExtractor';
import { generateDesktopTaskId } from '../utils/hash';
import {
    getJalaliDateFull,
    getGregorianDateFull,
} from '../utils/jalaliDate';

export class ImportManager {
    constructor(
        private app: App,
        private taskManager: TaskManager,
        private desktopStore: DesktopStore,
        private scanner: VaultScanner,
        private extractor: TaskExtractor
    ) {}

    /* ═══════════════════════════════════════════════════════
       کشف تسک‌های انجام‌نشده از نوت‌ها
       ═══════════════════════════════════════════════════════ */
    async discoverTasks(): Promise<DiscoveredTask[]> {
        const allPending = this.taskManager.getPendingTasks();
        const discovered: DiscoveredTask[] = [];

        /* ─── چک: آیا تسک مشابه توی Desktop هست؟ ─── */
        const desktopTitles = new Set<string>();
        for (const t of this.desktopStore.getAll()) {
            desktopTitles.add(t.title);
        }

        for (const task of allPending) {
            discovered.push({
                task_id: task._id,
                title: task.title,
                completed: task.completed,
                source_file: task._source_file,
                source_line: task._source_line,
                file_display_name: this.getDisplayName(task._source_file),
                already_imported: desktopTitles.has(task.title),
            });
        }

        /* ─── مرتب‌سازی: بر اساس فایل، بعد خط ─── */
        discovered.sort((a, b) => {
            if (a.source_file !== b.source_file) {
                return a.source_file.localeCompare(b.source_file);
            }
            return a.source_line - b.source_line;
        });

        return discovered;
    }

    /* ═══════════════════════════════════════════════════════
       Import تسک‌های کشف‌شده به Desktop
       ═══════════════════════════════════════════════════════ */
    async importTasks(
        tasks: DiscoveredTask[],
        options: ImportOptions
    ): Promise<ImportResult> {
        const result: ImportResult = {
            imported: 0,
            removedFromNotes: 0,
            errors: [],
        };

        if (tasks.length === 0) return result;

        const now = new Date();
        const nowJalali = getJalaliDateFull(now);
        const nowGregorian = getGregorianDateFull(now);
        const nowTs = now.getTime();

        /* ═══════ ۱. اضافه به Desktop ═══════ */
        for (const d of tasks) {
            try {
                /* اگه قبلاً import شده، رد کن */
                if (d.already_imported) continue;

                const desktopTask: DesktopTask = {
                    id: generateDesktopTaskId(),
                    title: d.title,
                    description: '',
                    category: options.assignCategory || '',
                    pinned: false,
                    completed: false,
                    due_date_jalali: '',
                    due_date_gregorian: '',
                    due_date_ts: 0,
                    created_jalali: nowJalali,
                    created_gregorian: nowGregorian,
                    created_ts: nowTs,
                    completed_jalali: '',
                    completed_gregorian: '',
                    completed_ts: 0,
                    modified_ts: nowTs,
                };

                const ok = await this.desktopStore.add(desktopTask);
                if (ok) result.imported++;
            } catch (e) {
                result.errors.push(`Failed to import "${d.title}"`);
            }
        }

        /* ═══════ ۲. حذف از نوت (اگه کاربر خواسته) ═══════ */
        if (options.deleteFromNote) {
            for (const d of tasks) {
                if (d.already_imported) continue;
                try {
                    const ok = await this.taskManager.deleteTask(d.task_id);
                    if (ok) result.removedFromNotes++;
                } catch (e) {
                    result.errors.push(`Failed to delete "${d.title}" from note`);
                }
            }
        }

        return result;
    }

    /* ═══════════════════════════════════════════════════════
       انتقال تسک‌های نوت (از TaskManager) به Desktop
       (استفاده در Bulk move از TaskPanel یا Planner)
       ═══════════════════════════════════════════════════════ */
    async moveTasksFromNotes(
        taskIds: string[],
        options: ImportOptions
    ): Promise<ImportResult> {
        const result: ImportResult = {
            imported: 0,
            removedFromNotes: 0,
            errors: [],
        };

        if (taskIds.length === 0) return result;

        const nowTs = Date.now();

        for (const id of taskIds) {
            const task = this.taskManager.getTaskById(id);
            if (!task) continue;

            try {
                /* ─── کپی به Desktop با حفظ متادیتا ─── */
                const desktopTask: DesktopTask = {
                    id: generateDesktopTaskId(),
                    title: task.title,
                    description: task.description || '',
                    category: options.assignCategory || task.category || '',
                    pinned: task.pinned,
                    completed: task.completed,
                    due_date_jalali: task.due_date_jalali,
                    due_date_gregorian: task.due_date_gregorian,
                    due_date_ts: task.due_date_ts,
                    created_jalali: task.created_jalali,
                    created_gregorian: task.created_gregorian,
                    created_ts: task.created_ts,
                    completed_jalali: task.completed_jalali,
                    completed_gregorian: task.completed_gregorian,
                    completed_ts: task.completed_ts,
                    modified_ts: nowTs,
                };

                const addOk = await this.desktopStore.add(desktopTask);
                if (!addOk) {
                    result.errors.push(`Failed to add "${task.title}" to Desktop`);
                    continue;
                }

                result.imported++;

                /* ─── اگه move، از نوت حذف کن ─── */
                if (options.deleteFromNote) {
                    const delOk = await this.taskManager.deleteTask(id);
                    if (delOk) result.removedFromNotes++;
                }
            } catch (e) {
                result.errors.push(`Error with "${task.title}"`);
            }
        }

        return result;
    }

    /* ═══════════════════════════════════════════════════════
       ابزار کمکی
       ═══════════════════════════════════════════════════════ */
    private getDisplayName(path: string): string {
        const parts = path.split('/');
        return (parts[parts.length - 1] || path).replace(/\.md$/, '');
    }
}
