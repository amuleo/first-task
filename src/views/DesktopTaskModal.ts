/* ════════════════════════════════════════════════════════════
   🖥️ Desktop Modals — v0.2.0
   ✅ DesktopCreateModal — ساخت تسک جدید
   ✅ DesktopTaskDetailsModal — نمایش + ویرایش + حذف
   ════════════════════════════════════════════════════════════ */

import { App, Modal, Setting } from 'obsidian';
import type FirstTaskPlugin from '../main';
import type { DesktopTask } from '../types';
import { t, applyDirection } from '../i18n';
import { parseDateInput, getTodayDateInput } from '../utils/jalaliDate';
import { displayNumber, displayString } from '../utils/numberUtils';
import { DateSuggest } from './DateSuggest';

/* ═══════════════════════════════════════════════════════════
   DesktopCreateModal — ساخت تسک جدید
   ═══════════════════════════════════════════════════════════ */
export class DesktopCreateModal extends Modal {
    plugin: FirstTaskPlugin;
    onDone: () => void;
    private submitting = false;

    private titleValue = '';
    private descriptionValue = '';
    private categoryValue = '';
    private dateJalali = '';
    private dateGregorian = '';
    private dateTs = 0;

    constructor(
        app: App,
        plugin: FirstTaskPlugin,
        onDone: () => void
    ) {
        super(app);
        this.plugin = plugin;
        this.onDone = onDone;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('first-task-modal-content');

        const lang = this.plugin.settings.language;
        const useJalali = this.plugin.settings.useJalaliDate;
        applyDirection(contentEl, lang);

        contentEl.createEl('h3', {
            text: t(lang, 'desktop_create_title'),
            cls: 'first-task-modal-title',
        });

        /* ─── عنوان ─── */
        new Setting(contentEl)
            .setName(t(lang, 'field_title'))
            .addText(text => {
                text.setPlaceholder(t(lang, 'field_title_placeholder'));
                text.onChange(v => { this.titleValue = v; });
                setTimeout(() => text.inputEl.focus(), 50);
            });

        /* ─── توضیحات ─── */
        new Setting(contentEl)
            .setName(t(lang, 'field_description'))
            .addTextArea(ta => {
                ta.setPlaceholder(t(lang, 'field_description_placeholder'));
                ta.inputEl.rows = 3;
                ta.inputEl.style.width = '100%';
                ta.onChange(v => { this.descriptionValue = v; });
            });

        /* ─── تاریخ ─── */
        const todayDisplay = getTodayDateInput(useJalali);
        new Setting(contentEl)
            .setName(t(lang, 'field_due_date'))
            .addText(text => {
                text.setValue(displayString(todayDisplay, lang));
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
                    } else {
                        this.dateJalali = '';
                        this.dateGregorian = '';
                        this.dateTs = 0;
                    }
                });
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
                    dd.setValue('');
                    dd.onChange(v => { this.categoryValue = v; });
                });
        }

        /* ─── دکمه‌ها ─── */
        const actions = contentEl.createDiv({ cls: 'first-task-modal-buttons' });

        const cancelBtn = actions.createEl('button', {
            text: t(lang, 'btn_cancel'),
        });
        cancelBtn.onclick = () => this.close();

        const createBtn = actions.createEl('button', {
            text: t(lang, 'btn_create'),
            cls: 'mod-cta',
        });
        createBtn.onclick = () => this.submit();
    }

    private async submit(): Promise<void> {
        if (this.submitting) return;
        const lang = this.plugin.settings.language;

        const title = this.titleValue.trim();
        if (!title) {
            this.plugin.toastManager.show(t(lang, 'notice_no_title'), 'warning');
            return;
        }

        this.submitting = true;

        const result = await this.plugin.desktopStore.createTask({
            title,
            description: this.descriptionValue.trim(),
            category: this.categoryValue,
            dueDateJalali: this.dateJalali,
            dueDateGregorian: this.dateGregorian,
            dueDateTs: this.dateTs,
        });

        if (result) {
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

    onClose(): void {
        this.contentEl.empty();
    }
}

/* ═══════════════════════════════════════════════════════════
   DesktopTaskDetailsModal — نمایش + ویرایش
   ═══════════════════════════════════════════════════════════ */
export class DesktopTaskDetailsModal extends Modal {
    plugin: FirstTaskPlugin;
    task: DesktopTask;
    onDone: () => void;
    private busy = false;
    private editing = false;

    /* ─── ویرایش ─── */
    private editTitle = '';
    private editDescription = '';
    private editCategory = '';
    private editDate = '';
    private editDateJalali = '';
    private editDateGregorian = '';
    private editDateTs = 0;

    constructor(
        app: App,
        plugin: FirstTaskPlugin,
        task: DesktopTask,
        onDone: () => void
    ) {
        super(app);
        this.plugin = plugin;
        this.task = task;
        this.onDone = onDone;
    }

    onOpen(): void {
        this.render();
    }

    private render(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('first-task-modal-content');

        const lang = this.plugin.settings.language;
        applyDirection(contentEl, lang);

        if (this.editing) {
            this.renderEditMode(contentEl);
        } else {
            this.renderViewMode(contentEl);
        }
    }

    /* ═══════════════════════════════════════════════════════
       حالت نمایش
       ═══════════════════════════════════════════════════════ */
    private renderViewMode(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;
        const useJalali = this.plugin.settings.useJalaliDate;

        /* ─── عنوان ─── */
        const titleBox = parent.createDiv({ cls: 'first-task-details-box' });
        titleBox.createDiv({
            cls: 'first-task-details-box-label',
            text: t(lang, 'field_title'),
        });
        const titleContent = titleBox.createDiv({
            cls: 'first-task-details-box-content',
        });
        titleContent.setText(this.task.title);

        /* ─── توضیحات ─── */
        const descBox = parent.createDiv({ cls: 'first-task-details-box' });
        descBox.createDiv({
            cls: 'first-task-details-box-label',
            text: t(lang, 'field_description'),
        });
        const descContent = descBox.createDiv({
            cls: 'first-task-details-box-content',
        });
        descContent.setText(this.task.description || t(lang, 'details_no_description'));

        /* ─── متادیتا ─── */
        const meta = parent.createDiv({ cls: 'first-task-details-meta' });

        meta.createEl('div', {
            text: `${t(lang, 'details_status')}: ${this.task.completed
                ? t(lang, 'task_done')
                : t(lang, 'task_pending')}`,
        });

        const createdDisplay = useJalali
            ? this.task.created_jalali
            : this.task.created_gregorian;
        if (createdDisplay) {
            meta.createEl('div', {
                text: `${t(lang, 'details_created')}: ${displayString(createdDisplay, lang)}`,
            });
        }

        const dueDisplay = useJalali
            ? this.task.due_date_jalali
            : this.task.due_date_gregorian;
        if (dueDisplay) {
            meta.createEl('div', {
                text: `${t(lang, 'details_due_date')}: ${displayString(dueDisplay, lang)}`,
            });
        }

        const completedDisplay = useJalali
            ? this.task.completed_jalali
            : this.task.completed_gregorian;
        if (completedDisplay) {
            meta.createEl('div', {
                text: `${t(lang, 'details_completed')}: ${displayString(completedDisplay, lang)}`,
            });
        }

        if (this.task.category) {
            const catName = this.plugin.taskManager.getCategoryDisplayName(this.task.category);
            meta.createEl('div', {
                text: `${t(lang, 'details_category')}: ${catName}`,
            });
        }

        /* ─── دکمه‌ها ─── */
        this.renderViewButtons(parent);
    }

    private renderViewButtons(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;
        const container = parent.createDiv({ cls: 'first-task-action-container' });

        if (!this.task.completed) {
            const topRow = container.createDiv({ cls: 'first-task-action-row' });

            const editBtn = topRow.createEl('button', {
                text: t(lang, 'btn_edit'),
                cls: 'first-task-action-btn',
            });
            editBtn.onclick = () => this.startEdit();

            const pinBtn = topRow.createEl('button', {
                text: this.task.pinned ? t(lang, 'btn_unpin') : t(lang, 'btn_pin'),
                cls: 'first-task-action-btn',
            });
            pinBtn.onclick = () => this.handleTogglePin();

            const delBtn = topRow.createEl('button', {
                text: t(lang, 'btn_delete'),
                cls: 'first-task-action-btn mod-warning',
            });
            delBtn.onclick = () => this.handleDelete();

            const bottomRow = container.createDiv({ cls: 'first-task-action-row' });
            const doneBtn = bottomRow.createEl('button', {
                text: t(lang, 'btn_mark_done'),
                cls: 'first-task-action-btn mod-cta first-task-action-btn-full',
            });
            doneBtn.onclick = () => this.handleToggleComplete();
        } else {
            const topRow = container.createDiv({ cls: 'first-task-action-row' });

            const editBtn = topRow.createEl('button', {
                text: t(lang, 'btn_edit'),
                cls: 'first-task-action-btn',
            });
            editBtn.onclick = () => this.startEdit();

            const delBtn = topRow.createEl('button', {
                text: t(lang, 'btn_delete'),
                cls: 'first-task-action-btn mod-warning',
            });
            delBtn.onclick = () => this.handleDelete();

            const bottomRow = container.createDiv({ cls: 'first-task-action-row' });
            const restoreBtn = bottomRow.createEl('button', {
                text: t(lang, 'btn_mark_pending'),
                cls: 'first-task-action-btn mod-cta first-task-action-btn-full',
            });
            restoreBtn.onclick = () => this.handleToggleComplete();
        }
    }

    /* ═══════════════════════════════════════════════════════
       حالت ویرایش
       ═══════════════════════════════════════════════════════ */
    private startEdit(): void {
        const useJalali = this.plugin.settings.useJalaliDate;
        this.editing = true;
        this.editTitle = this.task.title;
        this.editDescription = this.task.description;
        this.editCategory = this.task.category;
        this.editDateJalali = this.task.due_date_jalali;
        this.editDateGregorian = this.task.due_date_gregorian;
        this.editDateTs = this.task.due_date_ts;
        this.editDate = useJalali
            ? this.task.due_date_jalali
            : this.task.due_date_gregorian;
        this.render();
    }

    private renderEditMode(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;
        const useJalali = this.plugin.settings.useJalaliDate;

        parent.createEl('h3', {
            text: t(lang, 'edit_title'),
            cls: 'first-task-modal-title',
        });

        new Setting(parent)
            .setName(t(lang, 'field_title'))
            .addText(text => {
                text.setValue(this.editTitle);
                text.onChange(v => { this.editTitle = v; });
            });

        new Setting(parent)
            .setName(t(lang, 'field_description'))
            .addTextArea(ta => {
                ta.setValue(this.editDescription);
                ta.inputEl.rows = 4;
                ta.inputEl.style.width = '100%';
                ta.onChange(v => { this.editDescription = v; });
            });

        new Setting(parent)
            .setName(t(lang, 'field_due_date'))
            .addText(text => {
                text.setValue(displayString(this.editDate, lang));
                text.inputEl.dir = 'ltr';
                text.setPlaceholder(useJalali ? '1405/07/25' : '2026-10-15');

                new DateSuggest(this.app, text.inputEl, this.plugin, (dateStr) => {
                    const parsed = parseDateInput(dateStr, useJalali);
                    if (parsed) {
                        this.editDateJalali = parsed.jalali;
                        this.editDateGregorian = parsed.gregorian;
                        this.editDateTs = parsed.ts;
                        text.setValue(displayString(dateStr, lang));
                    }
                });

                text.onChange(v => {
                    const parsed = parseDateInput(v, useJalali);
                    if (parsed) {
                        this.editDateJalali = parsed.jalali;
                        this.editDateGregorian = parsed.gregorian;
                        this.editDateTs = parsed.ts;
                    } else {
                        this.editDateJalali = '';
                        this.editDateGregorian = '';
                        this.editDateTs = 0;
                    }
                });
            });

        if (this.plugin.settings.enableCategories) {
            const cats = this.plugin.taskManager.getCategories();
            new Setting(parent)
                .setName(t(lang, 'field_category'))
                .addDropdown(dd => {
                    dd.addOption('', t(lang, 'panel_no_category'));
                    for (const c of cats) {
                        const label = lang === 'fa' ? c.name_fa : c.name;
                        dd.addOption(c.id, label);
                    }
                    dd.setValue(this.editCategory);
                    dd.onChange(v => { this.editCategory = v; });
                });
        }

        const actions = parent.createDiv({ cls: 'first-task-modal-buttons' });

        const cancelBtn = actions.createEl('button', {
            text: t(lang, 'btn_cancel'),
        });
        cancelBtn.onclick = () => {
            this.editing = false;
            this.render();
        };

        const saveBtn = actions.createEl('button', {
            text: t(lang, 'btn_save'),
            cls: 'mod-cta',
        });
        saveBtn.onclick = () => this.handleSave();
    }

    /* ═══════════════════════════════════════════════════════
       اکشن‌ها
       ═══════════════════════════════════════════════════════ */
    private async handleTogglePin(): Promise<void> {
        if (this.busy) return;
        this.busy = true;

        const lang = this.plugin.settings.language;
        const res = await this.plugin.desktopStore.togglePin(this.task.id);

        if (res.ok) {
            this.plugin.toastManager.show(
                t(lang, res.pinned ? 'notice_task_pinned' : 'notice_task_unpinned'),
                'success'
            );
            this.onDone();
            this.close();
        } else {
            this.busy = false;
        }
    }

    private async handleToggleComplete(): Promise<void> {
        if (this.busy) return;
        this.busy = true;

        const lang = this.plugin.settings.language;
        const wasCompleted = this.task.completed;
        const res = await this.plugin.desktopStore.toggleComplete(this.task.id);

        if (res.ok) {
            this.plugin.toastManager.show(
                t(lang, wasCompleted ? 'notice_task_restored' : 'notice_task_completed'),
                'success'
            );
            this.onDone();
            this.close();
        } else {
            this.busy = false;
        }
    }

    private async handleSave(): Promise<void> {
        if (this.busy) return;
        const lang = this.plugin.settings.language;

        if (!this.editTitle.trim()) {
            this.plugin.toastManager.show(t(lang, 'notice_no_title'), 'warning');
            return;
        }

        this.busy = true;

        const ok = await this.plugin.desktopStore.update(this.task.id, {
            title: this.editTitle.trim(),
            description: this.editDescription.trim(),
            category: this.editCategory,
            due_date_jalali: this.editDateJalali,
            due_date_gregorian: this.editDateGregorian,
            due_date_ts: this.editDateTs,
        });

        if (ok) {
            this.plugin.toastManager.show(t(lang, 'notice_task_updated'), 'success');
            this.onDone();
            this.close();
        } else {
            this.busy = false;
            this.plugin.toastManager.show(
                lang === 'fa' ? 'ویرایش ناموفق' : 'Update failed',
                'error'
            );
        }
    }

    private async handleDelete(): Promise<void> {
        if (this.busy) return;
        const lang = this.plugin.settings.language;

        if (!window.confirm(t(lang, 'confirm_delete_body'))) return;

        this.busy = true;
        const ok = await this.plugin.desktopStore.remove(this.task.id);

        if (ok) {
            this.plugin.toastManager.show(t(lang, 'notice_task_deleted'), 'success');
            this.onDone();
            this.close();
        } else {
            this.busy = false;
        }
    }

    onClose(): void {
        this.contentEl.empty();
    }
}
