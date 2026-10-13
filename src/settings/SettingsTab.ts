/* ════════════════════════════════════════════════════════════
   ⚙️ تب تنظیمات — v0.1.2
   ✅ شروع هفته (شنبه/یکشنبه/دوشنبه)
   ✅ نمایش badge ها (پیش‌فرض خاموش)
   ✅ کارت‌های پلنر (قابل تنظیم)
   ════════════════════════════════════════════════════════════ */

import { App, PluginSettingTab, Setting } from 'obsidian';
import type FirstTaskPlugin from '../main';
import type { Language, WeekStartDay } from '../types';
import { t, applyDirection } from '../i18n';

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

        /* ─── شروع هفته (۳ گزینه) ─── */
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
            key: 'past' | 'today' | 'tomorrow' | 'this_week' | 'this_month' | 'this_year',
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
        mkCardToggle('this_month', 'settings_planner_cards_this_month');
        mkCardToggle('this_year', 'settings_planner_cards_this_year');
    }

    private parseFolders(input: string): string[] {
        return input
            .split(',')
            .map(s => s.trim().replace(/^\/+|\/+$/g, ''))
            .filter(s => s.length > 0);
    }
}
