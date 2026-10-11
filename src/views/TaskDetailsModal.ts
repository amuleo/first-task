/* ════════════════════════════════════════════════════════════
   🔎 مودال جزئیات تسک
   ✅ نمایش نام نوت (truncate ۲۵ کاراکتر) + کلیک برای باز کردن
   ✅ دکمه‌ها سمت راست (انگلیسی) / چپ (فارسی)
   ════════════════════════════════════════════════════════════ */

import { App, Modal } from 'obsidian';
import type FirstTaskPlugin from '../main';
import type { ExtractedTask } from '../types';
import { t, applyDirection } from '../i18n';
import { formatIso } from '../utils/jalaliDate';

const NOTE_NAME_MAX = 25;

export class TaskDetailsModal extends Modal {
    plugin: FirstTaskPlugin;
    task: ExtractedTask;
    onDone: () => void;
    private busy = false;

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

        /* ─── هدر (عنوان تسک + بج پین) ─── */
        const header = contentEl.createDiv({ cls: 'first-task-details-header' });
        const titleRow = header.createDiv({ cls: 'first-task-details-title-row' });
        titleRow.createEl('h4', { text: this.task.title, cls: 'first-task-details-title' });

        if (this.task.pinned && !this.task.completed) {
            titleRow.createSpan({
                cls: 'first-task-pinned-badge',
                text: '📌 ' + t(lang, 'pinned_badge'),
            });
        }

        /* ─── نام نوت مبدأ (truncated) ─── */
        if (this.plugin.settings.showNoteInModal) {
            const noteName = this.task._source_file.split('/').pop() || this.task._source_file;
            const truncated = noteName.length > NOTE_NAME_MAX
                ? noteName.substring(0, NOTE_NAME_MAX - 3) + '...'
                : noteName;

            const sourceRow = contentEl.createDiv({ cls: 'first-task-details-source' });
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
        const meta = contentEl.createDiv({ cls: 'first-task-details-meta' });

        meta.createEl('div', {
            text: `${t(lang, 'details_status')}: ${this.task.completed ? t(lang, 'task_done') : t(lang, 'task_pending')}`,
        });

        if (this.task.due_date_iso) {
            meta.createEl('div', {
                text: `${t(lang, 'details_due_date')}: ${formatIso(this.task.due_date_iso, this.plugin.settings.useJalaliDate)}`,
            });
        }

        if (this.task.category) {
            meta.createEl('div', {
                text: `${t(lang, 'details_category')}: ${this.task.category}`,
            });
        }

        /* ─── توضیحات ─── */
        const descSection = contentEl.createDiv({ cls: 'first-task-details-section' });
        descSection.createEl('h5', { text: t(lang, 'details_description') });
        const descBox = descSection.createDiv({ cls: 'first-task-details-desc' });
        descBox.setText(this.task.description || t(lang, 'details_no_description'));

        /* ─── دکمه‌ها ─── */
        const actions = contentEl.createDiv({ cls: 'first-task-modal-buttons' });

        /* پین (فقط برای در انتظار) */
        if (!this.task.completed) {
            const pinBtn = actions.createEl('button', {
                text: this.task.pinned ? t(lang, 'btn_unpin') : t(lang, 'btn_pin'),
            });
            pinBtn.onclick = () => this.handleTogglePin();
        }

        /* انجام / برگرداندن */
        if (this.task.completed) {
            const pendingBtn = actions.createEl('button', {
                text: t(lang, 'btn_mark_pending'),
                cls: 'mod-cta',
            });
            pendingBtn.onclick = () => this.handleToggle();
        } else {
            const doneBtn = actions.createEl('button', {
                text: t(lang, 'btn_mark_done'),
                cls: 'mod-cta',
            });
            doneBtn.onclick = () => this.handleToggle();
        }

        /* باز کردن نوت */
        const openBtn = actions.createEl('button', {
            text: t(lang, 'btn_open_note'),
        });
        openBtn.onclick = () => this.openSourceNote();
    }

    /* ═══════════════════════════════════════════════════════
       🔗 باز کردن نوت مبدأ
       ═══════════════════════════════════════════════════════ */
    private async openSourceNote(): Promise<void> {
        const file = this.plugin.app.vault.getAbstractFileByPath(this.task._source_file);
        if (!file) return;

        try {
            await this.plugin.app.workspace.openLinkText(this.task._source_file, '');
            this.close();
        } catch (e) {
            console.warn('[First Task] Could not open note:', e);
        }
    }

    /* ═══════════════════════════════════════════════════════
       📌 پین / آنپین
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

    /* ═══════════════════════════════════════════════════════
       ✅ انجام / برگرداندن
       ═══════════════════════════════════════════════════════ */
    private async handleToggle(): Promise<void> {
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

    onClose(): void { this.contentEl.empty(); }
}
