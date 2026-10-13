/* ════════════════════════════════════════════════════════════
   🔎 مودال جزئیات + ویرایش — v0.1.2
   ✅ باکس عنوان و توضیحات (readonly)
   ✅ دکمه‌های داینامیک (ردیف + ستون)
   ✅ نام نوت ۱۲ کاراکتر
   ✅ اعداد داینامیک
   ════════════════════════════════════════════════════════════ */

import { App, Modal, Setting } from 'obsidian';
import type FirstTaskPlugin from '../main';
import type { ExtractedTask } from '../types';
import { t, applyDirection } from '../i18n';
import { parseDateInput } from '../utils/jalaliDate';
import { truncateNoteName } from '../utils/noteUtils';
import { displayString } from '../utils/numberUtils';

const NOTE_NAME_MAX = 12;

export class TaskDetailsModal extends Modal {
    plugin: FirstTaskPlugin;
    task: ExtractedTask;
    onDone: () => void;
    private busy = false;

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

        /* ─── باکس عنوان (readonly) ─── */
        const titleBox = parent.createDiv({ cls: 'first-task-details-box' });
        titleBox.createDiv({ cls: 'first-task-details-box-label', text: t(lang, 'field_title') });
        const titleContent = titleBox.createDiv({ cls: 'first-task-details-box-content' });
        titleContent.setText(this.task.title);

        /* ─── باکس توضیحات (readonly) ─── */
        const descBox = parent.createDiv({ cls: 'first-task-details-box' });
        descBox.createDiv({ cls: 'first-task-details-box-label', text: t(lang, 'field_description') });
        const descContent = descBox.createDiv({ cls: 'first-task-details-box-content' });
        descContent.setText(this.task.description || t(lang, 'details_no_description'));

        /* ─── متادیتا ─── */
        const meta = parent.createDiv({ cls: 'first-task-details-meta' });

        meta.createEl('div', {
            text: `${t(lang, 'details_status')}: ${this.task.completed ? t(lang, 'task_done') : t(lang, 'task_pending')}`,
        });

        const createdDisplay = useJalali ? this.task.created_jalali : this.task.created_gregorian;
        if (createdDisplay) {
            meta.createEl('div', {
                text: `${t(lang, 'details_created')}: ${displayString(createdDisplay, lang)}`,
            });
        }

        const dueDisplay = useJalali ? this.task.due_date_jalali : this.task.due_date_gregorian;
        if (dueDisplay) {
            meta.createEl('div', {
                text: `${t(lang, 'details_due_date')}: ${displayString(dueDisplay, lang)}`,
            });
        }

        const completedDisplay = useJalali ? this.task.completed_jalali : this.task.completed_gregorian;
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

        /* ─── دسته‌های داینامیک ─── */
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

        this.renderButtons(parent);
    }

    /* ═══════════════════════════════════════════════════════
       دکمه‌های داینامیک
       ─ در انتظار:
           [ویرایش] [پین/آنپین] [حذف]
           [       انجام شد       ]
       ─ انجام شده:
           [ویرایش] [حذف]
           [    برگرداندن    ]
       ═══════════════════════════════════════════════════════ */
    private renderButtons(parent: HTMLElement): void {
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
        this.editDate = useJalali ? this.task.due_date_jalali : this.task.due_date_gregorian;
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
                text.onChange(v => { this.editDate = v; });
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
        const cancelBtn = actions.createEl('button', { text: t(lang, 'btn_cancel') });
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
        const res = await this.plugin.taskManager.togglePin(this.task._id);

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

        let dueJalali = '';
        let dueGregorian = '';
        let dueTs = 0;

        if (this.editDate.trim()) {
            const parsed = parseDateInput(this.editDate, useJalali);
            if (!parsed) {
                this.plugin.toastManager.show(t(lang, 'notice_invalid_date'), 'warning');
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
