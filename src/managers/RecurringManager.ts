/* ════════════════════════════════════════════════════════════
   🔄 RecurringManager — تسک‌های تکرارشونده (v0.3.0)
   ✅ فایل جدا: FirstTask/recurring.json
   ✅ ۳ نوع: روزانه / هفتگی / ماهانه
   ✅ منطق catch-up هوشمند (ساجست برای تاریخ گذشته)
   ✅ جلوگیری از تکرار بر اساس created_ts
   ════════════════════════════════════════════════════════════ */

import { App, normalizePath } from 'obsidian';
import type {
    RecurringTemplate,
    RecurringStoreFile,
    RecurringSuggestion,
    DesktopTask,
} from '../types';
import { DEFAULT_RECURRING_STORE } from '../types';
import { DesktopStore } from './DesktopStore';
import { generateRecurringId } from '../utils/hash';
import {
    startOfDay,
    toJalali,
    toGregorian,
    pad,
} from '../utils/jalaliDate';

const FOLDER_NAME = 'FirstTask';
const RECURRING_FILE = 'recurring.json';

interface DueDateResult {
    jalali: string;
    gregorian: string;
    ts: number;
}

export class RecurringManager {
    private app: App;
    private filePath: string;
    private store: RecurringStoreFile = { ...DEFAULT_RECURRING_STORE };

    constructor(
        private appRef: App,
        private desktopStore: DesktopStore
    ) {
        this.app = appRef;
        this.filePath = normalizePath(`${FOLDER_NAME}/${RECURRING_FILE}`);
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
                this.store = { ...DEFAULT_RECURRING_STORE };
                await this.save();
                return;
            }

