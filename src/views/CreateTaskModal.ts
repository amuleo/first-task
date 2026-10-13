/* ════════════════════════════════════════════════════════════
   ➕ مودال ساخت تسک جدید — v0.1.2
   ✅ Suggest هوشمند (active + mtime)
   ✅ تاریخ پیش‌فرض = امروز
   ✅ اعداد داینامیک
   ════════════════════════════════════════════════════════════ */

import {
    App, Modal, Setting, TFile, AbstractInputSuggest,
    TextComponent, TextAreaComponent, DropdownComponent,
} from 'obsidian';
import type FirstTaskPlugin from '../main';
import { t, applyDirection } from '../i18n';
import { parseDateInput, getTodayDateInput } from '../utils/jalaliDate';
import { displayString } from '../utils/numberUtils';

/* ═══════════════════════════════════════════════════════
   🎯 Suggest هوشمند
   ═══════════════════════════════════════════════════════ */
class NoteSuggest extends AbstractInputSuggest<TFile> {
    private plugin: FirstTaskPlugin;
    private selectCallback: (file: TFile) => void;

    constructor(
        app: App,
        inputEl: HTMLInputElement,
        plugin: FirstTaskPlugin,
        selectCallback: (file: TFile) => void
    ) {
        super(app, inputEl);
        this.plugin = plugin;
        this.selectCallback = selectCallback;
    }

    getSuggestions(query: string): TFile[] {
        const files = this.plugin.taskManager.getScannableFiles();
        const lowerQuery = (query || '').toLowerCase();
        const activeFile = this.app.workspace.getActiveFile();
        const activePath = activeFile?.path || '';

        /* ─── مرتب: active اول، بعد mtime ─── */
        const sorted = [...files].sort((a, b) => {
            if (a.path === activePath) return -1;
            if (b.path === activePath) return 1;
            return b.stat.mtime - a.stat.mtime;
        });

        let filtered = sorted;
        if (lowerQuery) {
            filtered = sorted.filter(f => f.path.toLowerCase().includes(lowerQuery));
        }
        return filtered.slice(0, 20);
    }

    renderSuggestion(file: TFile, el: HTMLElement): void {
        const activeFile = this.app.workspace.getActiveFile();
        const isActive = activeFile?.path === file.path;
        const name = file.path.split('/').pop() || file.path;
        const folder = file.parent?.path || '';

        const container = el.createDiv({ cls: 'first-task-suggest-item' });
        const nameRow = container.createDiv({ cls: 'first-task-suggest-name' });
        if (isActive) {
            nameRow.createSpan({ cls: 'first-task-suggest-active-dot', text: '● ' });
        }
        nameRow.createSpan({ text: name });

        if (folder && folder !== '/') {
            container.createDiv({ text: folder, cls: 'first-task-suggest-path' });
        }
    }

    selectSuggestion(file: TFile): void {
        this.selectCallback(file);
        this.close();
    }
}

/* ═══════════════════════════════════════════════════════
   ➕ مودال
   ═══════════════════════════════════════════════════════ */
export class CreateTaskModal extends Modal {
    plugin: FirstTaskPlugin;
    onDone: () => void;
    private submitting = false;

    private titleComponent: TextComponent | null = null;
    private descriptionComponent: TextAreaComponent | null = null;
    private dateComponent: TextComponent | null = null;
    private categoryComponent: DropdownComponent | null = null;
    private fileInputEl: HTMLInputElement | null = null;
    private sourceFile: string = '';

