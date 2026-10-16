/* ════════════════════════════════════════════════════════════
   ⚙️ تب تنظیمات — v0.2.1
   ✅ رفع کامل باگ پرش اسکرول
   ✅ visibility toggle به‌جای rebuild
   ✅ بخش‌های disabled کم‌رنگ + غیرقابل کلیک
   ✅ موبایل + دسکتاپ
   ════════════════════════════════════════════════════════════ */

import { App, PluginSettingTab, Setting, setIcon } from 'obsidian';
import type FirstTaskPlugin from '../main';
import type {
    Language,
    WeekStartDay,
    RecurringTemplate,
} from '../types';
import { t, applyDirection } from '../i18n';
import { RecurringModal } from '../views/RecurringModal';
import { displayString, displayNumber } from '../utils/numberUtils';

export class FirstTaskSettingsTab extends PluginSettingTab {
    plugin: FirstTaskPlugin;
    private refreshTimer: number | null = null;

    /* container های بخش‌های داینامیک */
    private recurringDetailsEl: HTMLElement | null = null;
    private archiveDetailsEl: HTMLElement | null = null;

    constructor(app: App, plugin: FirstTaskPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    /* ─── فقط برای تغییرات واقعی (زبان / add-delete الگو) ─── */
    private scheduleRefresh(): void {
        if (this.refreshTimer !== null) {
            window.clearTimeout(this.refreshTimer);
        }
        this.refreshTimer = window.setTimeout(() => {
            this.refreshTimer = null;
            this.display();
        }, 50);
    }

    /* ─── toggle visibility بدون rebuild ─── */
    private updateRecurringVisibility(): void {
        if (!this.recurringDetailsEl) return;
        const enabled = this.plugin.settings.desktop.recurringEnabled;
        this.recurringDetailsEl.classList.toggle('is-hidden', !enabled);
    }

    private updateArchiveVisibility(): void {
        if (!this.archiveDetailsEl) return;
        const enabled = this.plugin.settings.desktop.autoArchiveEnabled;
        this.archiveDetailsEl.classList.toggle('is-hidden', !enabled);
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
                    /* 🆕 زبان تغییر می‌کند → rebuild لازم است */
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

        /* ═══════ میز من ═══════ */
        new Setting(containerEl).setName(t(lang, 'settings_desktop')).setHeading();

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

        /* ═══════ تسک‌های تکرارشونده ═══════ */
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
                    /* 🆕 فقط visibility عوض می‌شود، نه rebuild */
                    this.updateRecurringVisibility();
                }));

        /* 🆕 container داینامیک — همیشه ساخته می‌شود */
        this.recurringDetailsEl = containerEl.createDiv({
            cls: 'first-task-settings-dynamic',
        });
        this.renderRecurringList(this.recurringDetailsEl, lang);
        this.updateRecurringVisibility();

        /* ═══════ پیشنهادهای هوشمند ═══════ */
        new Setting(containerEl)
            .setName(t(lang, 'settings_suggestions'))
            .setHeading();

        new Setting(containerEl)
            .setName(t(lang, 'settings_suggestions_enabled'))
            .setDesc(t(lang, 'settings_suggestions_enabled_desc'))
            .addToggle(tg => tg
                .setValue(this.plugin.settings.desktop.suggestionsEnabled)
                .onChange(async (v) => {
                    this.plugin.settings.desktop.suggestionsEnabled = v;
                    await this.plugin.saveSettings();
                    this.plugin.refreshPanel();
                }));

        /* ═══════ آرشیو خودکار ═══════ */
        new Setting(containerEl)
            .setName(t(lang, 'settings_archive'))
            .setHeading();

        new Setting(containerEl)
            .setName(t(lang, 'settings_archive_enabled'))
            .setDesc(t(lang, 'settings_archive_enabled_desc'))
            .addToggle(tg => tg
                .setValue(this.plugin.settings.desktop.autoArchiveEnabled)
                .onChange(async (v) => {
                    this.plugin.settings.desktop.autoArchiveEnabled = v;
                    await this.plugin.saveSettings();
                    /* 🆕 فقط visibility عوض می‌شود، نه rebuild */
                    this.updateArchiveVisibility();
                }));

        /* 🆕 container داینامیک — همیشه ساخته می‌شود */
        this.archiveDetailsEl = containerEl.createDiv({
            cls: 'first-task-settings-dynamic',
        });
        this.renderArchiveDetails(this.archiveDetailsEl, lang);
        this.updateArchiveVisibility();
    }

    /* ═══════════════════════════════════════════════════════
       Recurring List — داخل container
       ═══════════════════════════════════════════════════════ */
    private renderRecurringList(parent: HTMLElement, lang: Language): void {
        const templates = this.plugin.recurringManager.getAll();

        if (templates.length === 0) {
            const emptyBox = parent.createDiv({ cls: 'first-task-recurring-empty' });
            emptyBox.createEl('p', {
                text: t(lang, 'recurring_empty'),
                cls: 'first-task-recurring-empty-text',
            });
        } else {
            const listWrap = parent.createDiv({ cls: 'first-task-recurring-list' });
            for (const template of templates) {
                this.renderRecurringRow(listWrap, template, lang);
            }
        }

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

    private renderRecurringRow(
        parent: HTMLElement,
        template: RecurringTemplate,
        lang: Language
    ): void {
        const row = parent.createDiv({
            cls: 'first-task-recurring-row' +
                (template.active ? '' : ' is-inactive'),
        });

        const iconWrap = row.createDiv({ cls: 'first-task-recurring-row-icon' });
        const recIcon = this.getRecurrenceIcon(template.recurrence);
        setIcon(iconWrap, recIcon);

        const body = row.createDiv({ cls: 'first-task-recurring-row-body' });
        const titleRow = body.createDiv({ cls: 'first-task-recurring-row-title' });
        titleRow.setText(template.title);

        const meta = body.createDiv({ cls: 'first-task-recurring-row-meta' });
        const typeLabel = this.getRecurrenceLabel(template, lang);
        meta.createSpan({ cls: 'first-task-recurring-type-badge', text: typeLabel });

        if (template.start_date_jalali || template.start_date_gregorian) {
            const startDisplay = this.plugin.settings.useJalaliDate
                ? template.start_date_jalali
                : template.start_date_gregorian;
            meta.createSpan({
                text: ' · ' + displayString(startDisplay, lang),
            });
        }

        if (template.category) {
            const catName = this.plugin.taskManager.getCategoryDisplayName(template.category);
            meta.createSpan({ text: ' · ' + catName });
        }

        const actions = row.createDiv({ cls: 'first-task-recurring-row-actions' });

        const toggleBtn = actions.createEl('button', { cls: 'clickable-icon' });
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

        const editBtn = actions.createEl('button', { cls: 'clickable-icon' });
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

    /* ═══════════════════════════════════════════════════════
       Archive Details — داخل container
       ═══════════════════════════════════════════════════════ */
    private renderArchiveDetails(parent: HTMLElement, lang: Language): void {
        new Setting(parent)
            .setName(t(lang, 'settings_archive_count'))
            .setDesc(t(lang, 'settings_archive_count_desc'))
            .addDropdown(dd => {
                const options = [100, 500, 1000, 2000];
                for (const n of options) {
                    dd.addOption(String(n), displayNumber(n, lang));
                }
                dd.setValue(String(this.plugin.settings.desktop.autoArchiveCount));
                dd.onChange(async (v) => {
                    this.plugin.settings.desktop.autoArchiveCount = parseInt(v);
                    await this.plugin.saveSettings();
                });
            });

        new Setting(parent)
            .setName(t(lang, 'settings_archive_days'))
            .setDesc(t(lang, 'settings_archive_days_desc'))
            .addDropdown(dd => {
                dd.addOption('30', t(lang, 'archive_days_30'));
                dd.addOption('60', t(lang, 'archive_days_60'));
                dd.addOption('90', t(lang, 'archive_days_90'));
                dd.addOption('180', t(lang, 'archive_days_180'));
                dd.addOption('365', t(lang, 'archive_days_365'));
                dd.setValue(String(this.plugin.settings.desktop.autoArchiveDays));
                dd.onChange(async (v) => {
                    this.plugin.settings.desktop.autoArchiveDays = parseInt(v) as 30 | 60 | 90 | 180 | 365;
                    await this.plugin.saveSettings();
                });
            });

        new Setting(parent)
            .setName(t(lang, 'settings_archive_mode'))
            .setDesc(t(lang, 'settings_archive_mode_desc'))
            .addDropdown(dd => {
                dd.addOption('threshold', t(lang, 'archive_mode_threshold'));
                dd.addOption('always', t(lang, 'archive_mode_always'));
                dd.setValue(this.plugin.settings.desktop.autoArchiveMode);
                dd.onChange(async (v) => {
                    this.plugin.settings.desktop.autoArchiveMode = v as 'threshold' | 'always';
                    await this.plugin.saveSettings();
                });
            });

        const lastTs = this.plugin.archiveManager.getLastArchiveTs();
        const statusText = lastTs > 0
            ? t(lang, 'archive_last_run', {
                date: displayString(this.formatDate(lastTs), lang),
            })
            : t(lang, 'archive_never_run');

        new Setting(parent)
            .setName(t(lang, 'archive_run_now'))
            .setDesc(statusText)
            .addButton(btn => btn
                .setButtonText(t(lang, 'archive_run_now'))
                .setCta()
                .onClick(async () => {
                    await this.handleManualArchive();
                }));
    }

    private async handleManualArchive(): Promise<void> {
        const lang = this.plugin.settings.language;

        try {
            const result = await this.plugin.archiveManager.runAutoArchive(
                this.plugin.settings.desktop
            );

            if (result.archived > 0) {
                this.plugin.toastManager.show(
                    t(lang, 'notice_archive_success', {
                        count: displayNumber(result.archived, lang),
                    }),
                    'success'
                );
            } else if (result.reason === 'no_candidates') {
                this.plugin.toastManager.show(t(lang, 'notice_archive_none'), 'info');
            } else if (result.reason === 'threshold_not_reached') {
                this.plugin.toastManager.show(t(lang, 'notice_archive_skipped'), 'info');
            }

            this.plugin.refreshPanel();
            /* 🆕 فقط برای آپدیت status text */
            this.scheduleRefresh();
        } catch (e) {
            console.warn('[First Task] Manual archive failed:', e);
        }
    }

    private getRecurrenceIcon(type: string): string {
        switch (type) {
            case 'daily': return 'sun';
            case 'weekly': return 'calendar-days';
            case 'monthly': return 'calendar';
            default: return 'repeat';
        }
    }

    private getRecurrenceLabel(template: RecurringTemplate, lang: Language): string {
        switch (template.recurrence) {
            case 'daily':
                return t(lang, 'recurring_type_daily');

            case 'weekly': {
                const mode = template.weeklyMode;

                if (mode === 'every-day') {
                    return t(lang, 'recurring_weekly_mode_every_day');
                }

                let days: number[] = [];
                if (template.weekDays && template.weekDays.length > 0) {
                    days = template.weekDays;
                } else if (template.weekDay !== undefined) {
                    days = [template.weekDay];
                }

                if (days.length === 0) {
                    return t(lang, 'recurring_type_weekly');
                }

                if (days.length === 1) {
                    const keys = [
                        'weekday_sunday', 'weekday_monday', 'weekday_tuesday',
                        'weekday_wednesday', 'weekday_thursday', 'weekday_friday',
                        'weekday_saturday',
                    ];
                    return t(lang, keys[days[0]] as any);
                }

                return days.length + ' × ' + t(lang, 'recurring_type_weekly');
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

    private formatDate(ts: number): string {
        const d = new Date(ts);
        if (this.plugin.settings.useJalaliDate) {
            return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
        }
        return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    }

    private parseFolders(input: string): string[] {
        return input
            .split(',')
            .map(s => s.trim().replace(/^\/+|\/+$/g, ''))
            .filter(s => s.length > 0);
    }
}
