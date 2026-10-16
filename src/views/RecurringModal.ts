/* ════════════════════════════════════════════════════════════
   🔄 RecurringModal — v0.2.3
   ✅ بدون پرش اسکرول
   ✅ ترتیب روزها بر اساس weekStartDay
   ════════════════════════════════════════════════════════════ */

import { App, Modal, Setting } from 'obsidian';
import type FirstTaskPlugin from '../main';
import type { RecurringTemplate, RecurrenceType, WeeklyMode } from '../types';
import { t, applyDirection } from '../i18n';
import { parseDateInput, getTodayDateInput } from '../utils/jalaliDate';
import { displayString } from '../utils/numberUtils';
import { DateSuggest } from './DateSuggest';

const WEEKDAY_KEYS = [
    'weekday_sunday',
    'weekday_monday',
    'weekday_tuesday',
    'weekday_wednesday',
    'weekday_thursday',
    'weekday_friday',
    'weekday_saturday',
] as const;

/* 🆕 ترتیب روزها بر اساس weekStartDay */
function getOrderedWeekDays(weekStartDay: number): number[] {
    const order: number[] = [];
    for (let i = 0; i < 7; i++) {
        order.push((weekStartDay + i) % 7);
    }
    return order;
}

export class RecurringModal extends Modal {
    plugin: FirstTaskPlugin;
    existingTemplate: RecurringTemplate | null;
    onDone: () => void;

    private submitting = false;

    private titleValue = '';
    private descriptionValue = '';
    private categoryValue = '';
    private recurrenceValue: RecurrenceType = 'daily';
    private weeklyMode: WeeklyMode = 'single';
    private singleWeekDay: number = 6;
    private selectedWeekDays: Set<number> = new Set([6]);
    private monthDayValue: number = 1;
    private dateJalali = '';
    private dateGregorian = '';
    private dateTs = 0;

    private dynamicContainer: HTMLElement | null = null;

    constructor(
        app: App,
        plugin: FirstTaskPlugin,
        existingTemplate: RecurringTemplate | null,
        onDone: () => void
    ) {
        super(app);
        this.plugin = plugin;
        this.existingTemplate = existingTemplate;
        this.onDone = onDone;

        if (existingTemplate) {
            this.titleValue = existingTemplate.title;
            this.descriptionValue = existingTemplate.description;
            this.categoryValue = existingTemplate.category;
            this.recurrenceValue = existingTemplate.recurrence;

            if (existingTemplate.weekDays && existingTemplate.weekDays.length > 0) {
                this.selectedWeekDays = new Set(existingTemplate.weekDays);
                this.singleWeekDay = existingTemplate.weekDays[0];
            } else if (existingTemplate.weekDay !== undefined) {
                this.selectedWeekDays = new Set([existingTemplate.weekDay]);
                this.singleWeekDay = existingTemplate.weekDay;
            }

            if (existingTemplate.weeklyMode) {
                this.weeklyMode = existingTemplate.weeklyMode;
            } else if (this.selectedWeekDays.size === 7) {
                this.weeklyMode = 'every-day';
            } else if (this.selectedWeekDays.size > 1) {
                this.weeklyMode = 'multiple';
            } else {
                this.weeklyMode = 'single';
            }

            if (existingTemplate.monthDay !== undefined) {
                this.monthDayValue = existingTemplate.monthDay;
            }
            this.dateJalali = existingTemplate.start_date_jalali;
            this.dateGregorian = existingTemplate.start_date_gregorian;
            this.dateTs = existingTemplate.start_date_ts;
        }
    }

    onOpen(): void {
        this.renderFull();
    }