    constructor(app: App, plugin: FirstTaskPlugin, onDone: () => void) {
        super(app);
        this.plugin = plugin;
        this.onDone = onDone;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('first-task-modal-content');

        const lang = this.plugin.settings.language;
        applyDirection(contentEl, lang);

        contentEl.createEl('h3', {
            text: t(lang, 'create_title'),
            cls: 'first-task-modal-title',
        });

        /* ─── عنوان ─── */
        new Setting(contentEl)
            .setName(t(lang, 'field_title'))
            .addText(text => {
                this.titleComponent = text;
                text.setPlaceholder(t(lang, 'field_title_placeholder'));
                setTimeout(() => text.inputEl.focus(), 50);
            });

        /* ─── توضیحات ─── */
        new Setting(contentEl)
            .setName(t(lang, 'field_description'))
            .addTextArea(ta => {
                this.descriptionComponent = ta;
                ta.setPlaceholder(t(lang, 'field_description_placeholder'));
                ta.inputEl.rows = 3;
                ta.inputEl.style.width = '100%';
            });

        /* ─── تاریخ (پیش‌فرض امروز) ─── */
        new Setting(contentEl)
            .setName(t(lang, 'field_due_date'))
            .addText(text => {
                this.dateComponent = text;
                const useJalali = this.plugin.settings.useJalaliDate;
                const today = getTodayDateInput(useJalali);
                text.setValue(displayString(today, lang));
                text.inputEl.dir = 'ltr';
                text.setPlaceholder(useJalali ? '1405/07/25' : '2026-10-15');
            });

        /* ─── دسته‌بندی ─── */
        if (this.plugin.settings.enableCategories) {
            const cats = this.plugin.taskManager.getCategories();
            new Setting(contentEl)
                .setName(t(lang, 'field_category'))
                .addDropdown(dd => {
                    this.categoryComponent = dd;
                    dd.addOption('', t(lang, 'panel_no_category'));
                    for (const c of cats) {
                        const label = lang === 'fa' ? c.name_fa : c.name;
                        dd.addOption(c.id, label);
                    }
                    dd.setValue('');
                });
        }

        /* ─── فایل مبدأ با Suggest ─── */
        const files = this.plugin.taskManager.getScannableFiles();
        this.sourceFile = this.getSmartDefaultFile(files);

        const sourceSetting = new Setting(contentEl)
            .setName(t(lang, 'field_source_file'))
            .setDesc(t(lang, 'field_source_file_hint'));

        sourceSetting.addText(text => {
            this.fileInputEl = text.inputEl;
            text.setValue(this.sourceFile);
            text.inputEl.style.width = '100%';

            new NoteSuggest(this.app, text.inputEl, this.plugin, (file) => {
                this.sourceFile = file.path;
                text.setValue(file.path);
            });

            text.onChange(v => { this.sourceFile = v.trim(); });
        });

        /* ─── دکمه‌ها ─── */
        const btnRow = contentEl.createDiv({ cls: 'first-task-modal-buttons-stack' });

        const cancel = btnRow.createEl('button', { text: t(lang, 'btn_cancel') });
        cancel.onclick = () => this.close();

        const save = btnRow.createEl('button', {
            text: t(lang, 'btn_create'),
            cls: 'mod-cta',
        });
        save.onclick = () => this.submit();
    }

    /* ═══════════════════════════════════════════════════════
       🎯 انتخاب نوت پیش‌فرض هوشمند
       ═══════════════════════════════════════════════════════ */
    private getSmartDefaultFile(files: TFile[]): string {
        if (files.length === 0) return '';

        /* ۱. نوت فعلی */
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile && activeFile.extension === 'md') {
            const exists = files.find(f => f.path === activeFile.path);
            if (exists) return activeFile.path;
        }

        /* ۲. آخرین نوت فعال */
        const lastOpen = this.app.workspace.getLastOpenFiles();
        for (const path of lastOpen) {
            const found = files.find(f => f.path === path);
            if (found) return found.path;
        }

        /* ۳. inbox.md */
        const inbox = files.find(f => /(^|\/)inbox\.md$/i.test(f.path));
        if (inbox) return inbox.path;

        /* ۴. جدیدترین */
        const sorted = [...files].sort((a, b) => b.stat.mtime - a.stat.mtime);
        return sorted[0]?.path || '';
    }

    private async submit(): Promise<void> {
        if (this.submitting) return;
        const lang = this.plugin.settings.language;

        const title = (this.titleComponent?.inputEl.value ?? '').trim();
        const description = (this.descriptionComponent?.inputEl.value ?? '').trim();
        const dateInput = (this.dateComponent?.inputEl.value ?? '').trim();
        const category = this.categoryComponent?.getValue() ?? '';

        if (!title) {
            this.plugin.toastManager.show(t(lang, 'notice_no_title'), 'warning');
            return;
        }

        const sourceFile = this.sourceFile || (this.fileInputEl?.value ?? '').trim();
        if (!sourceFile) {
            this.plugin.toastManager.show(t(lang, 'notice_no_file'), 'warning');
            return;
        }

        let dueJalali = '';
        let dueGregorian = '';
        let dueTs = 0;

        if (dateInput) {
            const parsed = parseDateInput(dateInput, this.plugin.settings.useJalaliDate);
            if (!parsed) {
                this.plugin.toastManager.show(t(lang, 'notice_invalid_date'), 'warning');
                return;
            }
            dueJalali = parsed.jalali;
            dueGregorian = parsed.gregorian;
            dueTs = parsed.ts;
        }

        this.submitting = true;

        const ok = await this.plugin.taskManager.createTask(
            title,
            sourceFile,
            description,
            category,
            dueJalali,
            dueGregorian,
            dueTs
        );

        if (ok) {
            this.plugin.toastManager.show(t(lang, 'notice_task_created'), 'success');
            this.onDone();
            this.close();
        } else {
            this.submitting = false;
            this.plugin.toastManager.show(
                lang === 'fa' ? 'تسک ساخته نشد' : 'Could not create task',
                'error'
            );
        }
    }

    onClose(): void { this.contentEl.empty(); }
}
