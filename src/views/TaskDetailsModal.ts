/* ════════════════════════════════════════════════════════════
   🔎 مودال جزئیات + ویرایش تسک — v0.2.0
   ✅ حالت نمایش + حالت ویرایش
   ✅ نمایش تاریخ ساخت و اتمام (شمسی + میلادی)
   ✅ دکمه‌ها: پین / انجام / ویرایش / باز کردن نوت / حذف
   ════════════════════════════════════════════════════════════ */

import { App, Modal, Setting, setIcon } from 'obsidian';
import type FirstTaskPlugin from '../main';
import type { ExtractedTask } from '../types';
import { t, applyDirection } from '../i18n';
import { parseDateInput, getTodayDateInput } from '../utils/jalaliDate';
import { truncateNoteName } from '../utils/noteUtils';

const NOTE_NAME_MAX = 25;

export class TaskDetailsModal extends Modal {
    plugin: FirstTaskPlugin;
    task: ExtractedTask;
    onDone: () => void;
    private busy = false;

    /* ─── حالت ویرایش ─── */
    private editing = false;
    private editTitle = '';
    private editDescription = '';
    private editCategory = '';
    private editDate = '';

    constructor(app: App, plugin: FirstTaskPlugin, task: ExtractedTask, onDone: () => void) {
        super(app);
        this.plugin = plugin;
        this.task = task;
        this.onDone = onDone;
    }

    onOpen(): void { this.render(); }

    private render(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('first-task-modal-content');

        const lang = this.plugin.settings.language;
        applyDirection(contentEl, lang);

        if (this.editing) this.renderEditMode(contentEl);
        else this.renderViewMode(contentEl);
    }

    /* ═══════════════════════════════════════════════════════
       حالت نمایش
       ═══════════════════════════════════════════════════════ */
    private renderViewMode(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;
        const useJalali = this.plugin.settings.useJalaliDate;

        /* ─── هدر (عنوان تسک + بج پین) ─── */
        const header = parent.createDiv({ cls: 'first-task-details-header' });
        const titleRow = header.createDiv({ cls: 'first-task-details-title-row' });
        titleRow.createEl('h4', { text: this.task.title, cls: 'first-task-details-title' });

        if (this.task.pinned && !this.task.completed) {
            titleRow.createSpan({
                cls: 'first-task-pinned-badge',
                text: '📌 ' + t(lang, 'pinned_badge'),
            });
        }

        /* ─── نام نوت مبدأ ─── */
        if (this.plugin.settings.showNoteInModal) {
            const noteName = this.task._source_file.split('/').pop() || this.task._source_file;
            const truncated = truncateNoteName(noteName, NOTE_NAME_MAX);

            const sourceRow = parent.createDiv({ cls: 'first-task-details-source' });
            sourceRow.createSpan({ text: '📝 ' + t(lang, 'details_source') + ': ' });
            const link = sourceRow.createEl('a', {
                text: truncated,
                cls: 'first-task-source-link',
                href: '#',
            });
            link.title = this.task._source_file;
            link.onclick = (e) => {
                e.preventDefault();
                this.openSourceNote();
            };
        }

        /* ─── متادیتا ─── */
        const meta = parent.createDiv({ cls: 'first-task-details-meta' });

        meta.createEl('div', {
            text: `${t(lang, 'details_status')}: ${this.task.completed ? t(lang, 'task_done') : t(lang, 'task_pending')}`,
        });

        /* ─── تاریخ ساخت ─── */
        const createdDisplay = useJalali ? this.task.created_jalali : this.task.created_gregorian;
        if (createdDisplay) {
            meta.createEl('div', {
                text: `${t(lang, 'details_created')}: ${createdDisplay}`,
            });
        }

        /* ─── تاریخ انجام ─── */
        const dueDisplay = useJalali ? this.task.due_date_jalali : this.task.due_date_gregorian;
        if (dueDisplay) {
            meta.createEl('div', {
                text: `${t(lang, 'details_due_date')}: ${dueDisplay}`,
            });
        }

        /* ─── تاریخ اتمام ─── */
        const completedDisplay = useJalali ? this.task.completed_jalali : this.task.completed_gregorian;
        if (completedDisplay) {
            meta.createEl('div', {
                text: `${t(lang, 'details_completed')}: ${completedDisplay}`,
            });
        }

        /* ─── دسته‌بندی ─── */
        if (this.task.category) {
            const catName = this.plugin.taskManager.getCategoryDisplayName(this.task.category);
            meta.createEl('div', {
                text: `${t(lang, 'details_category')}: ${catName}`,
            });
        }

        /* ─── دسته‌بندی‌های داینامیک ─── */
        const dynCats = this.plugin.taskManager.getTaskDynamicCategories(this.task);
        if (dynCats.length > 0) {
            const dynRow = meta.createDiv({ cls: 'first-task-details-dynamic' });
            dynRow.createSpan({ text: t(lang, 'details_dynamic_categories') + ': ' });
            for (const c of dynCats) {
                const badge = dynRow.createSpan({
                    cls: `first-task-dynamic-badge first-task-dynamic-${c}`,
                });
                badge.setText(t(lang, `category_${c}` as any));
            }
        }

        /* ─── توضیحات ─── */
        const descSection = parent.createDiv({ cls: 'first-task-details-section' });
        descSection.createEl('h5', { text: t(lang, 'details_description') });
        const descBox = descSection.createDiv({ cls: 'first-task-details-desc' });
        descBox.setText(this.task.description || t(lang, 'details_no_description'));

        /* ─── دکمه‌ها ─── */
        const actions = parent.createDiv({ cls: 'first-task-modal-buttons' });

        /* ۱. ویرایش */
        const editBtn = actions.createEl('button', { text: t(lang, 'btn_edit') });
        editBtn.onclick = () => {
            this.editing = true;
            this.editTitle = this.task.title;
            this.editDescription = this.task.description;
            this.editCategory = this.task.category;
            this.editDate = useJalali ? this.task.due_date_jalali : this.task.due_date_gregorian;
            this.render();
        };

        /* ۲. حذف */
        const delBtn = actions.createEl('button', {
            text: t(lang, 'btn_delete'),
            cls: 'mod-warning',
        });
        delBtn.onclick = () => this.handleDelete();

        /* ۳. پین (فقط در انتظار) */
        if (!this.task.completed) {
            const pinBtn = actions.createEl('button', {
                text: this.task.pinned ? t(lang, 'btn_unpin') : t(lang, 'btn_pin'),
            });
            pinBtn.onclick = () => this.handleTogglePin();
        }

        /* ۴. انجام / برگرداندن */
        if (this.task.completed) {
            const pendingBtn = actions.createEl('button', {
                text: t(lang, 'btn_mark_pending'),
                cls: 'mod-cta',
            });
            pendingBtn.onclick = () => this.handleToggleComplete();
        } else {
            const doneBtn = actions.createEl('button', {
                text: t(lang, 'btn_mark_done'),
                cls: 'mod-cta',
            });
            doneBtn.onclick = () => this.handleToggleComplete();
        }

        /* ۵. باز کردن نوت */
        const openBtn = actions.createEl('button', {
            text: t(lang, 'btn_open_note'),
        });
        openBtn.onclick = () => this.openSourceNote();
    }

