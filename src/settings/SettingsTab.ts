/* ════════════════════════════════════════════════════════════
   ⚙️ تب تنظیمات — v0.3.0
   ✅ Desktop section
   ✅ 🆕 Recurring section (مدیریت الگوها)
   ════════════════════════════════════════════════════════════ */

import { App, PluginSettingTab, Setting, setIcon } from 'obsidian';
import type FirstTaskPlugin from '../main';
import type { Language, WeekStartDay, RecurringTemplate } from '../types';
import { t, applyDirection } from '../i18n';
import { RecurringModal } from '../views/RecurringModal';
import { displayString } from '../utils/numberUtils';

export class FirstTaskSettingsTab extends PluginSettingTab {
    plugin: FirstTaskPlugin;
    private refreshTimer: number | null = null;

    constructor(app: App, plugin: FirstTaskPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    private scheduleRefresh(): void {
        if (this.refreshTimer !== null) {
            window.clearTimeout(this.refreshTimer);
        }
        this.refreshTimer = window.setTimeout(() => {
            this.refreshTimer = null;
            this.display();
        }, 50);
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.addClass('first-task-settings');

        const lang = this.plugin.settings.language;
        applyDirection(containerEl, lang);

        new Setting(containerEl).setName(t(lang, 'settings_title')).setHeading();

        /* ═══════ عمومی ═══════ */
        new Setting(containerEl).setName(t(lang, 'settings_general')).setHeading();

        new Setting(containerEl)
            .setName(t(lang, 'settings_language'))
            .setDesc(t(lang, 'settings_language_desc'))
            .addDropdown(dd => {
                dd.addOption('en', 'English');
                dd.addOption('fa', 'فارسی');
                dd.setValue(lang);
                dd.onChange(async (v) => {
                    this.plugin.settings.language = v as Language;
                    await this.plugin.saveSettings();
                    this.scheduleRefresh();
                });
            });

        new Setting(containerEl)
            .setName(t(lang, 'settings_jalali'))
            .setDesc(t(lang, 'settings_jalali_desc'))
            .addToggle(tg => tg
                .setValue(this.plugin.settings.useJalaliDate)
                .onChange(async (v) => {
                    this.plugin.settings.useJalaliDate = v;
                    await this.plugin.saveSettings();
                    this.plugin.refreshPanel();
                }));

        new Setting(containerEl)
            .setName(t(lang, 'settings_week_start'))
            .setDesc(t(lang, 'settings_week_start_desc'))
            .addDropdown(dd => {
                dd.addOption('6', t(lang, 'week_saturday'));
                dd.addOption('0', t(lang, 'week_sunday'));
                dd.addOption('1', t(lang, 'week_monday'));
                dd.setValue(String(this.plugin.settings.weekStartDay));
                dd.onChange(async (v) => {
                    this.plugin.settings.weekStartDay = parseInt(v) as WeekStartDay;
                    await this.plugin.saveSettings();
                    this.plugin.refreshPanel();
                });
            });

        /* ═══════ نمایش ═══════ */
        new Setting(containerEl).setName(t(lang, 'settings_display')).setHeading();

        new Setting(containerEl)
            .setName(t(lang, 'settings_tasks_per_page'))
            .setDesc(t(lang, 'settings_tasks_per_page_desc'))
            .addDropdown(dd => {
                const options = [10, 20, 30, 50, 100];
                for (const n of options) dd.addOption(String(n), String(n));
                let current = this.plugin.settings.tasksPerPage;
                if (!options.includes(current)) current = 20;
                dd.setValue(String(current));
                dd.onChange(async (v) => {
                    this.plugin.settings.tasksPerPage = parseInt(v) || 20;
                    await this.plugin.saveSettings();
                    this.plugin.refreshPanel();
                });
            });

        new Setting(containerEl)
            .setName(t(lang, 'settings_show_task_badges'))
            .setDesc(t(lang, 'settings_show_task_badges_desc'))
            .addToggle(tg => tg
                .setValue(this.plugin.settings.showTaskBadges)
                .onChange(async (v) => {
                    this.plugin.settings.showTaskBadges = v;
                    await this.plugin.saveSettings();
                    this.plugin.refreshPanel();
                }));

        new Setting(containerEl)
            .setName(t(lang, 'settings_auto_fill_created'))
            .setDesc(t(lang, 'settings_auto_fill_created_desc'))
            .addToggle(tg => tg
                .setValue(this.plugin.settings.autoFillCreatedTime)
                .onChange(async (v) => {
                    this.plugin.settings.autoFillCreatedTime = v;
                    await this.plugin.saveSettings();
                    this.plugin.refreshPanel();
                }));

        /* ═══════ پوشه‌ها ═══════ */
        new Setting(containerEl).setName(t(lang, 'settings_folders')).setHeading();

        new Setting(containerEl)
            .setName(t(lang, 'settings_include_folders'))
            .setDesc(t(lang, 'settings_include_folders_desc'))
            .addTextArea(ta => {
                ta.setPlaceholder('notes, journal');
                ta.inputEl.rows = 2;
                ta.inputEl.style.width = '100%';
                ta.inputEl.dir = 'ltr';
                ta.setValue(this.plugin.settings.includeFolders.join(', '));
                ta.onChange(async (v) => {
                    this.plugin.settings.includeFolders = this.parseFolders(v);
                    await this.plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName(t(lang, 'settings_exclude_folders'))
            .setDesc(t(lang, 'settings_exclude_folders_desc'))
            .addTextArea(ta => {
                ta.setPlaceholder('.obsidian, FirstTask, .trash');
                ta.inputEl.rows = 2;
                ta.inputEl.style.width = '100%';
                ta.inputEl.dir = 'ltr';
                ta.setValue(this.plugin.settings.excludeFolders.join(', '));
                ta.onChange(async (v) => {
                    this.plugin.settings.excludeFolders = this.parseFolders(v);
                    await this.plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName(t(lang, 'settings_only_markdown'))
            .setDesc(t(lang, 'settings_only_markdown_desc'))
            .addToggle(tg => tg
                .setValue(this.plugin.settings.onlyMarkdown)
                .onChange(async (v) => {
                    this.plugin.settings.onlyMarkdown = v;
                    await this.plugin.saveSettings();
                }));

        /* ═══════ دسته‌بندی ═══════ */
        new Setting(containerEl).setName(t(lang, 'settings_categories')).setHeading();

        new Setting(containerEl)
            .setName(t(lang, 'settings_enable_categories'))
            .setDesc(t(lang, 'settings_enable_categories_desc'))
            .addToggle(tg => tg
                .setValue(this.plugin.settings.enableCategories)
                .onChange(async (v) => {
                    this.plugin.settings.enableCategories = v;
                    await this.plugin.saveSettings();
                    this.plugin.refreshPanel();
                }));

        /* ═══════ کارت‌های پلنر ═══════ */
        new Setting(containerEl)
            .setName(t(lang, 'settings_planner_cards'))
            .setDesc(t(lang, 'settings_planner_cards_desc'))
            .setHeading();

        const mkCardToggle = (
            key: 'past' | 'today' | 'tomorrow' | 'this_week' | 'next_week' | 'this_month' | 'next_month' | 'this_year' | 'next_year',
            labelKey: string
        ) => {
            new Setting(containerEl)
                .setName(t(lang, labelKey as any))
                .addToggle(tg => tg
                    .setValue(this.plugin.settings.plannerCards[key])
                    .onChange(async (v) => {
                        this.plugin.settings.plannerCards[key] = v;
                        await this.plugin.saveSettings();
                        this.plugin.refreshPanel();
                    }));
        };

        mkCardToggle('past', 'settings_planner_cards_past');
        mkCardToggle('today', 'settings_planner_cards_today');
        mkCardToggle('tomorrow', 'settings_planner_cards_tomorrow');
        mkCardToggle('this_week', 'settings_planner_cards_this_week');
        mkCardToggle('next_week', 'settings_planner_cards_next_week');
        mkCardToggle('this_month', 'settings_planner_cards_this_month');
        mkCardToggle('next_month', 'settings_planner_cards_next_month');
        mkCardToggle('this_year', 'settings_planner_cards_this_year');
        mkCardToggle('next_year', 'settings_planner_cards_next_year');

        /* ═══════ 🆕 میز من ═══════ */
        new Setting(containerEl)
            .setName(t(lang, 'settings_desktop'))
            .setHeading();

        new Setting(containerEl)
            .setName(t(lang, 'settings_desktop_enabled'))
            .setDesc(t(lang, 'settings_desktop_enabled_desc'))
            .addToggle(tg => tg
                .setValue(this.plugin.settings.desktop.enabled)
                .onChange(async (v) => {
                    this.plugin.settings.desktop.enabled = v;
                    await this.plugin.saveSettings();
                    this.plugin.refreshPanel();
                }));

        new Setting(containerEl)
            .setName(t(lang, 'settings_desktop_show_in_tasks'))
            .setDesc(t(lang, 'settings_desktop_show_in_tasks_desc'))
            .addToggle(tg => tg
                .setValue(this.plugin.settings.desktop.showInTasks)
                .onChange(async (v) => {
                    this.plugin.settings.desktop.showInTasks = v;
                    await this.plugin.saveSettings();
                    this.plugin.refreshPanel();
                }));

        new Setting(containerEl)
            .setName(t(lang, 'settings_desktop_show_in_planner'))
            .setDesc(t(lang, 'settings_desktop_show_in_planner_desc'))
            .addToggle(tg => tg
                .setValue(this.plugin.settings.desktop.showInPlanner)
                .onChange(async (v) => {
                    this.plugin.settings.desktop.showInPlanner = v;
                    await this.plugin.saveSettings();
                    this.plugin.refreshPanel();
                }));

        new Setting(containerEl)
            .setName(t(lang, 'settings_desktop_import_mode'))
            .setDesc(t(lang, 'settings_desktop_import_mode_desc'))
            .addDropdown(dd => {
                dd.addOption('move', t(lang, 'settings_desktop_import_move'));
                dd.addOption('copy', t(lang, 'settings_desktop_import_copy'));
                dd.setValue(this.plugin.settings.desktop.defaultImportMode);
                dd.onChange(async (v) => {
                    this.plugin.settings.desktop.defaultImportMode = v as 'copy' | 'move';
                    await this.plugin.saveSettings();
                });
            });

        /* ═══════ 🆕 تسک‌های تکرارشونده ═══════ */
        new Setting(containerEl)
            .setName(t(lang, 'settings_recurring'))
            .setHeading();

        new Setting(containerEl)
            .setName(t(lang, 'settings_recurring_enabled'))
            .setDesc(t(lang, 'settings_recurring_enabled_desc'))
            .addToggle(tg => tg
                .setValue(this.plugin.settings.desktop.recurringEnabled)
                .onChange(async (v) => {
                    this.plugin.settings.desktop.recurringEnabled = v;
                    await this.plugin.saveSettings();
                    this.plugin.refreshPanel();
                    this.scheduleRefresh();
                }));

        /* ─── لیست الگوها ─── */
        if (this.plugin.settings.desktop.recurringEnabled) {
            this.renderRecurringList(containerEl, lang);
        }
    }

    /* ═══════════════════════════════════════════════════════
       🆕 لیست الگوهای تکرارشونده
       ═══════════════════════════════════════════════════════ */
    private renderRecurringList(parent: HTMLElement, lang: Language): void {
        const templates = this.plugin.recurringManager.getAll();

        /* ─── اگه خالیه ─── */
        if (templates.length === 0) {
            const emptyBox = parent.createDiv({ cls: 'first-task-recurring-empty' });
            emptyBox.createEl('p', {
                text: t(lang, 'recurring_empty'),
                cls: 'first-task-recurring-empty-text',
            });
        } else {
            /* ─── لیست ─── */
            const listWrap = parent.createDiv({ cls: 'first-task-recurring-list' });

            for (const template of templates) {
                this.renderRecurringRow(listWrap, template, lang);
            }
        }

        /* ─── دکمه‌ی افزودن ─── */
        const addWrap = parent.createDiv({ cls: 'first-task-recurring-add-wrap' });
        const addBtn = addWrap.createEl('button', {
            cls: 'first-task-recurring-add-btn mod-cta',
        });
        setIcon(addBtn.createSpan({ cls: 'first-task-recurring-add-icon' }), 'plus');
        addBtn.createSpan({ text: ' ' + t(lang, 'recurring_add') });

        addBtn.onclick = () => {
            new RecurringModal(
                this.app,
                this.plugin,
                null,
                () => this.scheduleRefresh()
            ).open();
        };
    }

    /* ─── ردیف هر الگو ─── */
    private renderRecurringRow(
        parent: HTMLElement,
        template: RecurringTemplate,
        lang: Language
    ): void {
        const row = parent.createDiv({
            cls: 'first-task-recurring-row' +
                (template.active ? '' : ' is-inactive'),
        });

        /* ─── آیکون وضعیت ─── */
        const iconWrap = row.createDiv({ cls: 'first-task-recurring-row-icon' });
        const recIcon = this.getRecurrenceIcon(template.recurrence);
        setIcon(iconWrap, recIcon);

        /* ─── بدنه ─── */
        const body = row.createDiv({ cls: 'first-task-recurring-row-body' });

        const titleRow = body.createDiv({ cls: 'first-task-recurring-row-title' });
        titleRow.setText(template.title);

        const meta = body.createDiv({ cls: 'first-task-recurring-row-meta' });

        /* نوع تکرار */
        const typeLabel = this.getRecurrenceLabel(template, lang);
        meta.createSpan({ cls: 'first-task-recurring-type-badge', text: typeLabel });

        /* تاریخ شروع */
        if (template.start_date_jalali || template.start_date_gregorian) {
            const startDisplay = this.plugin.settings.useJalaliDate
                ? template.start_date_jalali
                : template.start_date_gregorian;
            meta.createSpan({
                text: ' · ' + displayString(startDisplay, lang),
            });
        }

        /* دسته */
        if (template.category) {
            const catName = this.plugin.taskManager.getCategoryDisplayName(template.category);
            meta.createSpan({ text: ' · ' + catName });
        }

        /* ─── اکشن‌ها ─── */
        const actions = row.createDiv({ cls: 'first-task-recurring-row-actions' });

        /* Toggle active */
        const toggleBtn = actions.createEl('button', {
            cls: 'clickable-icon',
        });
        setIcon(toggleBtn, template.active ? 'pause-circle' : 'play-circle');
        toggleBtn.setAttribute(
            'aria-label',
            template.active
                ? t(lang, 'recurring_deactivate')
                : t(lang, 'recurring_activate')
        );
        toggleBtn.onclick = async () => {
            await this.plugin.recurringManager.toggleActive(template.id);
            this.plugin.refreshPanel();
            this.scheduleRefresh();
        };

        /* Edit */
        const editBtn = actions.createEl('button', {
            cls: 'clickable-icon',
        });
        setIcon(editBtn, 'pencil');
        editBtn.setAttribute('aria-label', t(lang, 'btn_edit'));
        editBtn.onclick = () => {
            new RecurringModal(
                this.app,
                this.plugin,
                template,
                () => this.scheduleRefresh()
            ).open();
        };

        /* Delete */
        const delBtn = actions.createEl('button', {
            cls: 'clickable-icon mod-warning',
        });
        setIcon(delBtn, 'trash-2');
        delBtn.setAttribute('aria-label', t(lang, 'btn_delete'));
        delBtn.onclick = async () => {
            const msg = t(lang, 'recurring_delete_confirm', {
                title: template.title,
            });
            if (!window.confirm(msg)) return;

            await this.plugin.recurringManager.remove(template.id);
            this.plugin.toastManager.show(t(lang, 'recurring_deleted'), 'success');
            this.plugin.refreshPanel();
            this.scheduleRefresh();
        };
    }

    /* ─── آیکون نوع تکرار ─── */
    private getRecurrenceIcon(type: string): string {
        switch (type) {
            case 'daily': return 'sun';
            case 'weekly': return 'calendar-days';
            case 'monthly': return 'calendar';
            default: return 'repeat';
        }
    }

    /* ─── لیبل نوع تکرار ─── */
    private getRecurrenceLabel(
        template: RecurringTemplate,
        lang: Language
    ): string {
        switch (template.recurrence) {
            case 'daily':
                return t(lang, 'recurring_type_daily');
            case 'weekly': {
                if (template.weekDay === undefined) {
                    return t(lang, 'recurring_type_weekly');
                }
                const days = [
                    'weekday_sunday',
                    'weekday_monday',
                    'weekday_tuesday',
                    'weekday_wednesday',
                    'weekday_thursday',
                    'weekday_friday',
                    'weekday_saturday',
                ];
                return t(lang, days[template.weekDay] as any);
            }
            case 'monthly': {
                if (template.monthDay === undefined) {
                    return t(lang, 'recurring_type_monthly');
                }
                return `${t(lang, 'recurring_type_monthly')} (${template.monthDay})`;
            }
            default:
                return '';
        }
    }

    private parseFolders(input: string): string[] {
        return input
            .split(',')
            .map(s => s.trim().replace(/^\/+|\/+$/g, ''))
            .filter(s => s.length > 0);
    }
}
