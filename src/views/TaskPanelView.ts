/* ════════════════════════════════════════════════════════════
   📋 TaskPanel View — v0.2.0
   ✅ ۹ کارت زمانی + بدون تاریخ + همه
   ✅ حالت انتخاب گروهی
   ✅ انتقال گروهی به Desktop
   ════════════════════════════════════════════════════════════ */

import { ItemView, WorkspaceLeaf, setIcon, TFile } from 'obsidian';
import type FirstTaskPlugin from '../main';
import type { ExtractedTask, TabType } from '../types';
import { t, applyDirection } from '../i18n';
import { displayNumber, displayString } from '../utils/numberUtils';
import { TaskDetailsModal } from './TaskDetailsModal';
import { BulkEditModal } from './BulkEditModal';
import { CreateTaskModal } from './CreateTaskModal';

export const VIEW_TYPE_FIRST_TASK = 'first-task-panel';

export class TaskPanelView extends ItemView {
    plugin: FirstTaskPlugin;
    private visibleCount: number = 0;
    private selectionMode: boolean = false;
    private selectedIds: Set<string> = new Set();

    constructor(leaf: WorkspaceLeaf, plugin: FirstTaskPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string { return VIEW_TYPE_FIRST_TASK; }
    getDisplayText(): string { return t(this.plugin.settings.language, 'panel_title'); }
    getIcon(): string { return 'check-square'; }

    async onOpen(): Promise<void> {
        this.visibleCount = this.plugin.settings.tasksPerPage;
        this.plugin.toastManager.setRTL(this.plugin.settings.language === 'fa');
        this.render();
    }

    async onClose(): Promise<void> {}

    refresh(): void { this.render(); }

    /* ═══════════════════════════════════════════════════════
       رندر
       ═══════════════════════════════════════════════════════ */
    private render(): void {
        const { contentEl } = this;
        const savedScroll = contentEl.scrollTop;

        contentEl.empty();
        contentEl.addClass('first-task-panel');
        applyDirection(contentEl, this.plugin.settings.language);
        this.plugin.toastManager.setRTL(this.plugin.settings.language === 'fa');

        this.renderHeader(contentEl);
        this.renderCategoryDropdown(contentEl);
        this.renderTabs(contentEl);

        if (this.plugin.settings.currentTab === 'pending') {
            this.renderPending(contentEl);
        } else {
            this.renderCompleted(contentEl);
        }

        if (this.selectionMode) {
            this.renderSelectionBar(contentEl);
        }

        requestAnimationFrame(() => {
            contentEl.scrollTop = savedScroll;
        });
    }

    /* ─── هدر ─── */
    private renderHeader(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;
        const header = parent.createDiv({ cls: 'first-task-header' });
        const topRow = header.createDiv({ cls: 'first-task-header-top' });

        topRow.createEl('h4', {
            text: this.plugin.settings.currentTab === 'pending'
                ? t(lang, 'panel_title')
                : t(lang, 'panel_title_completed'),
            cls: 'first-task-title',
        });

        const actions = topRow.createDiv({ cls: 'first-task-header-actions' });

        const syncBtn = actions.createEl('button', { cls: 'clickable-icon' });
        setIcon(syncBtn, 'refresh-cw');
        syncBtn.setAttribute('aria-label', t(lang, 'panel_reload'));
        syncBtn.onclick = () => this.handleRescan();

        if (!this.selectionMode) {
            const selectBtn = actions.createEl('button', { cls: 'clickable-icon' });
            setIcon(selectBtn, 'check-square');
            selectBtn.setAttribute('aria-label', t(lang, 'bulk_select'));
            selectBtn.onclick = () => this.enterSelectionMode();
        }

        if (this.plugin.settings.currentTab === 'pending' && !this.selectionMode) {
            const addBtn = actions.createEl('button', { cls: 'clickable-icon' });
            setIcon(addBtn, 'plus');
            addBtn.setAttribute('aria-label', t(lang, 'panel_new_task'));
            addBtn.onclick = () => this.handleNewTask();
        }
    }

    /* ─── dropdown دسته‌بندی ─── */
    private renderCategoryDropdown(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;
        const cats = this.plugin.taskManager.getCategories();
        const hasUncategorized = this.plugin.taskManager.hasTasksWithoutCategory();

        const row = parent.createDiv({ cls: 'first-task-category-row' });
        const select = row.createEl('select', { cls: 'dropdown first-task-category-select' });

        select.createEl('option', {
            value: '',
            text: t(lang, 'panel_all_categories'),
        });

        if (hasUncategorized) {
            select.createEl('option', {
                value: 'none',
                text: t(lang, 'panel_no_category'),
            });
        }

        for (const c of cats) {
            const label = lang === 'fa' ? c.name_fa : c.name;
            select.createEl('option', { value: c.id, text: label });
        }

        select.value = this.plugin.settings.panelCategory || '';
        select.onchange = async () => {
            this.plugin.settings.panelCategory = select.value;
            await this.plugin.saveSettings();
            this.visibleCount = this.plugin.settings.tasksPerPage;
            this.contentEl.scrollTop = 0;
            this.render();
        };
    }

    /* ─── تب‌ها ─── */
    private renderTabs(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;
        const tabs = parent.createDiv({ cls: 'first-task-tabs' });

        const currentCategory = this.plugin.settings.panelCategory || '';
        const pendingCount = this.plugin.taskManager.getPendingByCategory(currentCategory).length;
        const completedCount = this.plugin.taskManager.getCompletedByCategory(currentCategory).length;

        const mkTab = (id: TabType, icon: string, label: string, count: number) => {
            const btn = tabs.createEl('button', {
                cls: 'first-task-tab' + (this.plugin.settings.currentTab === id ? ' is-active' : ''),
            });
            setIcon(btn.createSpan({ cls: 'first-task-tab-icon' }), icon);
            btn.createSpan({ text: ` ${label} (${displayNumber(count, lang)})` });

            btn.onclick = async () => {
                if (this.plugin.settings.currentTab === id) return;
                this.selectionMode = false;
                this.selectedIds.clear();
                this.plugin.settings.currentTab = id;
                await this.plugin.saveSettings();
                this.visibleCount = this.plugin.settings.tasksPerPage;
                this.contentEl.scrollTop = 0;
                this.render();
            };
        };

        mkTab('pending', 'circle-dot', t(lang, 'tab_pending'), pendingCount);
        mkTab('completed', 'check-circle', t(lang, 'tab_completed'), completedCount);
    }

    /* ─── تب در انتظار ─── */
    private renderPending(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;
        const body = parent.createDiv({ cls: 'first-task-body' });

        const category = this.plugin.settings.panelCategory || '';
        const tasks = this.plugin.taskManager.getPendingByCategory(category);

        if (tasks.length === 0) {
            this.renderEmpty(body, t(lang, 'panel_empty'), t(lang, 'panel_empty_hint'));
            return;
        }

        const visible = tasks.slice(0, this.visibleCount);
        for (const task of visible) this.renderTaskCard(body, task, false);

        if (tasks.length > this.visibleCount) {
            const remaining = tasks.length - this.visibleCount;
            const moreBtn = body.createEl('button', {
                cls: 'first-task-show-more',
                text: `${t(lang, 'panel_show_more')} (${displayNumber(remaining, lang)})`,
            });
            moreBtn.onclick = () => {
                this.visibleCount += this.plugin.settings.tasksPerPage;
                this.render();
            };
        }
    }

    /* ─── تب انجام شده ─── */
    private renderCompleted(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;
        const stats = this.plugin.taskManager.getStats();
        const statsGrid = parent.createDiv({ cls: 'first-task-stats-grid' });

        const mkCard = (label: string, value: number) => {
            const card = statsGrid.createDiv({ cls: 'first-task-stat-card' });
            card.createDiv({ cls: 'first-task-stat-value', text: displayNumber(value, lang) });
            card.createDiv({ cls: 'first-task-stat-label', text: label });
        };

        mkCard(t(lang, 'stats_today'), stats.today);
        mkCard(t(lang, 'stats_yesterday'), stats.yesterday);
        mkCard(t(lang, 'stats_this_week'), stats.this_week);
        mkCard(t(lang, 'stats_last_month'), stats.last_month);
        mkCard(t(lang, 'stats_this_year'), stats.this_year);
        mkCard(t(lang, 'stats_total'), stats.total);

        const body = parent.createDiv({ cls: 'first-task-body' });
        const category = this.plugin.settings.panelCategory || '';
        const tasks = this.plugin.taskManager.getCompletedByCategory(category);

        if (tasks.length === 0) {
            this.renderEmpty(body, t(lang, 'panel_empty_completed'), '');
            return;
        }

        const visible = tasks.slice(0, this.visibleCount);
        for (const task of visible) this.renderTaskCard(body, task, true);

        if (tasks.length > this.visibleCount) {
            const remaining = tasks.length - this.visibleCount;
            const moreBtn = body.createEl('button', {
                cls: 'first-task-show-more',
                text: `${t(lang, 'panel_show_more')} (${displayNumber(remaining, lang)})`,
            });
            moreBtn.onclick = () => {
                this.visibleCount += this.plugin.settings.tasksPerPage;
                this.render();
            };
        }
    }

    /* ═══════════════════════════════════════════════════════
       نوار انتخاب
       ═══════════════════════════════════════════════════════ */
    private renderSelectionBar(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;
        const bar = parent.createDiv({ cls: 'first-task-selection-bar' });

        const countEl = bar.createDiv({ cls: 'first-task-selection-count' });
        countEl.setText(t(lang, 'bulk_selected_count', {
            count: displayNumber(this.selectedIds.size, lang),
        }));

        const actions = bar.createDiv({ cls: 'first-task-selection-actions' });

        /* ─── دکمه انتقال به Desktop ─── */
        const moveBtn = actions.createEl('button', {
            cls: 'first-task-selection-btn',
        });
        setIcon(moveBtn.createSpan({ cls: 'first-task-selection-icon' }), 'layout-dashboard');
        moveBtn.createSpan({ text: ' ' + t(lang, 'bulk_move_to_desktop') });
        moveBtn.disabled = this.selectedIds.size === 0;
        moveBtn.onclick = () => this.handleBulkMoveToDesktop();

        const delBtn = actions.createEl('button', {
            cls: 'first-task-selection-btn mod-warning',
        });
        setIcon(delBtn.createSpan({ cls: 'first-task-selection-icon' }), 'trash-2');
        delBtn.createSpan({ text: ' ' + t(lang, 'bulk_delete') });
        delBtn.disabled = this.selectedIds.size === 0;
        delBtn.onclick = () => this.handleBulkDelete();

        const editBtn = actions.createEl('button', {
            cls: 'first-task-selection-btn mod-cta',
        });
        setIcon(editBtn.createSpan({ cls: 'first-task-selection-icon' }), 'edit');
        editBtn.createSpan({ text: ' ' + t(lang, 'bulk_edit') });
        editBtn.disabled = this.selectedIds.size === 0;
        editBtn.onclick = () => this.handleBulkEdit();

        const cancelBtn = actions.createEl('button', {
            cls: 'first-task-selection-btn',
        });
        cancelBtn.setText(t(lang, 'bulk_cancel'));
        cancelBtn.onclick = () => this.exitSelectionMode();
    }

    /* ═══════════════════════════════════════════════════════
       مدیریت حالت انتخاب
       ═══════════════════════════════════════════════════════ */
    private enterSelectionMode(): void {
        this.selectionMode = true;
        this.selectedIds.clear();
        this.render();
    }

    private exitSelectionMode(): void {
        this.selectionMode = false;
        this.selectedIds.clear();
        this.render();
    }

    private toggleTaskSelection(taskId: string): void {
        if (this.selectedIds.has(taskId)) {
            this.selectedIds.delete(taskId);
        } else {
            this.selectedIds.add(taskId);
        }
        this.render();
    }

    /* ─── حذف گروهی ─── */
    private async handleBulkDelete(): Promise<void> {
        const lang = this.plugin.settings.language;
        const count = this.selectedIds.size;
        if (count === 0) return;

        const confirmMsg = t(lang, 'bulk_delete_confirm', {
            count: displayNumber(count, lang),
        });
        if (!window.confirm(confirmMsg)) return;

        const ids = Array.from(this.selectedIds);
        const ok = await this.plugin.taskManager.bulkDelete(ids);

        if (ok) {
            this.plugin.toastManager.show(t(lang, 'notice_bulk_deleted'), 'success');
            this.exitSelectionMode();
        }
    }

    /* ─── ویرایش گروهی ─── */
    private handleBulkEdit(): void {
        if (this.selectedIds.size === 0) return;
        const ids = Array.from(this.selectedIds);

        new BulkEditModal(this.app, this.plugin, ids, () => {
            this.exitSelectionMode();
        }).open();
    }

    /* ─── انتقال گروهی به Desktop ─── */
    private async handleBulkMoveToDesktop(): Promise<void> {
        if (this.selectedIds.size === 0) return;
        const lang = this.plugin.settings.language;
        const count = this.selectedIds.size;

        const msg = t(lang, 'bulk_move_to_desktop_confirm', {
            count: displayNumber(count, lang),
        });
        if (!window.confirm(msg)) return;

        const ids = Array.from(this.selectedIds);

        try {
            const result = await this.plugin.importManager.moveTasksFromNotes(
                ids,
                {
                    deleteFromNote: true,
                    assignCategory: '',
                }
            );

            if (result.imported > 0) {
                this.plugin.toastManager.show(
                    t(lang, 'notice_bulk_moved', {
                        count: displayNumber(result.imported, lang),
                    }),
                    'success'
                );
                this.exitSelectionMode();
                this.plugin.refreshPanel();
            } else {
                this.plugin.toastManager.show(
                    lang === 'fa' ? 'انتقال ناموفق' : 'Move failed',
                    'error'
                );
            }
        } catch (e) {
            console.warn('[First Task] Bulk move failed:', e);
            this.plugin.toastManager.show(
                lang === 'fa' ? 'خطا در انتقال' : 'Move error',
                'error'
            );
        }
    }

    /* ═══════════════════════════════════════════════════════
       کارت تسک
       ═══════════════════════════════════════════════════════ */
    private renderTaskCard(parent: HTMLElement, task: ExtractedTask, isCompleted: boolean): void {
        const lang = this.plugin.settings.language;
        const useJalali = this.plugin.settings.useJalaliDate;

        const pinnedClass = task.pinned && !isCompleted ? ' is-pinned' : '';
        const isSelected = this.selectedIds.has(task._id);
        const selectedClass = isSelected ? ' is-selected' : '';

        const card = parent.createDiv({ cls: 'first-task-card' + pinnedClass + selectedClass });
        card.dataset.taskId = task._id;

        const cbWrap = card.createDiv({ cls: 'first-task-card-checkbox' });

        if (this.selectionMode) {
            const selCb = cbWrap.createEl('input', { type: 'checkbox' });
            selCb.checked = isSelected;
            selCb.onclick = (e) => {
                e.stopPropagation();
                this.toggleTaskSelection(task._id);
            };
        } else {
            const cb = cbWrap.createEl('input', { type: 'checkbox' });
            cb.checked = isCompleted;
            cb.onclick = async (e) => {
                e.stopPropagation();
                cb.disabled = true;
                const ok = await this.plugin.taskManager.toggleComplete(task._id);
                if (ok) {
                    this.plugin.toastManager.show(
                        t(lang, isCompleted ? 'notice_task_restored' : 'notice_task_completed'),
                        'success'
                    );
                    this.render();
                } else {
                    cb.disabled = false;
                    cb.checked = isCompleted;
                }
            };
        }

        const bodyCard = card.createDiv({ cls: 'first-task-card-body' });

        const titleRow = bodyCard.createDiv({ cls: 'first-task-card-title-row' });
        if (task.pinned && !isCompleted) {
            const pinIcon = titleRow.createSpan({ cls: 'first-task-pin-icon' });
            setIcon(pinIcon, 'pin');
        }
        titleRow.createDiv({ cls: 'first-task-card-title', text: task.title });

        const meta = bodyCard.createDiv({ cls: 'first-task-card-meta' });

        const dateDisplay = useJalali ? task.due_date_jalali : task.due_date_gregorian;
        if (dateDisplay) {
            const dateEl = meta.createSpan({ cls: 'first-task-card-date' });
            setIcon(dateEl.createSpan({ cls: 'first-task-icon' }), 'calendar');
            dateEl.createSpan({ text: ' ' + displayString(dateDisplay, lang) });
        }

        if (task.category) {
            const catEl = meta.createSpan({ cls: 'first-task-card-cat' });
            setIcon(catEl.createSpan({ cls: 'first-task-icon' }), 'tag');
            catEl.createSpan({
                text: ' ' + this.plugin.taskManager.getCategoryDisplayName(task.category),
            });
        }

        const noteEl = meta.createSpan({ cls: 'first-task-card-note' });
        setIcon(noteEl.createSpan({ cls: 'first-task-icon' }), 'file-text');
        noteEl.createSpan({
            text: ' ' + this.plugin.taskManager.getDisplayNoteName(task._source_file),
        });

        if (!isCompleted && this.plugin.settings.showTaskBadges) {
            const dynCats = this.plugin.taskManager.getTaskDynamicCategories(task);
            if (dynCats.length > 0) {
                const badgesRow = bodyCard.createDiv({ cls: 'first-task-card-badges' });
                for (const c of dynCats) {
                    const badge = badgesRow.createSpan({
                        cls: `first-task-dynamic-badge first-task-dynamic-${c}`,
                    });
                    badge.setText(t(lang, `category_${c}` as any));
                }
            }
        }

        bodyCard.onclick = () => {
            if (this.selectionMode) {
                this.toggleTaskSelection(task._id);
            } else {
                new TaskDetailsModal(this.app, this.plugin, task, () => this.render()).open();
            }
        };
    }

    /* ─── حالت خالی ─── */
    private renderEmpty(parent: HTMLElement, title: string, hint: string): void {
        const empty = parent.createDiv({ cls: 'first-task-empty' });
        empty.createEl('p', { text: title, cls: 'first-task-empty-title' });
        if (hint) empty.createEl('p', { text: hint, cls: 'first-task-empty-hint' });
    }

    /* ─── Rescan ─── */
    private async handleRescan(): Promise<void> {
        const lang = this.plugin.settings.language;
        this.plugin.toastManager.show(t(lang, 'panel_reloading'), 'info', 1500);
        try {
            await this.plugin.taskManager.rescanAll();
            this.visibleCount = this.plugin.settings.tasksPerPage;
            this.plugin.toastManager.show(t(lang, 'notice_rescan_ok'), 'success');
            this.render();
        } catch (e: any) {
            this.plugin.toastManager.show(
                t(lang, 'notice_rescan_failed', { error: e?.message || 'unknown' }),
                'error'
            );
        }
    }

    private handleNewTask(): void {
        new CreateTaskModal(this.app, this.plugin, () => this.render()).open();
    }
}
