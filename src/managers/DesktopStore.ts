/* ════════════════════════════════════════════════════════════
   🖥️ DesktopStore — مدیریت تسک‌های Desktop
   ✅ ذخیره در FirstTask/desktop.json
   ✅ Backup خودکار در صورت خرابی
   ✅ CRUD کامل + Bulk operations
   ✅ آمار Desktop
   ════════════════════════════════════════════════════════════ */

import { App, normalizePath } from 'obsidian';
import type {
    DesktopTask,
    DesktopStoreFile,
    DesktopStats,
} from '../types';
import { DEFAULT_DESKTOP_STORE } from '../types';
import { generateDesktopTaskId } from '../utils/hash';
import {
    getJalaliDateFull,
    getGregorianDateFull,
    startOfDay,
    startOfDaysAgo,
    startOfJalaliMonth,
    startOfJalaliYear,
    startOfGregorianMonth,
    startOfGregorianYear,
} from '../utils/jalaliDate';

const FOLDER_NAME = 'FirstTask';
const DESKTOP_FILE = 'desktop.json';

/* ═══════════════════════════════════════════════════════════
   DesktopStore
   ═══════════════════════════════════════════════════════════ */
export class DesktopStore {
    private app: App;
    private filePath: string;
    private store: DesktopStoreFile = { ...DEFAULT_DESKTOP_STORE };

    /* برای استفاده در آمار */
    private useJalali: () => boolean;

    constructor(app: App, useJalali: () => boolean) {
        this.app = app;
        this.useJalali = useJalali;
        this.filePath = normalizePath(`${FOLDER_NAME}/${DESKTOP_FILE}`);
    }

    /* ═══════════════════════════════════════════════════════
       راه‌اندازی
       ═══════════════════════════════════════════════════════ */
    async initialize(): Promise<void> {
        try {
            const adapter = this.app.vault.adapter;
            const folderPath = normalizePath(FOLDER_NAME);

            if (!(await adapter.exists(folderPath))) {
                await this.app.vault.createFolder(folderPath);
            }

            if (!(await adapter.exists(this.filePath))) {
                this.store = { ...DEFAULT_DESKTOP_STORE };
                await this.save();
                return;
            }

            await this.load();
        } catch (e) {
            console.warn('[First Task] DesktopStore initialize failed:', e);
            this.store = { ...DEFAULT_DESKTOP_STORE };
        }
    }

    /* ─── لود ─── */
    private async load(): Promise<void> {
        try {
            const content = await this.app.vault.adapter.read(this.filePath);

            /* 🆕 اگه JSON خراب بود، backup بگیر */
            let parsed: any;
            try {
                parsed = JSON.parse(content);
            } catch {
                const backup = normalizePath(
                    `${FOLDER_NAME}/desktop.corrupted-${Date.now()}.json`
                );
                await this.app.vault.adapter.write(backup, content);
                console.warn(
                    `[First Task] Corrupted desktop.json backed up to: ${backup}`
                );
                this.store = { ...DEFAULT_DESKTOP_STORE };
                return;
            }

            this.store = {
                version: parsed.version || 1,
                last_updated: parsed.last_updated || 0,
                tasks: parsed.tasks || {},
            };
        } catch (e) {
            console.warn('[First Task] DesktopStore load failed:', e);
            this.store = { ...DEFAULT_DESKTOP_STORE };
        }
    }

    /* ─── ذخیره ─── */
    async save(): Promise<void> {
        try {
            this.store.last_updated = Date.now();
            const content = JSON.stringify(this.store, null, 2);
            await this.app.vault.adapter.write(this.filePath, content);
        } catch (e) {
            console.warn('[First Task] DesktopStore save failed:', e);
        }
    }

    /* ═══════════════════════════════════════════════════════
       خواندن
       ═══════════════════════════════════════════════════════ */
    getAll(): DesktopTask[] {
        return Object.values(this.store.tasks);
    }

    getById(id: string): DesktopTask | null {
        return this.store.tasks[id] || null;
    }

    getPending(): DesktopTask[] {
        return this.getAll()
            .filter(t => !t.completed)
            .sort(this.sortTasks);
    }

    getCompleted(): DesktopTask[] {
        return this.getAll()
            .filter(t => t.completed)
            .sort((a, b) => {
                const ta = a.completed_ts || a.created_ts || 0;
                const tb = b.completed_ts || b.created_ts || 0;
                return tb - ta;
            });
    }

