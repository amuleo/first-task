/* ════════════════════════════════════════════════════════════
   📊 StatsManager — آمار انباشته
   ✅ فایل: FirstTask/stats.json
   ✅ هرگز پاک نمی‌شه (حتی بعد از archive)
   ✅ آمار ماهانه برای نمودار
   ════════════════════════════════════════════════════════════ */

import { App, normalizePath } from 'obsidian';
import type {
    StatsFile,
    MonthlyStats,
    DesktopTask,
} from '../types';
import { DEFAULT_STATS_STORE } from '../types';
import { toJalali, pad } from '../utils/jalaliDate';

const FOLDER_NAME = 'FirstTask';
const STATS_FILE = 'stats.json';

export class StatsManager {
    private app: App;
    private filePath: string;
    private store: StatsFile = { ...DEFAULT_STATS_STORE };

    constructor(app: App) {
        this.app = app;
        this.filePath = normalizePath(`${FOLDER_NAME}/${STATS_FILE}`);
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
                this.store = { ...DEFAULT_STATS_STORE };
                await this.save();
                return;
            }

            await this.load();
        } catch (e) {
            console.warn('[First Task] StatsManager init failed:', e);
            this.store = { ...DEFAULT_STATS_STORE };
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
                    `${FOLDER_NAME}/stats.corrupted-${Date.now()}.json`
                );
                await this.app.vault.adapter.write(backup, content);
                console.warn(
                    `[First Task] Corrupted stats.json backed up to: ${backup}`
                );
                this.store = { ...DEFAULT_STATS_STORE };
                return;
            }

            this.store = {
                version: parsed.version || 1,
                last_updated: parsed.last_updated || 0,
                total_completed: parsed.total_completed || 0,
                total_created: parsed.total_created || 0,
                total_archived: parsed.total_archived || 0,
                monthly: parsed.monthly || {},
                last_archive_ts: parsed.last_archive_ts || 0,
                last_archive_count: parsed.last_archive_count || 0,
            };
        } catch (e) {
            console.warn('[First Task] StatsManager load failed:', e);
            this.store = { ...DEFAULT_STATS_STORE };
        }
    }

    /* ─── Save ─── */
    async save(): Promise<void> {
        try {
            this.store.last_updated = Date.now();
            const content = JSON.stringify(this.store, null, 2);
            await this.app.vault.adapter.write(this.filePath, content);
        } catch (e) {
            console.warn('[First Task] StatsManager save failed:', e);
        }
    }

    /* ═══════════════════════════════════════════════════════
       ثبت رخدادها
       ═══════════════════════════════════════════════════════ */

    /* ─── ثبت ساخت تسک ─── */
    async recordCreation(task: DesktopTask): Promise<void> {
        try {
            this.store.total_created += 1;

            const monthKey = this.getMonthKey(task.created_ts || Date.now());
            if (!this.store.monthly[monthKey]) {
                this.store.monthly[monthKey] = { completed: 0, created: 0 };
            }
            this.store.monthly[monthKey].created += 1;

            await this.save();
        } catch (e) {
            console.warn('[First Task] StatsManager recordCreation failed:', e);
        }
    }

    /* ─── ثبت انجام شدن تسک ─── */
    async recordCompletion(task: DesktopTask): Promise<void> {
        try {
            this.store.total_completed += 1;

            const monthKey = this.getMonthKey(task.completed_ts || Date.now());
            if (!this.store.monthly[monthKey]) {
                this.store.monthly[monthKey] = { completed: 0, created: 0 };
            }
            this.store.monthly[monthKey].completed += 1;

            await this.save();
        } catch (e) {
            console.warn('[First Task] StatsManager recordCompletion failed:', e);
        }
    }

    /* ─── ثبت برگرداندن تسک (undo completed) ─── */
    async recordUncompletion(task: DesktopTask): Promise<void> {
        try {
            this.store.total_completed = Math.max(0, this.store.total_completed - 1);

            const monthKey = this.getMonthKey(task.completed_ts || Date.now());
            if (this.store.monthly[monthKey]) {
                this.store.monthly[monthKey].completed = Math.max(
                    0,
                    this.store.monthly[monthKey].completed - 1
                );
            }

            await this.save();
        } catch (e) {
            console.warn('[First Task] StatsManager recordUncompletion failed:', e);
        }
    }

    /* ─── ثبت آرشیو ─── */
    async recordArchive(count: number): Promise<void> {
        try {
            this.store.total_archived += count;
            this.store.last_archive_ts = Date.now();
            this.store.last_archive_count = count;
            await this.save();
        } catch (e) {
            console.warn('[First Task] StatsManager recordArchive failed:', e);
        }
    }

    /* ─── ثبت حذف تسک (کاهش شمارنده) ─── */
    async recordDeletion(task: DesktopTask): Promise<void> {
        try {
            this.store.total_created = Math.max(0, this.store.total_created - 1);

            const monthKey = this.getMonthKey(task.created_ts || Date.now());
            if (this.store.monthly[monthKey]) {
                this.store.monthly[monthKey].created = Math.max(
                    0,
                    this.store.monthly[monthKey].created - 1
                );
            }

            if (task.completed) {
                this.store.total_completed = Math.max(
                    0,
                    this.store.total_completed - 1
                );
                const compMonthKey = this.getMonthKey(task.completed_ts || Date.now());
                if (this.store.monthly[compMonthKey]) {
                    this.store.monthly[compMonthKey].completed = Math.max(
                        0,
                        this.store.monthly[compMonthKey].completed - 1
                    );
                }
            }

            await this.save();
        } catch (e) {
            console.warn('[First Task] StatsManager recordDeletion failed:', e);
        }
    }

    /* ═══════════════════════════════════════════════════════
       خواندن آمار
       ═══════════════════════════════════════════════════════ */
    getStore(): StatsFile {
        return this.store;
    }

    getTotalCompleted(): number {
        return this.store.total_completed;
    }

    getTotalCreated(): number {
        return this.store.total_created;
    }

    getTotalArchived(): number {
        return this.store.total_archived;
    }

    getMonthly(): Record<string, MonthlyStats> {
        return this.store.monthly;
    }

    getMonthlyForCurrentMonth(): MonthlyStats {
        const key = this.getMonthKey(Date.now());
        return this.store.monthly[key] || { completed: 0, created: 0 };
    }

    /* ═══════════════════════════════════════════════════════
       ابزار
       ═══════════════════════════════════════════════════════ */
    private getMonthKey(ts: number): string {
        const d = new Date(ts);
        const [jy, jm] = toJalali(
            d.getFullYear(),
            d.getMonth() + 1,
            d.getDate()
        );
        return `${jy}/${pad(jm)}`;
    }
}
