/* ════════════════════════════════════════════════════════════
   ✏️ Desktop Bulk Edit Modal — v0.2.0
   ✅ وضعیت انجام داینامیک (انجام/برگرداندن/mixed)
   ✅ Toggle وضعیت پیش‌فرض خاموش
   ✅ دسته‌بندی، تاریخ، پین
   ════════════════════════════════════════════════════════════ */

import { App, Modal, Setting } from 'obsidian';
import type FirstTaskPlugin from '../main';
import { t, applyDirection } from '../i18n';
import { parseDateInput } from '../utils/jalaliDate';
import { displayNumber, displayString } from '../utils/numberUtils';
import { DateSuggest } from './DateSuggest';

type SelectionState = 'all-pending' | 'all-completed' | 'mixed' | 'empty';

interface DesktopBulkUpdates {
    applyCompleted: boolean;
    completed: boolean;
    applyCategory: boolean;
    category: string;
    applyDate: boolean;
    dueDateJalali: string;
    dueDateGregorian: string;
    dueDateTs: number;
    applyPin: boolean;
    pinned: boolean;
}

export class DesktopBulkEditModal extends Modal {
    plugin: FirstTaskPlugin;
    taskIds: string[];
    onDone: () => void;
    private busy = false;

    private updates: DesktopBulkUpdates;
    private selectionState: SelectionState;

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

        this.selectionState = this.computeSelectionState();

        /* پیش‌فرض toggle خاموش — کاربر خودش روشن می‌کنه */
        let defaultCompleted = true;
        if (this.selectionState === 'all-completed') {
            defaultCompleted = false;
        }

        this.updates = {
            applyCompleted: false,
            completed: defaultCompleted,
            applyCategory: false,
            category: '',
            applyDate: false,
            dueDateJalali: '',
            dueDateGregorian: '',
            dueDateTs: 0,
            applyPin: false,
            pinned: true,
        };
    }

    private computeSelectionState(): SelectionState {
        let pending = 0;
        let done = 0;

        for (const id of this.taskIds) {
            const task = this.plugin.desktopStore.getById(id);
            if (!task) continue;
            if (task.completed) done++;
            else pending++;
        }

        if (done === 0 && pending === 0) return 'empty';
        if (done === 0) return 'all-pending';
        if (pending === 0) return 'all-completed';
        return 'mixed';
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

        contentEl.createEl('h3', {
            text: t(lang, 'bulk_edit_title'),
            cls: 'first-task-modal-title',
        });

        const count = this.taskIds.length;
        const summary = contentEl.createDiv({ cls: 'first-task-bulk-summary' });
        summary.setText(t(lang, 'bulk_selected_count', {
            count: displayNumber(count, lang),
        }));

        /* ═══════ وضعیت ═══════ */
        if (this.selectionState !== 'empty') {
            new Setting(contentEl)
                .setName(t(lang, 'bulk_field_completed'))
                .addToggle(tg => tg
                    .setValue(this.updates.applyCompleted)
                    .onChange(v => {
                        this.updates.applyCompleted = v;
                        this.render();
                    }));

            if (this.updates.applyCompleted) {
                const hintSetting = new Setting(contentEl);

                if (this.selectionState === 'all-pending') {
                    this.updates.completed = true;
                    hintSetting.setDesc(t(lang, 'bulk_completed_pending_hint'));
                } else if (this.selectionState === 'all-completed') {
                    this.updates.completed = false;
                    hintSetting.setDesc(t(lang, 'bulk_completed_done_hint'));
                } else {
                    hintSetting
                        .setName(t(lang, 'bulk_completed_value'))
                        .setDesc(t(lang, 'bulk_completed_mixed_hint'))
                        .addDropdown(dd => {
                            dd.addOption('true', t(lang, 'bulk_completed_on'));
                            dd.addOption('false', t(lang, 'bulk_completed_off'));
                            dd.setValue(this.updates.completed ? 'true' : 'false');
                            dd.onChange(v => {
                                this.updates.completed = v === 'true';
                            });
                        });
                }
            }
        }

        /* ═══════ دسته‌بندی ═══════ */
        if (this.plugin.settings.enableCategories) {
            new Setting(contentEl)
                .setName(t(lang, 'bulk_field_category'))
                .addToggle(tg => tg
                    .setValue(this.updates.applyCategory)
                    .onChange(v => {
                        this.updates.applyCategory = v;
                        this.render();
                    }));

            if (this.updates.applyCategory) {
                const cats = this.plugin.taskManager.getCategories();
                new Setting(contentEl).addDropdown(dd => {
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

        /* ═══════ تاریخ ═══════ */
        new Setting(contentEl)
            .setName(t(lang, 'bulk_field_date'))
            .addToggle(tg => tg
                .setValue(this.updates.applyDate)
                .onChange(v => {
                    this.updates.applyDate = v;
                    this.render();
                }));

        if (this.updates.applyDate) {
            new Setting(contentEl).addText(text => {
                const useJalali = this.plugin.settings.useJalaliDate;
                const currentValue = useJalali
                    ? this.updates.dueDateJalali
                    : this.updates.dueDateGregorian;

                text.setValue(displayString(currentValue, lang));
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

        /* ═══════ دکمه‌ها ═══════ */
        const actions = contentEl.createDiv({ cls: 'first-task-modal-buttons' });

        const cancelBtn = actions.createEl('button', {
            text: t(lang, 'btn_cancel'),
        });
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

        const anyActive =
            this.updates.applyCompleted ||
            this.updates.applyCategory ||
            this.updates.applyDate ||
            this.updates.applyPin;

        if (!anyActive) {
            this.plugin.toastManager.show(
                lang === 'fa' ? 'هیچ فیلدی فعال نیست' : 'No field is enabled',
                'warning'
            );
            return;
        }

        this.busy = true;

        try {
            /* ─── وضعیت ─── */
            if (this.updates.applyCompleted) {
                await this.plugin.desktopStore.bulkComplete(
                    this.taskIds,
                    this.updates.completed
                );
            }

            /* ─── بقیه فیلدها ─── */
            const patch: {
                category?: string;
                pinned?: boolean;
                due_date_jalali?: string;
                due_date_gregorian?: string;
                due_date_ts?: number;
            } = {};

            if (this.updates.applyCategory) patch.category = this.updates.category;
            if (this.updates.applyPin) patch.pinned = this.updates.pinned;
            if (this.updates.applyDate) {
                patch.due_date_jalali = this.updates.dueDateJalali;
                patch.due_date_gregorian = this.updates.dueDateGregorian;
                patch.due_date_ts = this.updates.dueDateTs;
            }

            if (Object.keys(patch).length > 0) {
                await this.plugin.desktopStore.bulkUpdate(this.taskIds, patch);
            }

            this.plugin.toastManager.show(t(lang, 'notice_bulk_updated'), 'success');
            this.onDone();
            this.close();
        } catch (e) {
            this.busy = false;
            this.plugin.toastManager.show(
                lang === 'fa' ? 'ویرایش گروهی ناموفق' : 'Bulk update failed',
                'error'
            );
        }
    }

    onClose(): void {
        this.contentEl.empty();
    }
          }