            await this.load();
        } catch (e) {
            console.warn('[First Task] RecurringManager init failed:', e);
            this.store = { ...DEFAULT_RECURRING_STORE };
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
                    `${FOLDER_NAME}/recurring.corrupted-${Date.now()}.json`
                );
                await this.app.vault.adapter.write(backup, content);
                console.warn(
                    `[First Task] Corrupted recurring.json backed up to: ${backup}`
                );
                this.store = { ...DEFAULT_RECURRING_STORE };
                return;
            }

            this.store = {
                version: parsed.version || 1,
                last_updated: parsed.last_updated || 0,
                templates: parsed.templates || {},
            };
        } catch (e) {
            console.warn('[First Task] RecurringManager load failed:', e);
            this.store = { ...DEFAULT_RECURRING_STORE };
        }
    }

    /* ─── Save ─── */
    async save(): Promise<void> {
        try {
            this.store.last_updated = Date.now();
            const content = JSON.stringify(this.store, null, 2);
            await this.app.vault.adapter.write(this.filePath, content);
        } catch (e) {
            console.warn('[First Task] RecurringManager save failed:', e);
        }
    }

    /* ═══════════════════════════════════════════════════════
       CRUD
       ═══════════════════════════════════════════════════════ */
    getAll(): RecurringTemplate[] {
        return Object.values(this.store.templates).sort((a, b) => {
            if (a.active && !b.active) return -1;
            if (!a.active && b.active) return 1;
            return a.title.localeCompare(b.title, 'fa');
        });
    }

    getActive(): RecurringTemplate[] {
        return this.getAll().filter(t => t.active);
    }

    getById(id: string): RecurringTemplate | null {
        return this.store.templates[id] || null;
    }

    async add(template: RecurringTemplate): Promise<boolean> {
        try {
            this.store.templates[template.id] = template;
            await this.save();
            return true;
        } catch (e) {
            console.warn('[First Task] RecurringManager add failed:', e);
            return false;
        }
    }

    async createTemplate(data: {
        title: string;
        description?: string;
        category?: string;
        recurrence: 'daily' | 'weekly' | 'monthly';
        weekDay?: number;
        monthDay?: number;
        startDateJalali: string;
        startDateGregorian: string;
        startDateTs: number;
    }): Promise<RecurringTemplate | null> {
        try {
            const now = Date.now();
            const template: RecurringTemplate = {
                id: generateRecurringId(),
                title: data.title.trim(),
                description: data.description?.trim() || '',
                category: data.category || '',
                recurrence: data.recurrence,
                weekDay: data.weekDay,
                monthDay: data.monthDay,
                start_date_jalali: data.startDateJalali,
                start_date_gregorian: data.startDateGregorian,
                start_date_ts: data.startDateTs,
                active: true,
                created_ts: now,
                modified_ts: now,
            };

            this.store.templates[template.id] = template;
            await this.save();
            return template;
        } catch (e) {
            console.warn('[First Task] RecurringManager createTemplate failed:', e);
            return null;
        }
    }

    async update(id: string, patch: Partial<RecurringTemplate>): Promise<boolean> {
        const existing = this.store.templates[id];
        if (!existing) return false;

        try {
            this.store.templates[id] = {
                ...existing,
                ...patch,
                modified_ts: Date.now(),
            };
            await this.save();
            return true;
        } catch (e) {
            console.warn('[First Task] RecurringManager update failed:', e);
            return false;
        }
    }

    async remove(id: string): Promise<boolean> {
        if (!this.store.templates[id]) return false;

        try {
            delete this.store.templates[id];
            await this.save();
            return true;
        } catch (e) {
            console.warn('[First Task] RecurringManager remove failed:', e);
            return false;
        }
    }

    async toggleActive(id: string): Promise<boolean> {
        const existing = this.store.templates[id];
        if (!existing) return false;
        return this.update(id, { active: !existing.active });
    }

    /* ═══════════════════════════════════════════════════════
       🎯 منطق هوشمند: Most Recent Due Date
       ═══════════════════════════════════════════════════════ */

    /* ─── محاسبه‌ی آخرین تاریخ سررسید ─── */
    private computeMostRecentDueDate(
        template: RecurringTemplate,
        nowTs: number
    ): DueDateResult | null {
        const todayStart = startOfDay(nowTs);

        switch (template.recurrence) {
            /* ─── روزانه: همیشه امروز ─── */
            case 'daily':
                return this.tsToDateResult(todayStart);

            /* ─── هفتگی: امروز یا جمعه گذشته ─── */
            case 'weekly': {
                if (template.weekDay === undefined) return null;

                const todayDate = new Date(nowTs);
                const todayDay = todayDate.getDay();
                const diff = (todayDay - template.weekDay + 7) % 7;

                const target = new Date(nowTs);
                target.setDate(target.getDate() - diff);
                target.setHours(0, 0, 0, 0);

                return this.tsToDateResult(target.getTime());
            }

            /* ─── ماهانه: امروز یا ماه گذشته ─── */
            case 'monthly': {
                if (template.monthDay === undefined) return null;

                const todayDate = new Date(nowTs);
                const todayDay = todayDate.getDate();
                const currentMonth = todayDate.getMonth();
                const currentYear = todayDate.getFullYear();

                /* ─── آخرین روز همین ماه ─── */
                const lastDayThisMonth = new Date(
                    currentYear,
                    currentMonth + 1,
                    0
                ).getDate();

                const targetDayThisMonth = Math.min(
                    template.monthDay,
                    lastDayThisMonth
                );

                if (todayDay >= targetDayThisMonth) {
                    /* ─── همین ماه ─── */
                    const target = new Date(
                        currentYear,
                        currentMonth,
                        targetDayThisMonth
                    );
                    return this.tsToDateResult(target.getTime());
                }

                /* ─── ماه گذشته ─── */
                const lastDayLastMonth = new Date(
                    currentYear,
                    currentMonth,
                    0
                ).getDate();

                const targetDayLastMonth = Math.min(
                    template.monthDay,
                    lastDayLastMonth
                );

                const target = new Date(
                    currentYear,
                    currentMonth - 1,
                    targetDayLastMonth
                );
                return this.tsToDateResult(target.getTime());
            }

            default:
                return null;
        }
    }

    /* ─── تبدیل timestamp به نتیجه ─── */
    private tsToDateResult(ts: number): DueDateResult {
        const d = new Date(ts);
        const [jy, jm, jd] = toJalali(
            d.getFullYear(),
            d.getMonth() + 1,
            d.getDate()
        );
        const [gy, gm, gd] = toGregorian(jy, jm, jd);

        return {
            jalali: `${jy}/${pad(jm)}/${pad(jd)}`,
            gregorian: `${gy}-${pad(gm)}-${pad(gd)}`,
            ts,
        };
    }

    /* ─── چک: آیا تسکی از این الگو در این چرخه ساخته شده؟ ─── */
    private hasInstanceInCycle(
        templateId: string,
        cycleStartTs: number
    ): boolean {
        const allTasks = this.desktopStore.getAll();

        for (const task of allTasks) {
            if (task.from_recurring !== templateId) continue;
            if (task.created_ts >= cycleStartTs) return true;
        }
        return false;
    }

    /* ═══════════════════════════════════════════════════════
       🎯 ساجست‌های امروز
       ═══════════════════════════════════════════════════════ */
    getTodaysSuggestions(): RecurringSuggestion[] {
        const nowTs = Date.now();
        const suggestions: RecurringSuggestion[] = [];

        for (const template of this.getActive()) {
            /* ─── چک شروع ─── */
            if (template.start_date_ts > startOfDay(nowTs)) continue;

            /* ─── محاسبه‌ی آخرین تاریخ سررسید ─── */
            const dueDate = this.computeMostRecentDueDate(template, nowTs);
            if (!dueDate) continue;

            /* ─── چک تکرار: آیا تسکی در این چرخه ساخته شده؟ ─── */
            if (this.hasInstanceInCycle(template.id, dueDate.ts)) continue;

            /* ─── ساجست ─── */
            suggestions.push({
                template,
                instance_date_jalali: dueDate.jalali,
                instance_date_gregorian: dueDate.gregorian,
                instance_date_ts: dueDate.ts,
            });
        }

        return suggestions;
    }

    /* ═══════════════════════════════════════════════════════
       🎯 ساخت instance از الگو
       ═══════════════════════════════════════════════════════ */
    async createInstanceFromSuggestion(
        suggestion: RecurringSuggestion
    ): Promise<DesktopTask | null> {
        const template = suggestion.template;

        const result = await this.desktopStore.createTask({
            title: template.title,
            description: template.description,
            category: template.category,
            dueDateJalali: suggestion.instance_date_jalali,
            dueDateGregorian: suggestion.instance_date_gregorian,
            dueDateTs: suggestion.instance_date_ts,
        });

        if (result) {
            await this.desktopStore.update(result.id, {
                from_recurring: template.id,
            });
            return { ...result, from_recurring: template.id };
        }

        return null;
    }

    /* ═══════════════════════════════════════════════════════
       اطلاعات کمکی
       ═══════════════════════════════════════════════════════ */
    getCount(): number {
        return Object.keys(this.store.templates).length;
    }

    getActiveCount(): number {
        return this.getActive().length;
    }
}