    /* ═══════════════════════════════════════════════════════
       رندر کامل (فقط یک بار)
       ═══════════════════════════════════════════════════════ */
    private renderFull(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('first-task-modal-content');
        contentEl.addClass('first-task-recurring-modal');

        const lang = this.plugin.settings.language;
        const useJalali = this.plugin.settings.useJalaliDate;
        applyDirection(contentEl, lang);

        contentEl.createEl('h3', {
            text: this.existingTemplate
                ? t(lang, 'recurring_edit_title')
                : t(lang, 'recurring_create_title'),
            cls: 'first-task-modal-title',
        });

        /* ─── عنوان ─── */
        new Setting(contentEl)
            .setName(t(lang, 'field_title'))
            .addText(text => {
                text.setPlaceholder(t(lang, 'field_title_placeholder'));
                text.setValue(this.titleValue);
                text.onChange(v => { this.titleValue = v; });
                if (!this.existingTemplate) {
                    setTimeout(() => text.inputEl.focus(), 50);
                }
            });

        /* ─── توضیحات ─── */
        new Setting(contentEl)
            .setName(t(lang, 'field_description'))
            .addTextArea(ta => {
                ta.setPlaceholder(t(lang, 'field_description_placeholder'));
                ta.setValue(this.descriptionValue);
                ta.inputEl.rows = 3;
                ta.inputEl.style.width = '100%';
                ta.onChange(v => { this.descriptionValue = v; });
            });

        /* ─── دسته ─── */
        if (this.plugin.settings.enableCategories) {
            const cats = this.plugin.taskManager.getCategories();
            new Setting(contentEl)
                .setName(t(lang, 'field_category'))
                .addDropdown(dd => {
                    dd.addOption('', t(lang, 'panel_no_category'));
                    for (const c of cats) {
                        const label = lang === 'fa' ? c.name_fa : c.name;
                        dd.addOption(c.id, label);
                    }
                    dd.setValue(this.categoryValue);
                    dd.onChange(v => { this.categoryValue = v; });
                });
        }

        /* ─── نوع تکرار ─── */
        new Setting(contentEl)
            .setName(t(lang, 'recurring_type'))
            .setDesc(t(lang, 'recurring_type_desc'))
            .addDropdown(dd => {
                dd.addOption('daily', t(lang, 'recurring_type_daily'));
                dd.addOption('weekly', t(lang, 'recurring_type_weekly'));
                dd.addOption('monthly', t(lang, 'recurring_type_monthly'));
                dd.setValue(this.recurrenceValue);
                dd.onChange(v => {
                    this.recurrenceValue = v as RecurrenceType;
                    this.renderDynamicSection();
                });
            });

        /* ─── container داینامیک ─── */
        this.dynamicContainer = contentEl.createDiv({
            cls: 'first-task-recurring-dynamic',
        });

        this.renderDynamicContent();

        /* ─── تاریخ شروع ─── */
        const todayDisplay = getTodayDateInput(useJalali);
        const currentDateDisplay = this.dateJalali || this.dateGregorian || todayDisplay;

        new Setting(contentEl)
            .setName(t(lang, 'recurring_start_date'))
            .setDesc(t(lang, 'recurring_start_date_desc'))
            .addText(text => {
                text.setValue(displayString(currentDateDisplay, lang));
                text.inputEl.dir = 'ltr';
                text.setPlaceholder(useJalali ? '1405/07/25' : '2026-10-15');

                new DateSuggest(this.app, text.inputEl, this.plugin, (dateStr) => {
                    const parsed = parseDateInput(dateStr, useJalali);
                    if (parsed) {
                        this.dateJalali = parsed.jalali;
                        this.dateGregorian = parsed.gregorian;
                        this.dateTs = parsed.ts;
                        text.setValue(displayString(dateStr, lang));
                    }
                });

                text.onChange(v => {
                    const parsed = parseDateInput(v, useJalali);
                    if (parsed) {
                        this.dateJalali = parsed.jalali;
                        this.dateGregorian = parsed.gregorian;
                        this.dateTs = parsed.ts;
                    }
                });
            });

        /* ─── دکمه‌ها ─── */
        const actions = contentEl.createDiv({ cls: 'first-task-modal-buttons' });

        const cancelBtn = actions.createEl('button', {
            text: t(lang, 'btn_cancel'),
        });
        cancelBtn.onclick = () => this.close();

        const saveBtn = actions.createEl('button', {
            text: this.existingTemplate
                ? t(lang, 'btn_save')
                : t(lang, 'btn_create'),
            cls: 'mod-cta',
        });
        saveBtn.onclick = () => this.submit();
    }

