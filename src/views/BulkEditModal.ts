/* ════════════════════════════════════════════════════════════
   ✏️ Bulk Edit Modal — ویرایش گروهی
   ✅ دسته‌بندی، تاریخ، پین، انتقال به نوت
   ✅ هر فیلد یه toggle جدا برای فعال/غیرفعال
   ════════════════════════════════════════════════════════════ */

import {
    App, Modal, Setting, TFile, AbstractInputSuggest,
} from 'obsidian';
import type FirstTaskPlugin from '../main';
import type { BulkUpdates } from '../types';
import { t, applyDirection } from '../i18n';
import { parseDateInput } from '../utils/jalaliDate';
import { displayString } from '../utils/numberUtils';
import { DateSuggest } from './DateSuggest';

/* ═══════════════════════════════════════════════════════
   NoteSuggest
   ═══════════════════════════════════════════════════════ */
class NoteSuggest extends AbstractInputSuggest<TFile> {
    private plugin: FirstTaskPlugin;
    private selectCallback: (file: TFile) => void;

    constructor(app: App, inputEl: HTMLInputElement, plugin: FirstTaskPlugin, selectCallback: (file: TFile) => void) {
        super(app, inputEl);
        this.plugin = plugin;
        this.selectCallback = selectCallback;
    }

    getSuggestions(query: string): TFile[] {
        const files = this.plugin.taskManager.getScannableFiles();
        const lower = (query || '').toLowerCase();
        const active = this.app.workspace.getActiveFile();
        const activePath = active?.path || '';

        const sorted = [...files].sort((a, b) => {
            if (a.path === activePath) return -1;
            if (b.path === activePath) return 1;
            return b.stat.mtime - a.stat.mtime;
        });

        let result = sorted;
        if (lower) result = sorted.filter(f => f.path.toLowerCase().includes(lower));
        return result.slice(0, 20);
    }

    renderSuggestion(file: TFile, el: HTMLElement): void {
        const name = file.path.split('/').pop() || file.path;
        const folder = file.parent?.path || '';
        const c = el.createDiv({ cls: 'first-task-suggest-item' });
        c.createDiv({ cls: 'first-task-suggest-name', text: name });
        if (folder && folder !== '/') {
            c.createDiv({ cls: 'first-task-suggest-path', text: folder });
        }
    }

    selectSuggestion(file: TFile): void {
        this.selectCallback(file);
        this.close();
    }
}

/* ═══════════════════════════════════════════════════════
   Bulk Edit Modal
   ═══════════════════════════════════════════════════════ */
export class BulkEditModal extends Modal {
    plugin: FirstTaskPlugin;
    taskIds: string[];
    onDone: () => void;
    private busy = false;

    private updates: BulkUpdates;

    constructor(
        app: App,
        plugin: FirstTaskPlugin,
        taskIds: string[],
        onDone: () => void
    ) {
        super(app);
        this.plugin = plugin;
        this.taskIds = taskIds;
        this.onDone = onDone;

        this.updates = {
            applyCategory: false,
            category: '',
            applyDate: false,
            dueDateJalali: '',
            dueDateGregorian: '',
            dueDateTs: 0,
            applyPin: false,
            pinned: true,
            applyNote: false,
            targetFile: '',
        };
    }

    onOpen(): void { this.render(); }