    /* ═══════════════════════════════════════════════════════
       حالت ویرایش
       ═══════════════════════════════════════════════════════ */
    private renderEditMode(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;
        const useJalali = this.plugin.settings.useJalaliDate;

        parent.createEl('h3', {
            text: t(lang, 'edit_title'),
            cls: 'first-task-modal-title',
        });

        /* ─── عنوان ─── */
        new Setting(parent)
            .setName(t(lang, 'field_title'))
            .addText(text => {
                text.setValue(this.editTitle);
                text.onChange(v => { this.editTitle = v; });
            });

        /* ─── توضیحات ─── */
        new Setting(parent)
            .setName(t(lang, 'field_description'))
            .addTextArea(ta => {
                ta.setValue(this.editDescription);
                ta.inputEl.rows = 4;
                ta.inputEl.style.width = '100%';
                ta.onChange(v => { this.editDescription = v; });
            });

        /* ─── تاریخ ─── */
        new Setting(parent)
            .setName(t(lang, 'field_due_date'))
            .addText(text => {
                text.setValue(this.editDate);
                text.inputEl.dir = 'ltr';
                text.setPlaceholder(useJalali ? '1405/07/25' : '2026-10-15');
                text.onChange(v => { this.editDate = v; });
            });

        /* ─── دسته‌بندی ─── */
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

        /* ─── دکمه‌ها ─── */
        const actions = parent.createDiv({ cls: 'first-task-modal-buttons' });
        const cancelBtn = actions.createEl('button', { text: t(lang, 'btn_cancel') });
        cancelBtn.onclick = () => { this.editing = false; this.render(); };
        const saveBtn = actions.createEl('button', { text: t(lang, 'btn_save'), cls: 'mod-cta' });
        saveBtn.onclick = () => this.handleSave();
    }

    /* ═══════════════════════════════════════════════════════
       اکشن‌ها
       ═══════════════════════════════════════════════════════ */
    private async handleTogglePin(): Promise<void> {
        if (this.busy) return;
        this.busy = true;

        const lang = this.plugin.settings.language;
        const ok = await this.plugin.taskManager.togglePin(this.task._id);

        if (ok) {
            this.task.pinned = !this.task.pinned;
            this.plugin.toastManager.show(
                t(lang, this.task.pinned ? 'notice_task_pinned' : 'notice_task_unpinned'),
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
        const ok = await this.plugin.taskManager.toggleComplete(this.task._id);

        if (ok) {
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
        const useJalali = this.plugin.settings.useJalaliDate;

        if (!this.editTitle.trim()) {
            this.plugin.toastManager.show(t(lang, 'notice_no_title'), 'warning');
            return;
        }

        /* ─── پارس تاریخ ─── */
        let dueJalali = '';
        let dueGregorian = '';
        let dueTs = 0;

        if (this.editDate.trim()) {
            const parsed = parseDateInput(this.editDate, useJalali);
            if (!parsed) {
                this.plugin.toastManager.show(
                    lang === 'fa'
                        ? 'قالب تاریخ اشتباهه'
                        : 'Invalid date format',
                    'warning'
                );
                return;
            }
            dueJalali = parsed.jalali;
            dueGregorian = parsed.gregorian;
            dueTs = parsed.ts;
        }

        this.busy = true;

        const ok = await this.plugin.taskManager.updateTaskFull(this.task._id, {
            title: this.editTitle.trim(),
            description: this.editDescription.trim(),
            category: this.editCategory,
            dueDateJalali: dueJalali,
            dueDateGregorian: dueGregorian,
            dueDateTs: dueTs,
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
        const ok = await this.plugin.taskManager.deleteTask(this.task._id);

        if (ok) {
            this.plugin.toastManager.show(t(lang, 'notice_task_deleted'), 'success');
            this.onDone();
            this.close();
        } else {
            this.busy = false;
        }
    }

    private async openSourceNote(): Promise<void> {
        try {
            await this.plugin.app.workspace.openLinkText(this.task._source_file, '');
            this.close();
        } catch (e) {
            console.warn('[First Task] Could not open note:', e);
        }
    }

    onClose(): void { this.contentEl.empty(); }
}
