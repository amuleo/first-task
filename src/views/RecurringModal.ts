/* ════════════════════════════════════════════════════════════
   🔄 RecurringModal — ساخت/ویرایش الگوی تکرارشونده
   ✅ ۳ نوع: روزانه / هفتگی / ماهانه
   ✅ انتخاب روز هفته (برای هفتگی)
   ✅ انتخاب روز ماه (برای ماهانه)
   ✅ تاریخ شروع با DateSuggest
   ✅ دراپ‌دان داینامیک بر اساس recurrence
   ════════════════════════════════════════════════════════════ */

import { App, Modal, Setting } from 'obsidian';
import type FirstTaskPlugin from '../main';
import type { RecurringTemplate, RecurrenceType } from '../types';
import { t, applyDirection } from '../i18n';
import { parseDateInput, getTodayDateInput } from '../utils/jalaliDate';
import { displayString } from '../utils/numberUtils';
import { DateSuggest } from './DateSuggest';

export class RecurringModal extends Modal {
    plugin: FirstTaskPlugin;
    existingTemplate: RecurringTemplate | null;
    onDone: () => void;

    private submitting = false;

    /* ─── فیلدها ─── */
    private titleValue = '';
    private descriptionValue = '';
    private categoryValue = '';
    private recurrenceValue: RecurrenceType = 'daily';
    private weekDayValue: number = 6; /* پیش‌فرض شنبه */
    private monthDayValue: number = 1;
    private dateJalali = '';
    private dateGregorian = '';
    private dateTs = 0;

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

        /* ─── اگه ادیت، مقادیر رو پر کن ─── */
        if (existingTemplate) {
            this.titleValue = existingTemplate.title;
            this.descriptionValue = existingTemplate.description;
            this.categoryValue = existingTemplate.category;
            this.recurrenceValue = existingTemplate.recurrence;
            if (existingTemplate.weekDay !== undefined) {
                this.weekDayValue = existingTemplate.weekDay;
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
        this.render();
    }

    private render(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('first-task-modal-content');
        contentEl.addClass('first-task-recurring-modal');

        const lang = this.plugin.settings.language;
        const useJalali = this.plugin.settings.useJalaliDate;
        applyDirection(contentEl, lang);

        /* ─── عنوان ─── */
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

        /* ─── دسته‌بندی ─── */
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
                    this.render();
                });
            });

        /* ─── روز هفته (فقط برای weekly) ─── */
        if (this.recurrenceValue === 'weekly') {
            new Setting(contentEl)
                .setName(t(lang, 'recurring_weekday'))
                .setDesc(t(lang, 'recurring_weekday_desc'))
                .addDropdown(dd => {
                    /* 0=Sunday, 1=Monday, ..., 6=Saturday */
                    const days = [
                        { value: '0', key: 'weekday_sunday' },
                        { value: '1', key: 'weekday_monday' },
                        { value: '2', key: 'weekday_tuesday' },
                        { value: '3', key: 'weekday_wednesday' },
                        { value: '4', key: 'weekday_thursday' },
                        { value: '5', key: 'weekday_friday' },
                        { value: '6', key: 'weekday_saturday' },
                    ];
                    for (const d of days) {
                        dd.addOption(d.value, t(lang, d.key as any));
                    }
                    dd.setValue(String(this.weekDayValue));
                    dd.onChange(v => { this.weekDayValue = parseInt(v); });
                });
        }

        /* ─── روز ماه (فقط برای monthly) ─── */
        if (this.recurrenceValue === 'monthly') {
            new Setting(contentEl)
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

    private async submit(): Promise<void> {
        if (this.submitting) return;
        const lang = this.plugin.settings.language;
        const useJalali = this.plugin.settings.useJalaliDate;

        /* ─── چک عنوان ─── */
        if (!this.titleValue.trim()) {
            this.plugin.toastManager.show(t(lang, 'notice_no_title'), 'warning');
            return;
        }

        /* ─── چک تاریخ ─── */
        let startJalali = this.dateJalali;
        let startGregorian = this.dateGregorian;
        let startTs = this.dateTs;

        if (!startJalali && !startGregorian) {
            /* اگه کاربر تاریخ نداده، از امروز استفاده کن */
            const todayDisplay = getTodayDateInput(useJalali);
            const parsed = parseDateInput(todayDisplay, useJalali);
            if (parsed) {
                startJalali = parsed.jalali;
                startGregorian = parsed.gregorian;
                startTs = parsed.ts;
            }
        }

        this.submitting = true;

        try {
            if (this.existingTemplate) {
                /* ─── Edit ─── */
                const ok = await this.plugin.recurringManager.update(
                    this.existingTemplate.id,
                    {
                        title: this.titleValue.trim(),
                        description: this.descriptionValue.trim(),
                        category: this.categoryValue,
                        recurrence: this.recurrenceValue,
                        weekDay: this.recurrenceValue === 'weekly'
                            ? this.weekDayValue
                            : undefined,
                        monthDay: this.recurrenceValue === 'monthly'
                            ? this.monthDayValue
                            : undefined,
                        start_date_jalali: startJalali,
                        start_date_gregorian: startGregorian,
                        start_date_ts: startTs,
                    }
                );

                if (ok) {
                    this.plugin.toastManager.show(
                        t(lang, 'recurring_updated'),
                        'success'
                    );
                    this.onDone();
                    this.close();
                } else {
                    this.submitting = false;
                }
            } else {
                /* ─── Create ─── */
                const result = await this.plugin.recurringManager.createTemplate({
                    title: this.titleValue.trim(),
                    description: this.descriptionValue.trim(),
                    category: this.categoryValue,
                    recurrence: this.recurrenceValue,
                    weekDay: this.recurrenceValue === 'weekly'
                        ? this.weekDayValue
                        : undefined,
                    monthDay: this.recurrenceValue === 'monthly'
                        ? this.monthDayValue
                        : undefined,
                    startDateJalali: startJalali,
                    startDateGregorian: startGregorian,
                    startDateTs: startTs,
                });

                if (result) {
                    this.plugin.toastManager.show(
                        t(lang, 'recurring_created'),
                        'success'
                    );
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
    }
}