    private render(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('first-task-modal-content');

        const lang = this.plugin.settings.language;
        applyDirection(contentEl, lang);

        contentEl.createEl('h3', {
            text: t(lang, 'bulk_edit_title'),
            cls: 'first-task-modal-title',
        });

        /* ─── خلاصه ─── */
        const count = this.taskIds.length;
        const summary = contentEl.createDiv({ cls: 'first-task-bulk-summary' });
        summary.setText(t(lang, 'bulk_selected_count', { count: String(count) }));

        /* ═══════ دسته‌بندی ═══════ */
        if (this.plugin.settings.enableCategories) {
            const catSetting = new Setting(contentEl)
                .setName(t(lang, 'bulk_field_category'))
                .addToggle(tg => tg
                    .setValue(this.updates.applyCategory)
                    .onChange(v => {
                        this.updates.applyCategory = v;
                        this.render();
                    }));

            if (this.updates.applyCategory) {
                const cats = this.plugin.taskManager.getCategories();
                new Setting(contentEl)
                    .addDropdown(dd => {
                        dd.addOption('', t(lang, 'panel_no_category'));
                        for (const c of cats) {
                            const label = lang === 'fa' ? c.name_fa : c.name;
                            dd.addOption(c.id, label);
                        }
                        dd.setValue(this.updates.category);
                        dd.onChange(v => { this.updates.category = v; });
                    });
            }
        }

        /* ═══════ تاریخ انجام ═══════ */
        new Setting(contentEl)
            .setName(t(lang, 'bulk_field_date'))
            .addToggle(tg => tg
                .setValue(this.updates.applyDate)
                .onChange(v => {
                    this.updates.applyDate = v;
                    this.render();
                }));

        if (this.updates.applyDate) {
            new Setting(contentEl)
                .addText(text => {
                    const useJalali = this.plugin.settings.useJalaliDate;
                    text.setValue(displayString(this.updates.dueDateJalali || this.updates.dueDateGregorian, lang));
                    text.inputEl.dir = 'ltr';
                    text.setPlaceholder(useJalali ? '1405/07/25' : '2026-10-15');

                    new DateSuggest(this.app, text.inputEl, this.plugin, (dateStr) => {
                        const parsed = parseDateInput(dateStr, useJalali);
                        if (parsed) {
                            this.updates.dueDateJalali = parsed.jalali;
                            this.updates.dueDateGregorian = parsed.gregorian;
                            this.updates.dueDateTs = parsed.ts;
                            text.setValue(displayString(dateStr, lang));
                        }
                    });

                    text.onChange(v => {
                        const parsed = parseDateInput(v, useJalali);
                        if (parsed) {
                            this.updates.dueDateJalali = parsed.jalali;
                            this.updates.dueDateGregorian = parsed.gregorian;
                            this.updates.dueDateTs = parsed.ts;
                        } else {
                            this.updates.dueDateJalali = '';
                            this.updates.dueDateGregorian = '';
                            this.updates.dueDateTs = 0;
                        }
                    });
                });
        }

        /* ═══════ پین ═══════ */
        new Setting(contentEl)
            .setName(t(lang, 'bulk_field_pin'))
            .addToggle(tg => tg
                .setValue(this.updates.applyPin)
                .onChange(v => {
                    this.updates.applyPin = v;
                    this.render();
                }));

        if (this.updates.applyPin) {
            new Setting(contentEl)
                .setName(t(lang, 'bulk_pin_value'))
                .addDropdown(dd => {
                    dd.addOption('true', t(lang, 'bulk_pin_on'));
                    dd.addOption('false', t(lang, 'bulk_pin_off'));
                    dd.setValue(this.updates.pinned ? 'true' : 'false');
                    dd.onChange(v => { this.updates.pinned = v === 'true'; });
                });
        }

        /* ═══════ انتقال به نوت ═══════ */
        new Setting(contentEl)
            .setName(t(lang, 'bulk_field_note'))
            .setDesc(t(lang, 'bulk_field_note_hint'))
            .addToggle(tg => tg
                .setValue(this.updates.applyNote)
                .onChange(v => {
                    this.updates.applyNote = v;
                    this.render();
                }));

        if (this.updates.applyNote) {
            new Setting(contentEl)
                .addText(text => {
                    text.setValue(this.updates.targetFile);
                    text.inputEl.style.width = '100%';

                    new NoteSuggest(this.app, text.inputEl, this.plugin, (file) => {
                        this.updates.targetFile = file.path;
                        text.setValue(file.path);
                    });

                    text.onChange(v => { this.updates.targetFile = v.trim(); });
                });
        }

        /* ═══════ دکمه‌ها ═══════ */
        const actions = contentEl.createDiv({ cls: 'first-task-modal-buttons' });

        const cancelBtn = actions.createEl('button', { text: t(lang, 'btn_cancel') });
        cancelBtn.onclick = () => this.close();

        const applyBtn = actions.createEl('button', {
            text: t(lang, 'bulk_apply'),
            cls: 'mod-cta',
        });
        applyBtn.onclick = () => this.handleApply();
    }

    private async handleApply(): Promise<void> {
        if (this.busy) return;

        const lang = this.plugin.settings.language;

        /* ─── چک کن حداقل یه فیلد فعاله ─── */
        const anyActive =
            this.updates.applyCategory ||
            this.updates.applyDate ||
            this.updates.applyPin ||
            this.updates.applyNote;

        if (!anyActive) {
            this.plugin.toastManager.show(
                lang === 'fa' ? 'هیچ فیلدی فعال نیست' : 'No field is enabled',
                'warning'
            );
            return;
        }

        /* ─── اگه انتقال به نوت فعاله ولی نوت انتخاب نشده ─── */
        if (this.updates.applyNote && !this.updates.targetFile) {
            this.plugin.toastManager.show(t(lang, 'notice_no_file'), 'warning');
            return;
        }

        this.busy = true;

        try {
            await this.plugin.taskManager.bulkUpdate(this.taskIds, this.updates);
            this.plugin.toastManager.show(t(lang, 'notice_bulk_updated'), 'success');
            this.onDone();
            this.close();
        } catch (e: any) {
            this.busy = false;
            this.plugin.toastManager.show(
                lang === 'fa' ? 'ویرایش گروهی ناموفق' : 'Bulk update failed',
                'error'
            );
        }
    }

    onClose(): void { this.contentEl.empty(); }
}
