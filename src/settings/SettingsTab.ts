/* ════════════════════════════════════════════════════════════
   ⚙️ تب تنظیمات First Task — v0.1.2
   ✅ حذف groupByNote (چون حذف شد)
   ✅ حذف showNoteInModal (چون همیشه نمایش داده می‌شه)
   ════════════════════════════════════════════════════════════ */

import { App, PluginSettingTab, Setting } from 'obsidian';
import type FirstTaskPlugin from '../main';
import type { Language } from '../types';
import { t, applyDirection } from '../i18n';

export class FirstTaskSettingsTab extends PluginSettingTab {
    plugin: FirstTaskPlugin;
    private refreshTimer: number | null = null;

    constructor(app: App, plugin: FirstTaskPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    /* رفرش با تأخیر کوچیک */
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

        /* ═══════ نمایش ═══════ */
        new Setting(containerEl).setName(t(lang, 'settings_display')).setHeading();

        new Setting(containerEl)
            .setName(t(lang, 'settings_tasks_per_page'))
            .setDesc(t(lang, 'settings_tasks_per_page_desc'))
            .addDropdown(dd => {
                const options = [10, 20, 30, 50, 100];
                for (const n of options) {
                    dd.addOption(String(n), String(n));
                }
                let current = this.plugin.settings.tasksPerPage;
                if (!options.includes(current)) current = 20;
                dd.setValue(String(current));
                dd.onChange(async (v) => {
                    this.plugin.settings.tasksPerPage = parseInt(v) || 20;
                    await this.plugin.saveSettings();
                    this.plugin.refreshPanel();
                });
            });

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

        /* ─── دسته‌بندی‌های داینامیک ─── */
        new Setting(containerEl)
            .setName(t(lang, 'settings_dynamic_categories'))
            .setDesc(t(lang, 'settings_dynamic_categories_desc'))
            .setHeading();

        new Setting(containerEl)
            .setName(t(lang, 'settings_dynamic_tomorrow'))
            .addToggle(tg => tg
                .setValue(this.plugin.settings.dynamicCategories.tomorrow)
                .onChange(async (v) => {
                    this.plugin.settings.dynamicCategories.tomorrow = v;
                    await this.plugin.saveSettings();
                    this.plugin.refreshPanel();
                }));

        new Setting(containerEl)
            .setName(t(lang, 'settings_dynamic_this_week'))
            .addToggle(tg => tg
                .setValue(this.plugin.settings.dynamicCategories.this_week)
                .onChange(async (v) => {
                    this.plugin.settings.dynamicCategories.this_week = v;
                    await this.plugin.saveSettings();
                    this.plugin.refreshPanel();
                }));

        new Setting(containerEl)
            .setName(t(lang, 'settings_dynamic_this_month'))
            .addToggle(tg => tg
                .setValue(this.plugin.settings.dynamicCategories.this_month)
                .onChange(async (v) => {
                    this.plugin.settings.dynamicCategories.this_month = v;
                    await this.plugin.saveSettings();
                    this.plugin.refreshPanel();
                }));

        new Setting(containerEl)
            .setName(t(lang, 'settings_dynamic_this_year'))
            .addToggle(tg => tg
                .setValue(this.plugin.settings.dynamicCategories.this_year)
                .onChange(async (v) => {
                    this.plugin.settings.dynamicCategories.this_year = v;
                    await this.plugin.saveSettings();
                    this.plugin.refreshPanel();
                }));
    }

    /* تبدیل لیست پوشه‌ها */
    private parseFolders(input: string): string[] {
        return input
            .split(',')
            .map(s => s.trim().replace(/^\/+|\/+$/g, ''))
            .filter(s => s.length > 0);
    }
}