    getByCategory(categoryId: string): DesktopTask[] {
        const all = this.getPending();
        if (!categoryId) return all;
        if (categoryId === 'none') return all.filter(t => !t.category);
        return all.filter(t => t.category === categoryId);
    }

    getCompletedByCategory(categoryId: string): DesktopTask[] {
        const all = this.getCompleted();
        if (!categoryId) return all;
        if (categoryId === 'none') return all.filter(t => !t.category);
        return all.filter(t => t.category === categoryId);
    }

    hasTasksWithoutCategory(): boolean {
        return this.getPending().some(t => !t.category);
    }

    getCount(): number {
        return Object.keys(this.store.tasks).length;
    }

    /* ═══════════════════════════════════════════════════════
       CRUD
       ═══════════════════════════════════════════════════════ */
    async add(task: DesktopTask): Promise<boolean> {
        try {
            this.store.tasks[task.id] = task;
            await this.save();
            return true;
        } catch (e) {
            console.warn('[First Task] DesktopStore add failed:', e);
            return false;
        }
    }

    /* 🆕 ساخت سریع تسک از روی داده‌های ورودی */
    async createTask(data: {
        title: string;
        description?: string;
        category?: string;
        dueDateJalali?: string;
        dueDateGregorian?: string;
        dueDateTs?: number;
    }): Promise<DesktopTask | null> {
        try {
            const now = new Date();
            const task: DesktopTask = {
                id: generateDesktopTaskId(),
                title: data.title.trim(),
                description: data.description?.trim() || '',
                category: data.category || '',
                pinned: false,
                completed: false,
                due_date_jalali: data.dueDateJalali || '',
                due_date_gregorian: data.dueDateGregorian || '',
                due_date_ts: data.dueDateTs || 0,
                created_jalali: getJalaliDateFull(now),
                created_gregorian: getGregorianDateFull(now),
                created_ts: now.getTime(),
                completed_jalali: '',
                completed_gregorian: '',
                completed_ts: 0,
                modified_ts: now.getTime(),
            };

            this.store.tasks[task.id] = task;
            await this.save();
            return task;
        } catch (e) {
            console.warn('[First Task] DesktopStore createTask failed:', e);
            return null;
        }
    }

    async update(id: string, patch: Partial<DesktopTask>): Promise<boolean> {
        const existing = this.store.tasks[id];
        if (!existing) return false;

        try {
            this.store.tasks[id] = {
                ...existing,
                ...patch,
                modified_ts: Date.now(),
            };
            await this.save();
            return true;
        } catch (e) {
            console.warn('[First Task] DesktopStore update failed:', e);
            return false;
        }
    }

    async remove(id: string): Promise<boolean> {
        if (!this.store.tasks[id]) return false;

        try {
            delete this.store.tasks[id];
            await this.save();
            return true;
        } catch (e) {
            console.warn('[First Task] DesktopStore remove failed:', e);
            return false;
        }
    }

    /* ═══════════════════════════════════════════════════════
       Toggle Operations
       ═══════════════════════════════════════════════════════ */
    async toggleComplete(id: string): Promise<{ ok: boolean; completed: boolean }> {
        const task = this.store.tasks[id];
        if (!task) return { ok: false, completed: false };

        const now = new Date();
        const newCompleted = !task.completed;

        const patch: Partial<DesktopTask> = {
            completed: newCompleted,
            modified_ts: now.getTime(),
        };

        if (newCompleted) {
            patch.completed_jalali = getJalaliDateFull(now);
            patch.completed_gregorian = getGregorianDateFull(now);
            patch.completed_ts = now.getTime();
        } else {
            patch.completed_jalali = '';
            patch.completed_gregorian = '';
            patch.completed_ts = 0;
        }

        const ok = await this.update(id, patch);
        return { ok, completed: newCompleted };
    }

    async togglePin(id: string): Promise<{ ok: boolean; pinned: boolean }> {
        const task = this.store.tasks[id];
        if (!task) return { ok: false, pinned: false };

        const newPinned = !task.pinned;
        const ok = await this.update(id, { pinned: newPinned });
        return { ok, pinned: newPinned };
    }

    /* ═══════════════════════════════════════════════════════
       Bulk Operations
       ═══════════════════════════════════════════════════════ */
    async bulkDelete(ids: string[]): Promise<boolean> {
        if (ids.length === 0) return false;

        try {
            for (const id of ids) {
                delete this.store.tasks[id];
            }
            await this.save();
            return true;
        } catch (e) {
            console.warn('[First Task] DesktopStore bulkDelete failed:', e);
            return false;
        }
    }

