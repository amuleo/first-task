/* ════════════════════════════════════════════════════════════
   ➕ مودال ساخت تسک جدید
   ✅ خوندن مستقیم از inputEl.value در لحظه submit
   ✅ دکمه‌ها ستونی، تمام عرض
   ✅ انتخاب نوت مبدأ
   ════════════════════════════════════════════════════════════ */

import { App, Modal, Setting, TextComponent, TextAreaComponent, DropdownComponent, TFile } from 'obsidian';
import type FirstTaskPlugin from '../main';
import { t, applyDirection } from '../i18n';
import { parseIsoInput, isValidDateInput } from '../utils/jalaliDate';

export class CreateTaskModal extends Modal {
    plugin: FirstTaskPlugin;
    onDone: () => void;
    private submitting = false;

    private titleComponent: TextComponent | null = null;
    private descriptionComponent: TextAreaComponent | null = null;
    private dateComponent: TextComponent | null = null;
    private categoryComponent: TextComponent | null = null;
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

        /* ─── تاریخ ─── */
        new Setting(contentEl)
            .setName(t(lang, 'field_due_date'))
            .addText(text => {
                this.dateComponent = text;
                const ph = this.plugin.settings.useJalaliDate
                    ? t(lang, 'field_due_date_placeholder')
                    : 'YYYY-MM-DD';
                text.setPlaceholder(ph);
                text.inputEl.dir = 'ltr';
            });

        /* ─── دسته‌بندی ─── */
        if (this.plugin.settings.enableCategories) {
            new Setting(contentEl)
                .setName(t(lang, 'field_category'))
                .addText(text => {
                    this.categoryComponent = text;
                    text.setPlaceholder(t(lang, 'field_category_placeholder'));
                });
        }

        /* ─── فایل مبدأ ─── */
        const files = this.getAvailableFiles();
        const defaultFile = this.getDefaultFile(files);

        new Setting(contentEl)
            .setName(t(lang, 'field_source_file'))
            .setDesc(t(lang, 'field_source_file_hint'))
            .addDropdown(dd => {
                for (const f of files) {
                    dd.addOption(f.path, f.path);
                }
                dd.setValue(defaultFile);
                this.sourceFile = defaultFile;
                dd.onChange(v => { this.sourceFile = v; });
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

    /* ─── لیست فایل‌های قابل انتخاب ─── */
    private getAvailableFiles(): TFile[] {
        const files = this.plugin.taskManager.getScannableFiles();
        /* ─── مرتب بر اساس مسیر ─── */
        return files.sort((a, b) => a.path.localeCompare(b.path, 'fa'));
    }

    /* ─── فایل پیش‌فرض (inbox یا اولین فایل) ─── */
    private getDefaultFile(files: TFile[]): string {
        if (files.length === 0) return '';

        /* ─── اگه inbox هست، اونو انتخاب کن ─── */
        const inbox = files.find(f => /^inbox\.md$/i.test(f.path));
        if (inbox) return inbox.path;

        /* ─── اگه inbox توی ریشه نبود، تو هر پوشه بگرد ─── */
        const inboxAny = files.find(f => /(^|\/)inbox\.md$/i.test(f.path));
        if (inboxAny) return inboxAny.path;

        /* ─── وگرنه اولین فایل ─── */
        return files[0]?.path || '';
    }

    /* ─── ارسال ─── */
    private async submit(): Promise<void> {
        if (this.submitting) return;
        const lang = this.plugin.settings.language;

        const title = (this.titleComponent?.inputEl.value ?? '').trim();
        const description = (this.descriptionComponent?.inputEl.value ?? '').trim();
        const dateInput = (this.dateComponent?.inputEl.value ?? '').trim();
        const category = (this.categoryComponent?.inputEl.value ?? '').trim();

        if (!title) {
            this.plugin.toastManager.show(t(lang, 'notice_no_title'), 'warning');
            return;
        }

        if (!this.sourceFile) {
            this.plugin.toastManager.show(t(lang, 'notice_no_file'), 'warning');
            return;
        }

        /* ─── اعتبارسنجی تاریخ ─── */
        let dueDateIso = '';
        if (dateInput) {
            if (!isValidDateInput(dateInput, this.plugin.settings.useJalaliDate)) {
                this.plugin.toastManager.show(
                    lang === 'fa'
                        ? 'قالب تاریخ اشتباهه (مثال: ۱۴۰۵/۰۷/۲۵)'
                        : 'Invalid date format (e.g., 2026-10-15)',
                    'warning'
                );
                return;
            }
            dueDateIso = parseIsoInput(dateInput, this.plugin.settings.useJalaliDate);
            if (!dueDateIso) {
                this.plugin.toastManager.show(
                    lang === 'fa' ? 'تاریخ معتبر نیست' : 'Invalid date',
                    'warning'
                );
                return;
            }
        }

        this.submitting = true;

        const ok = await this.plugin.taskManager.createTask(
            title,
            this.sourceFile,
            description,
            dueDateIso,
            category
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
