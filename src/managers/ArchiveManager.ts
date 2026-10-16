/* ════════════════════════════════════════════════════════════
   🗄️ ArchiveManager — آرشیو تسک‌ها
   ✅ فایل مرده: FirstTask/dead.json (هیچی ازش خونده نمی‌شه)
   ✅ Auto-archive با تعداد + بازه
   ✅ ثبت در StatsManager
   ✅ بازیابی از آرشیو (اختیاری — برای دسترسی مستقیم)
   ════════════════════════════════════════════════════════════ */

import { App, normalizePath } from 'obsidian';
import type {
    DeadTask,
    DeadStoreFile,
    DesktopTask,
    DesktopSettings,
} from '../types';
import { DEFAULT_DEAD_STORE } from '../types';
import { DesktopStore } from './DesktopStore';
import { StatsManager } from './StatsManager';

const FOLDER_NAME = 'FirstTask';
const DEAD_FILE = 'dead.json';

export interface AutoArchiveResult {
    archived: number;
    reason: 'threshold_not_reached' | 'threshold_reached' | 'always' | 'disabled' | 'no_candidates';
}

export class ArchiveManager {
    private app: App;
    private filePath: string;
    private store: DeadStoreFile = { ...DEFAULT_DEAD_STORE };
    private desktopStore: DesktopStore;
    private statsManager: StatsManager;

    constructor(
        app: App,
        desktopStore: DesktopStore,
        statsManager: StatsManager
    ) {
        this.app = app;
        this.desktopStore = desktopStore;
        this.statsManager = statsManager;
        this.filePath = normalizePath(`${FOLDER_NAME}/${DEAD_FILE}`);
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
                this.store = { ...DEFAULT_DEAD_STORE };
                await this.save();
                return;
            }

            await this.load();
        } catch (e) {
            console.warn('[First Task] ArchiveManager init failed:', e);
            this.store = { ...DEFAULT_DEAD_STORE };
        }
    }

    /* ─── Load ─── */
    private async load(): Promise<void> {
        try {
            const content = await this.app.vault.adapter.read(this.filePath);

            let parsed: any;
            try {
                parsed = JSON.parse(content);
            } catch {
                const backup = normalizePath(
                    `${FOLDER_NAME}/dead.corrupted-${Date.now()}.json`
                );
                await this.app.vault.adapter.write(backup, content);
                console.warn(
                    `[First Task] Corrupted dead.json backed up to: ${backup}`
                );
                this.store = { ...DEFAULT_DEAD_STORE };
                return;
            }

            this.store = {
                version: parsed.version || 1,
                last_updated: parsed.last_updated || 0,
                tasks: parsed.tasks || [],
            };
        } catch (e) {
            console.warn('[First Task] ArchiveManager load failed:', e);
            this.store = { ...DEFAULT_DEAD_STORE };
        }
    }

    /* ─── Save ─── */
    async save(): Promise<void> {
        try {
            this.store.last_updated = Date.now();
            const content = JSON.stringify(this.store, null, 2);
            await this.app.vault.adapter.write(this.filePath, content);
        } catch (e) {
            console.warn('[First Task] ArchiveManager save failed:', e);
        }
    }

    /* ═══════════════════════════════════════════════════════
       آرشیو دستی
       ═══════════════════════════════════════════════════════ */
    async archiveTask(task: DesktopTask, reason: 'auto' | 'manual' = 'manual'): Promise<boolean> {
        try {
            const deadTask: DeadTask = {
                ...task,
                archived_at: Date.now(),
                archive_reason: reason,
            };

            this.store.tasks.push(deadTask);
            await this.save();

            await this.desktopStore.remove(task.id);

            /* ثبت در آمار */
            if (task.completed) {
                /* هیچ تغییری در total_completed نمی‌دیم */
            }
            await this.statsManager.recordArchive(1);

            return true;
        } catch (e) {
            console.warn('[First Task] ArchiveManager archiveTask failed:', e);
            return false;
        }
    }

    async archiveMany(tasks: DesktopTask[], reason: 'auto' | 'manual' = 'manual'): Promise<number> {
        if (tasks.length === 0) return 0;

        try {
            const now = Date.now();
            for (const task of tasks) {
                const deadTask: DeadTask = {
                    ...task,
                    archived_at: now,
                    archive_reason: reason,
                };
                this.store.tasks.push(deadTask);
            }

            await this.save();

            /* حذف از desktop */
            const ids = tasks.map(t => t.id);
            await this.desktopStore.bulkDelete(ids);

            /* ثبت در آمار */
            await this.statsManager.recordArchive(tasks.length);

            return tasks.length;
        } catch (e) {
            console.warn('[First Task] ArchiveManager archiveMany failed:', e);
            return 0;
        }
    }

    /* ═══════════════════════════════════════════════════════
       🎯 Auto-Archive
       ═══════════════════════════════════════════════════════ */
    async runAutoArchive(settings: DesktopSettings): Promise<AutoArchiveResult> {
        if (!settings.autoArchiveEnabled) {
            return { archived: 0, reason: 'disabled' };
        }

        const days = settings.autoArchiveDays;
        const count = settings.autoArchiveCount;
        const mode = settings.autoArchiveMode;

        const cutoffTs = Date.now() - days * 24 * 60 * 60 * 1000;

        /* ─── کاندیدها: تسک‌های completed که قدیمی‌تر از cutoff هستن ─── */
        const candidates = this.desktopStore
            .getCompleted()
            .filter(t => {
                const ts = t.completed_ts || t.created_ts;
                return ts > 0 && ts <= cutoffTs;
            })
            /* ─── قدیمی‌ترین اول ─── */
            .sort((a, b) => {
                const ta = a.completed_ts || a.created_ts || 0;
                const tb = b.completed_ts || b.created_ts || 0;
                return ta - tb;
            });

        if (candidates.length === 0) {
            return { archived: 0, reason: 'no_candidates' };
        }

        /* ─── تعیین تعداد حذف ─── */
        let toArchive: DesktopTask[];
        let reason: AutoArchiveResult['reason'];

        if (mode === 'always') {
            toArchive = candidates;
            reason = 'always';
        } else {
            /* threshold */
            if (candidates.length >= count) {
                toArchive = candidates.slice(0, count);
                reason = 'threshold_reached';
            } else {
                return { archived: 0, reason: 'threshold_not_reached' };
            }
        }

        const archived = await this.archiveMany(toArchive, 'auto');
        return { archived, reason };
    }

    /* ═══════════════════════════════════════════════════════
       خواندن
       ═══════════════════════════════════════════════════════ */
    getAllDead(): DeadTask[] {
        return [...this.store.tasks];
    }

    getDeadCount(): number {
        return this.store.tasks.length;
    }

    getLastArchiveTs(): number {
        return this.store.last_updated;
    }

    /* ═══════════════════════════════════════════════════════
       اطلاعات برای نمایش (اختیاری — توی تنظیمات)
       ═══════════════════════════════════════════════════════ */
    getRecentDead(limit: number = 20): DeadTask[] {
        return [...this.store.tasks]
            .sort((a, b) => b.archived_at - a.archived_at)
            .slice(0, limit);
    }

    /* ═══════════════════════════════════════════════════════
       🆕 پاک‌سازی کامل dead.json (توسط کاربر)
       ═══════════════════════════════════════════════════════ */
    async clearDead(): Promise<boolean> {
        try {
            this.store.tasks = [];
            await this.save();
            return true;
        } catch (e) {
            console.warn('[First Task] ArchiveManager clearDead failed:', e);
            return false;
        }
    }
}