    async bulkComplete(ids: string[], completed: boolean): Promise<boolean> {
        if (ids.length === 0) return false;

        try {
            const now = new Date();
            const nowJalali = getJalaliDateFull(now);
            const nowGregorian = getGregorianDateFull(now);
            const nowTs = now.getTime();

            for (const id of ids) {
                const task = this.store.tasks[id];
                if (!task) continue;
                if (task.completed === completed) continue;

                task.completed = completed;
                if (completed) {
                    task.completed_jalali = nowJalali;
                    task.completed_gregorian = nowGregorian;
                    task.completed_ts = nowTs;
                } else {
                    task.completed_jalali = '';
                    task.completed_gregorian = '';
                    task.completed_ts = 0;
                }
                task.modified_ts = nowTs;
            }

            await this.save();
            return true;
        } catch (e) {
            console.warn('[First Task] DesktopStore bulkComplete failed:', e);
            return false;
        }
    }

    async bulkUpdate(
        ids: string[],
        patch: {
            category?: string;
            pinned?: boolean;
            due_date_jalali?: string;
            due_date_gregorian?: string;
            due_date_ts?: number;
        }
    ): Promise<boolean> {
        if (ids.length === 0) return false;

        try {
            const now = Date.now();
            for (const id of ids) {
                const task = this.store.tasks[id];
                if (!task) continue;

                if (patch.category !== undefined) task.category = patch.category;
                if (patch.pinned !== undefined) task.pinned = patch.pinned;
                if (patch.due_date_jalali !== undefined) task.due_date_jalali = patch.due_date_jalali;
                if (patch.due_date_gregorian !== undefined) task.due_date_gregorian = patch.due_date_gregorian;
                if (patch.due_date_ts !== undefined) task.due_date_ts = patch.due_date_ts;

                task.modified_ts = now;
            }

            await this.save();
            return true;
        } catch (e) {
            console.warn('[First Task] DesktopStore bulkUpdate failed:', e);
            return false;
        }
    }

    /* ═══════════════════════════════════════════════════════
       📊 آمار
       ═══════════════════════════════════════════════════════ */
    getStats(): DesktopStats {
        const now = Date.now();
        const useJalali = this.useJalali();

        const todayStart = startOfDay(now);
        const weekStart = startOfDaysAgo(now, 6);

        const monthStart = useJalali
            ? startOfJalaliMonth(now)
            : startOfGregorianMonth(now);

        const yearStart = useJalali
            ? startOfJalaliYear(now)
            : startOfGregorianYear(now);

        const completed = this.getAll().filter(t => t.completed);

        const effectiveTime = (t: DesktopTask): number => {
            if (t.completed_ts > 0) return t.completed_ts;
            if (t.created_ts > 0) return t.created_ts;
            return 0;
        };

        return {
            today: completed.filter(t => {
                const et = effectiveTime(t);
                return et > 0 && et >= todayStart;
            }).length,
            this_week: completed.filter(t => {
                const et = effectiveTime(t);
                return et > 0 && et >= weekStart;
            }).length,
            this_month: completed.filter(t => {
                const et = effectiveTime(t);
                return et > 0 && et >= monthStart;
            }).length,
            this_year: completed.filter(t => {
                const et = effectiveTime(t);
                return et > 0 && et >= yearStart;
            }).length,
            total: completed.length,
        };
    }

    /* ═══════════════════════════════════════════════════════
       اطلاعات کمکی
       ═══════════════════════════════════════════════════════ */
    getLastUpdated(): number {
        return this.store.last_updated;
    }

    /* ═══════════════════════════════════════════════════════
       Sort
       ═══════════════════════════════════════════════════════ */
    private sortTasks = (a: DesktopTask, b: DesktopTask): number => {
        /* pinned اول */
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;

        /* بعد بر اساس تاریخ انجام (اگه داره) */
        if (a.due_date_ts && !b.due_date_ts) return -1;
        if (!a.due_date_ts && b.due_date_ts) return 1;
        if (a.due_date_ts && b.due_date_ts) {
            return a.due_date_ts - b.due_date_ts;
        }

        /* در نهایت بر اساس عنوان */
        return a.title.localeCompare(b.title, 'fa');
    };
}
