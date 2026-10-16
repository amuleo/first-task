/* ════════════════════════════════════════════════════════════
   🔄 RecurringManager — تسک‌های تکرارشونده
   ✅ فایل جدا: FirstTask/recurring.json
   ✅ ۳ نوع: روزانه / هفتگی / ماهانه
   ✅ محاسبه‌ی ساجست برای امروز
   ✅ ساخت instance در Desktop
   ✅ جلوگیری از تکرار روزانه
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
    getJalaliDateFull,
    getGregorianDateFull,
} from '../utils/jalaliDate';

const FOLDER_NAME = 'FirstTask';
const RECURRING_FILE = 'recurring.json';

export class RecurringManager {
    private app: App;
    private filePath: string;
    private store: RecurringStoreFile = { ...DEFAULT_RECURRING_STORE };

    constructor(
        app: App,
        private desktopStore: DesktopStore
    ) {
        this.app = app;
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
            /* active اول */
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
       🎯 محاسبه‌ی ساجست برای امروز
       ═══════════════════════════════════════════════════════ */
    getTodaysSuggestions(): RecurringSuggestion[] {
        const nowTs = Date.now();
        const todayStart = startOfDay(nowTs);
        const suggestions: RecurringSuggestion[] = [];

        const activeTemplates = this.getActive();

        for (const template of activeTemplates) {
            /* ─── چک شروع ─── */
            if (template.start_date_ts > todayStart) continue;

            /* ─── چک مطابقت با recurrence ─── */
            if (!this.matchesToday(template, nowTs)) continue;

            /* ─── چک تکرار: اگه instance امروز ساخته شده، رد کن ─── */
            if (this.hasInstanceToday(template.id, nowTs)) continue;

            /* ─── ساجست ─── */
            const now = new Date();
            suggestions.push({
                template,
                instance_date_jalali: getJalaliDateFull(now).split(' - ')[0],
                instance_date_gregorian: getGregorianDateFull(now).split(' ')[0],
                instance_date_ts: todayStart,
            });
        }

        return suggestions;
    }

    /* ─── چک مطابقت با امروز ─── */
    private matchesToday(template: RecurringTemplate, nowTs: number): boolean {
        const today = new Date(nowTs);

        switch (template.recurrence) {
            case 'daily':
                return true;

            case 'weekly': {
                if (template.weekDay === undefined) return false;
                return today.getDay() === template.weekDay;
            }

            case 'monthly': {
                if (template.monthDay === undefined) return false;

                const todayDay = today.getDate();
                const lastDayOfMonth = new Date(
                    today.getFullYear(),
                    today.getMonth() + 1,
                    0
                ).getDate();

                /* اگه روز تعیین‌شده بزرگ‌تر از ماه باشه → آخرین روز ماه */
                const targetDay = Math.min(template.monthDay, lastDayOfMonth);

                return todayDay === targetDay;
            }

            default:
                return false;
        }
    }

    /* ─── چک: آیا instance امروز ساخته شده؟ ─── */
    private hasInstanceToday(templateId: string, nowTs: number): boolean {
        const todayStart = startOfDay(nowTs);
        const tomorrowStart = todayStart + 24 * 60 * 60 * 1000;

        const allTasks = this.desktopStore.getAll();
        for (const task of allTasks) {
            if (task.from_recurring !== templateId) continue;
            if (task.created_ts >= todayStart && task.created_ts < tomorrowStart) {
                return true;
            }
        }
        return false;
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
            /* تاریخ انجام = امروز */
            dueDateJalali: suggestion.instance_date_jalali,
            dueDateGregorian: suggestion.instance_date_gregorian,
            dueDateTs: suggestion.instance_date_ts,
        });

        if (result) {
            /* علامت‌گذاری که از recurring اومده */
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