    /* ═══════════════════════════════════════════════════════
       فقط بخش داینامیک
       ═══════════════════════════════════════════════════════ */
    private renderDynamicSection(): void {
        if (!this.dynamicContainer) return;
        this.dynamicContainer.empty();
        this.renderDynamicContent();
    }

    private renderDynamicContent(): void {
        if (!this.dynamicContainer) return;

        const lang = this.plugin.settings.language;
        const parent = this.dynamicContainer;

        /* ─── هفتگی ─── */
        if (this.recurrenceValue === 'weekly') {
            new Setting(parent)
                .setName(t(lang, 'recurring_weekly_mode'))
                .setDesc(t(lang, 'recurring_weekly_mode_desc'))
                .addDropdown(dd => {
                    dd.addOption('single', t(lang, 'recurring_weekly_mode_single'));
                    dd.addOption('multiple', t(lang, 'recurring_weekly_mode_multiple'));
                    dd.addOption('every-day', t(lang, 'recurring_weekly_mode_every_day'));
                    dd.setValue(this.weeklyMode);
                    dd.onChange(v => {
                        this.weeklyMode = v as WeeklyMode;
                        this.renderDynamicSection();
                    });
                });

            if (this.weeklyMode === 'single') {
                new Setting(parent)
                    .setName(t(lang, 'recurring_weekday'))
                    .setDesc(t(lang, 'recurring_weekday_desc'))
                    .addDropdown(dd => {
                        /* 🆕 ترتیب از weekStartDay */
                        const orderedDays = getOrderedWeekDays(
                            this.plugin.settings.weekStartDay
                        );
                        for (const i of orderedDays) {
                            dd.addOption(String(i), t(lang, WEEKDAY_KEYS[i] as any));
                        }
                        dd.setValue(String(this.singleWeekDay));
                        dd.onChange(v => {
                            this.singleWeekDay = parseInt(v);
                            this.selectedWeekDays = new Set([this.singleWeekDay]);
                        });
                    });
            }

            if (this.weeklyMode === 'multiple') {
                const wrap = parent.createDiv({ cls: 'first-task-weekday-chips-wrap' });
                wrap.createDiv({
                    cls: 'first-task-weekday-chips-label',
                    text: t(lang, 'recurring_weekdays_pick'),
                });

                const chips = wrap.createDiv({ cls: 'first-task-weekday-chips' });

                /* 🆕 ترتیب از weekStartDay */
                const orderedDays = getOrderedWeekDays(
                    this.plugin.settings.weekStartDay
                );

                for (const i of orderedDays) {
                    const isActive = this.selectedWeekDays.has(i);
                    const chip = chips.createEl('button', {
                        cls: 'first-task-weekday-chip' + (isActive ? ' is-active' : ''),
                    });
                    chip.dataset.day = String(i);
                    chip.setText(t(lang, WEEKDAY_KEYS[i] as any));
                    chip.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (this.selectedWeekDays.has(i)) {
                            if (this.selectedWeekDays.size > 1) {
                                this.selectedWeekDays.delete(i);
                            }
                        } else {
                            this.selectedWeekDays.add(i);
                        }
                        this.updateChipsUI();
                    };
                }
            }

            if (this.weeklyMode === 'every-day') {
                const info = parent.createDiv({ cls: 'first-task-weekday-info' });
                info.setText('☀️ ' + t(lang, 'recurring_weekly_mode_every_day_hint'));
            }
        }

