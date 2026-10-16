/* ════════════════════════════════════════════════════════════
   🖥️ Desktop View — میز من (v0.2.0)
   ✅ پنل مستقل
   ✅ Tabs: در انتظار / انجام شده
   ✅ آمار
   ✅ انتخاب گروهی + Bulk Edit
   ✅ فیلتر دسته‌بندی
   ════════════════════════════════════════════════════════════ */

import { ItemView, WorkspaceLeaf, setIcon } from 'obsidian';
import type FirstTaskPlugin from '../main';
import type { DesktopTask } from '../types';
import { t, applyDirection } from '../i18n';
import { displayNumber, displayString } from '../utils/numberUtils';
import { DesktopCreateModal, DesktopTaskDetailsModal } from './DesktopTaskModal';
import { DesktopBulkEditModal } from './DesktopBulkEditModal';

export const VIEW_TYPE_DESKTOP = 'first-task-desktop';

export class DesktopView extends ItemView {
    plugin: FirstTaskPlugin;
    private visibleCount: number = 0;
    private selectionMode: boolean = false;
    private selectedIds: Set<string> = new Set();
    private currentTab: 'pending' | 'completed' = 'pending';

    constructor(leaf: WorkspaceLeaf, plugin: FirstTaskPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string { return VIEW_TYPE_DESKTOP; }

    getDisplayText(): string {
        return t(this.plugin.settings.language, 'desktop_title');
    }

    getIcon(): string { return 'layout-dashboard'; }

    async onOpen(): Promise<void> {
        this.visibleCount = this.plugin.settings.tasksPerPage;
        this.plugin.toastManager.setRTL(this.plugin.settings.language === 'fa');
        this.render();
    }

    async onClose(): Promise<void> {}

    refresh(): void {
        this.render();
    }

    /* ═══════════════════════════════════════════════════════
       Render
       ═══════════════════════════════════════════════════════ */
    private render(): void {
        const { contentEl } = this;
        const savedScroll = contentEl.scrollTop;

        contentEl.empty();
        contentEl.addClass('first-task-panel');
        contentEl.addClass('first-task-desktop');
        applyDirection(contentEl, this.plugin.settings.language);
        this.plugin.toastManager.setRTL(this.plugin.settings.language === 'fa');

        this.renderHeader(contentEl);
        this.renderCategoryDropdown(contentEl);
        this.renderTabs(contentEl);

        if (this.currentTab === 'pending') {
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

    /* ─── Header ─── */
    private renderHeader(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;
        const header = parent.createDiv({ cls: 'first-task-header' });
        const topRow = header.createDiv({ cls: 'first-task-header-top' });

        topRow.createEl('h4', {
            text: t(lang, 'desktop_title'),
            cls: 'first-task-title',
        });

        const actions = topRow.createDiv({ cls: 'first-task-header-actions' });

        if (!this.selectionMode) {
            const selectBtn = actions.createEl('button', { cls: 'clickable-icon' });
            setIcon(selectBtn, 'check-square');
            selectBtn.setAttribute('aria-label', t(lang, 'bulk_select'));
            selectBtn.onclick = () => this.enterSelectionMode();
        }

        if (this.currentTab === 'pending' && !this.selectionMode) {
            const addBtn = actions.createEl('button', { cls: 'clickable-icon' });
            setIcon(addBtn, 'plus');
            addBtn.setAttribute('aria-label', t(lang, 'desktop_new_task'));
            addBtn.onclick = () => this.handleNewTask();
        }
    }

    /* ─── Category Dropdown ─── */
    private renderCategoryDropdown(parent: HTMLElement): void {
        if (!this.plugin.settings.enableCategories) return;

        const lang = this.plugin.settings.language;
        const cats = this.plugin.taskManager.getCategories();
        const hasUncategorized = this.plugin.desktopStore.hasTasksWithoutCategory();

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
        select.onchange = () => {
            this.plugin.settings.panelCategory = select.value;
            this.plugin.saveSettings();
            this.visibleCount = this.plugin.settings.tasksPerPage;
            this.contentEl.scrollTop = 0;
            this.render();
        };
    }

    /* ─── Tabs ─── */
    private renderTabs(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;
        const tabs = parent.createDiv({ cls: 'first-task-tabs' });

        const currentCategory = this.plugin.settings.panelCategory || '';
        const pendingCount = this.plugin.desktopStore.getByCategory(currentCategory).length;
        const completedCount = this.plugin.desktopStore.getCompletedByCategory(currentCategory).length;

        const mkTab = (id: 'pending' | 'completed', icon: string, label: string, count: number) => {
            const btn = tabs.createEl('button', {
                cls: 'first-task-tab' + (this.currentTab === id ? ' is-active' : ''),
            });
            setIcon(btn.createSpan({ cls: 'first-task-tab-icon' }), icon);
            btn.createSpan({ text: ` ${label} (${displayNumber(count, lang)})` });

            btn.onclick = () => {
                if (this.currentTab === id) return;
                this.selectionMode = false;
                this.selectedIds.clear();
                this.currentTab = id;
                this.visibleCount = this.plugin.settings.tasksPerPage;
                this.contentEl.scrollTop = 0;
                this.render();
            };
        };

        mkTab('pending', 'circle-dot', t(lang, 'tab_pending'), pendingCount);
        mkTab('completed', 'check-circle', t(lang, 'tab_completed'), completedCount);
    }

    /* ─── Pending ─── */
    private renderPending(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;
        const body = parent.createDiv({ cls: 'first-task-body' });

        const category = this.plugin.settings.panelCategory || '';
        const tasks = this.plugin.desktopStore.getByCategory(category);

        if (tasks.length === 0) {
            this.renderEmpty(
                body,
                t(lang, 'desktop_empty'),
                t(lang, 'desktop_empty_hint')
            );
            return;
        }

        const visible = tasks.slice(0, this.visibleCount);
        for (const task of visible) {
            this.renderTaskCard(body, task, false);
        }

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

    /* ─── Completed ─── */
    private renderCompleted(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;

        /* ─── آمار ─── */
        const stats = this.plugin.desktopStore.getStats();
        const statsGrid = parent.createDiv({ cls: 'first-task-stats-grid' });

        const mkCard = (label: string, value: number) => {
            const card = statsGrid.createDiv({ cls: 'first-task-stat-card' });
            card.createDiv({ cls: 'first-task-stat-value', text: displayNumber(value, lang) });
            card.createDiv({ cls: 'first-task-stat-label', text: label });
        };

        mkCard(t(lang, 'desktop_stats_today'), stats.today);
        mkCard(t(lang, 'desktop_stats_this_week'), stats.this_week);
        mkCard(t(lang, 'desktop_stats_this_month'), stats.this_month);
        mkCard(t(lang, 'desktop_stats_this_year'), stats.this_year);
        mkCard(t(lang, 'desktop_stats_total'), stats.total);

        /* ─── لیست ─── */
        const body = parent.createDiv({ cls: 'first-task-body' });
        const category = this.plugin.settings.panelCategory || '';
        const tasks = this.plugin.desktopStore.getCompletedByCategory(category);

        if (tasks.length === 0) {
            this.renderEmpty(body, t(lang, 'desktop_empty_completed'), '');
            return;
        }

        const visible = tasks.slice(0, this.visibleCount);
        for (const task of visible) {
            this.renderTaskCard(body, task, true);
        }

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

    /* ─── Task Card ─── */
    private renderTaskCard(parent: HTMLElement, task: DesktopTask, isCompleted: boolean): void {
        const lang = this.plugin.settings.language;
        const useJalali = this.plugin.settings.useJalaliDate;

        const pinnedClass = task.pinned && !isCompleted ? ' is-pinned' : '';
        const isSelected = this.selectedIds.has(task.id);
        const selectedClass = isSelected ? ' is-selected' : '';

        const card = parent.createDiv({
            cls: 'first-task-card' + pinnedClass + selectedClass,
        });
        card.dataset.taskId = task.id;

        /* ─── Checkbox ─── */
        const cbWrap = card.createDiv({ cls: 'first-task-card-checkbox' });

        if (this.selectionMode) {
            const selCb = cbWrap.createEl('input', { type: 'checkbox' });
            selCb.checked = isSelected;
            selCb.onclick = (e) => {
                e.stopPropagation();
                this.toggleTaskSelection(task.id);
            };
        } else {
            const cb = cbWrap.createEl('input', { type: 'checkbox' });
            cb.checked = isCompleted;
            cb.onclick = async (e) => {
                e.stopPropagation();
                cb.disabled = true;
                const res = await this.plugin.desktopStore.toggleComplete(task.id);

                if (res.ok) {
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

        /* ─── Body ─── */
        const bodyCard = card.createDiv({ cls: 'first-task-card-body' });

        const titleRow = bodyCard.createDiv({ cls: 'first-task-card-title-row' });
        if (task.pinned && !isCompleted) {
            const pinIcon = titleRow.createSpan({ cls: 'first-task-pin-icon' });
            setIcon(pinIcon, 'pin');
        }
        titleRow.createDiv({ cls: 'first-task-card-title', text: task.title });

        /* ─── Meta ─── */
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

        /* ─── Desktop badge ─── */
        const desktopEl = meta.createSpan({ cls: 'first-task-card-note' });
        setIcon(desktopEl.createSpan({ cls: 'first-task-icon' }), 'layout-dashboard');
        desktopEl.createSpan({ text: ' ' + t(lang, 'desktop_badge') });

        /* ─── Click ─── */
        bodyCard.onclick = () => {
            if (this.selectionMode) {
                this.toggleTaskSelection(task.id);
            } else {
                new DesktopTaskDetailsModal(
                    this.app,
                    this.plugin,
                    task,
                    () => this.render()
                ).open();
            }
        };
    }

    /* ─── Empty ─── */
    private renderEmpty(parent: HTMLElement, title: string, hint: string): void {
        const empty = parent.createDiv({ cls: 'first-task-empty' });
        empty.createEl('p', { text: title, cls: 'first-task-empty-title' });
        if (hint) empty.createEl('p', { text: hint, cls: 'first-task-empty-hint' });
    }

    /* ═══════════════════════════════════════════════════════
       Selection Mode
       ═══════════════════════════════════════════════════════ */
    private renderSelectionBar(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;
        const bar = parent.createDiv({ cls: 'first-task-selection-bar' });

        const countEl = bar.createDiv({ cls: 'first-task-selection-count' });
        countEl.setText(t(lang, 'bulk_selected_count', {
            count: displayNumber(this.selectedIds.size, lang),
        }));

        const actions = bar.createDiv({ cls: 'first-task-selection-actions' });

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

    private async handleBulkDelete(): Promise<void> {
        const lang = this.plugin.settings.language;
        const count = this.selectedIds.size;
        if (count === 0) return;

        const confirmMsg = t(lang, 'bulk_delete_confirm', {
            count: displayNumber(count, lang),
        });
        if (!window.confirm(confirmMsg)) return;

        const ids = Array.from(this.selectedIds);
        const ok = await this.plugin.desktopStore.bulkDelete(ids);

        if (ok) {
            this.plugin.toastManager.show(t(lang, 'notice_bulk_deleted'), 'success');
            this.exitSelectionMode();
        }
    }

    private handleBulkEdit(): void {
        if (this.selectedIds.size === 0) return;
        const ids = Array.from(this.selectedIds);

        new DesktopBulkEditModal(this.app, this.plugin, ids, () => {
            this.exitSelectionMode();
        }).open();
    }

    /* ─── New Task ─── */
    private handleNewTask(): void {
        new DesktopCreateModal(this.app, this.plugin, () => this.render()).open();
    }
}