        /* ─── ماهانه ─── */
        if (this.recurrenceValue === 'monthly') {
            new Setting(parent)
                .setName(t(lang, 'recurring_monthday'))
                .setDesc(t(lang, 'recurring_monthday_desc'))
                .addDropdown(dd => {
                    for (let i = 1; i <= 31; i++) {
                        dd.addOption(String(i), String(i));
                    }
                    dd.setValue(String(this.monthDayValue));
                    dd.onChange(v => { this.monthDayValue = parseInt(v); });
                });
        }
    }

    /* 🆕 فقط chipها رو آپدیت کن */
    private updateChipsUI(): void {
        if (!this.dynamicContainer) return;
        const chips = this.dynamicContainer.querySelectorAll('.first-task-weekday-chip');
        chips.forEach((chip) => {
            const dayStr = (chip as HTMLElement).dataset.day;
            if (dayStr === undefined) return;
            const day = parseInt(dayStr);
            const isActive = this.selectedWeekDays.has(day);
            chip.classList.toggle('is-active', isActive);
        });
    }

    /* ═══════════════════════════════════════════════════════
       Submit
       ═══════════════════════════════════════════════════════ */
    private async submit(): Promise<void> {
        if (this.submitting) return;
        const lang = this.plugin.settings.language;
        const useJalali = this.plugin.settings.useJalaliDate;

        if (!this.titleValue.trim()) {
            this.plugin.toastManager.show(t(lang, 'notice_no_title'), 'warning');
            return;
        }

        if (this.recurrenceValue === 'weekly' &&
            this.weeklyMode === 'multiple' &&
            this.selectedWeekDays.size === 0) {
            this.plugin.toastManager.show(
                t(lang, 'recurring_no_weekdays'),
                'warning'
            );
            return;
        }

        let startJalali = this.dateJalali;
        let startGregorian = this.dateGregorian;
        let startTs = this.dateTs;

        if (!startJalali && !startGregorian) {
            const todayDisplay = getTodayDateInput(useJalali);
            const parsed = parseDateInput(todayDisplay, useJalali);
            if (parsed) {
                startJalali = parsed.jalali;
                startGregorian = parsed.gregorian;
                startTs = parsed.ts;
            }
        }

        let weekDay: number | undefined;
        let weekDays: number[] | undefined;
        let weeklyMode: WeeklyMode | undefined;

        if (this.recurrenceValue === 'weekly') {
            weeklyMode = this.weeklyMode;

            if (this.weeklyMode === 'single') {
                weekDay = this.singleWeekDay;
                weekDays = [this.singleWeekDay];
            } else if (this.weeklyMode === 'multiple') {
                weekDays = Array.from(this.selectedWeekDays).sort();
                weekDay = weekDays[0];
            } else if (this.weeklyMode === 'every-day') {
                weekDays = [0, 1, 2, 3, 4, 5, 6];
                weekDay = undefined;
            }
        }

        this.submitting = true;

        try {
            if (this.existingTemplate) {
                const ok = await this.plugin.recurringManager.update(
                    this.existingTemplate.id,
                    {
                        title: this.titleValue.trim(),
                        description: this.descriptionValue.trim(),
                        category: this.categoryValue,
                        recurrence: this.recurrenceValue,
                        weekDay,
                        weekDays,
                        weeklyMode,
                        monthDay: this.recurrenceValue === 'monthly'
                            ? this.monthDayValue
                            : undefined,
                        start_date_jalali: startJalali,
                        start_date_gregorian: startGregorian,
                        start_date_ts: startTs,
                    }
                );

                if (ok) {
                    this.plugin.toastManager.show(t(lang, 'recurring_updated'), 'success');
                    this.onDone();
                    this.close();
                } else {
                    this.submitting = false;
                }
            } else {
                const result = await this.plugin.recurringManager.createTemplate({
                    title: this.titleValue.trim(),
                    description: this.descriptionValue.trim(),
                    category: this.categoryValue,
                    recurrence: this.recurrenceValue,
                    weekDay,
                    weekDays,
                    weeklyMode,
                    monthDay: this.recurrenceValue === 'monthly'
                        ? this.monthDayValue
                        : undefined,
                    startDateJalali: startJalali,
                    startDateGregorian: startGregorian,
                    startDateTs: startTs,
                });

                if (result) {
                    this.plugin.toastManager.show(t(lang, 'recurring_created'), 'success');
                    this.onDone();
                    this.close();
                } else {
                    this.submitting = false;
                }
            }
        } catch (e) {
            this.submitting = false;
            console.warn('[First Task] RecurringModal submit failed:', e);
            this.plugin.toastManager.show(
                lang === 'fa' ? 'ذخیره ناموفق' : 'Save failed',
                'error'
            );
        }
    }

    onClose(): void {
        this.contentEl.empty();
        this.dynamicContainer = null;
    }
}
