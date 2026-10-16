/* ════════════════════════════════════════════════════════════
   📅 Planner — v0.2.1
   ✅ شمارش با Desktop tasks
   ✅ فیلتر نامعتبر → ریست خودکار
   ✅ Layout درست
   ════════════════════════════════════════════════════════════ */

import { ItemView, WorkspaceLeaf, setIcon } from 'obsidian';
import type FirstTaskPlugin from '../main';
import type { ExtractedTask, PlannerCard, DesktopTask } from '../types';
import { t, applyDirection } from '../i18n';
import { displayNumber, displayString } from '../utils/numberUtils';
import { TaskDetailsModal } from './TaskDetailsModal';
import { BulkEditModal } from './BulkEditModal';

export const VIEW_TYPE_PLANNER = 'first-task-planner';

export class PlannerView extends ItemView {
    plugin: FirstTaskPlugin;
    private visibleCount: number = 0;
    private selectionMode: boolean = false;
    private selectedIds: Set<string> = new Set();

    constructor(leaf: WorkspaceLeaf, plugin: FirstTaskPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string { return VIEW_TYPE_PLANNER; }
    getDisplayText(): string { return t(this.plugin.settings.language, 'planner_title'); }
    getIcon(): string { return 'calendar-days'; }

    async onOpen(): Promise<void> {
        this.visibleCount = this.plugin.settings.tasksPerPage;
        this.plugin.toastManager.setRTL(this.plugin.settings.language === 'fa');
        this.render();
    }

    async onClose(): Promise<void> {}

    refresh(): void { this.render(); }

    /* 🆕 چک معتبر بودن دسته */
    private getValidCategory(): string {
        const cat = this.plugin.settings.plannerCategory || '';
        if (!cat) return '';
        if (cat === 'none') return 'none';

        const categories = this.plugin.taskManager.getCategories();
        const exists = categories.some(c => c.id === cat);

        if (!exists) {
            this.plugin.settings.plannerCategory = '';
            this.plugin.saveSettings();
            return '';
        }

        return cat;
    }

    /* ═══════════════════════════════════════════════════════
       رندر
       ═══════════════════════════════════════════════════════ */
    private render(): void {
        const { contentEl } = this;
        const savedScroll = contentEl.scrollTop;

        contentEl.empty();
        contentEl.addClass('first-task-panel');
        contentEl.addClass('first-task-planner');
        applyDirection(contentEl, this.plugin.settings.language);
        this.plugin.toastManager.setRTL(this.plugin.settings.language === 'fa');

        this.renderHeader(contentEl);
        this.renderCategoryDropdown(contentEl);
        this.renderStatCards(contentEl);
        this.renderTasksList(contentEl);

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
            text: t(lang, 'planner_title'),
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
    }

    /* ─── dropdown دسته‌بندی ─── */
    private renderCategoryDropdown(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;
        const cats = this.plugin.taskManager.getCategories();
        const hasUncategorized = this.plugin.taskManager.hasTasksWithoutCategory();
        const validCategory = this.getValidCategory();

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

        select.value = validCategory;

        /* 🆕 highlight فیلتر فعال */
        if (validCategory) {
            select.classList.add('is-filtered');
        }

        select.onchange = async () => {
            this.plugin.settings.plannerCategory = select.value;
            this.plugin.settings.plannerCard = 'all';
            await this.plugin.saveSettings();
            this.visibleCount = this.plugin.settings.tasksPerPage;
            this.contentEl.scrollTop = 0;
            this.render();
        };
    }

    /* ═══════════════════════════════════════════════════════
       کارت‌های آماری — با Desktop tasks
       ═══════════════════════════════════════════════════════ */
    private renderStatCards(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;
        const category = this.getValidCategory();
        const stats = this.plugin.taskManager.getCategoryStats(category);
        const activeCard = this.plugin.settings.plannerCard || 'all';
        const visibility = this.plugin.settings.plannerCards;

        /* 🆕 شمارش Desktop tasks */
        const desktopStats = this.getDesktopStatsForCategory(category);

        const allCards: PlannerCard[] = [];

        if (visibility.past) allCards.push('past');
        if (visibility.today) allCards.push('today');
        if (visibility.tomorrow) allCards.push('tomorrow');
        if (visibility.this_week) allCards.push('this_week');
        if (visibility.next_week) allCards.push('next_week');
        if (visibility.this_month) allCards.push('this_month');
        if (visibility.next_month) allCards.push('next_month');
        if (visibility.this_year) allCards.push('this_year');
        if (visibility.next_year) allCards.push('next_year');

        if (allCards.length > 0) {
            const grid = parent.createDiv({ cls: 'first-task-stats-grid first-task-stats-grid-auto' });
            for (const c of allCards) {
                const noteCount = this.getCount(stats, c);
                const desktopCount = desktopStats[c] || 0;
                this.mkStatCard(grid, c, this.getCardLabel(c, lang), noteCount + desktopCount, activeCard);
            }
        }

        /* ─── no_date و all ─── */
        const row4 = parent.createDiv({ cls: 'first-task-planner-stats-row-3' });
        this.mkStatCard(row4, 'no_date',
            t(lang, 'planner_stat_no_date'),
            stats.no_date + (desktopStats['no_date'] || 0),
            activeCard);
        this.mkStatCard(row4, 'all',
            t(lang, 'planner_stat_all'),
            stats.all + (desktopStats['all'] || 0),
            activeCard);
    }

    /* 🆕 محاسبه‌ی Desktop stats بر اساس card */
    private getDesktopStatsForCategory(category: string): Record<string, number> {
        const result: Record<string, number> = {};

        if (!this.plugin.settings.desktop.enabled ||
            !this.plugin.settings.desktop.showInPlanner) {
            return result;
        }

        const desktopTasks = this.plugin.desktopStore.getByCategory(category);

        const now = Date.now();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const tomorrowStart = todayStart.getTime() + 86400000;
        const weekStart = todayStart.getTime() - 6 * 86400000;
        const weekEnd = todayStart.getTime() + 7 * 86400000;
        const nextWeekStart = weekEnd;
        const nextWeekEnd = nextWeekStart + 7 * 86400000;

        const todayTs = todayStart.getTime();

        const countByCard = (card: string): number => {
            switch (card) {
                case 'past':
                    return desktopTasks.filter(t =>
                        t.due_date_ts > 0 && t.due_date_ts < todayTs
                    ).length;
                case 'today':
                    return desktopTasks.filter(t => {
                        if (!t.due_date_ts) return false;
                        const d = new Date(t.due_date_ts);
                        d.setHours(0, 0, 0, 0);
                        return d.getTime() === todayTs;
                    }).length;
                case 'tomorrow':
                    return desktopTasks.filter(t => {
                        if (!t.due_date_ts) return false;
                        const d = new Date(t.due_date_ts);
                        d.setHours(0, 0, 0, 0);
                        return d.getTime() === tomorrowStart;
                    }).length;
                case 'this_week':
                    return desktopTasks.filter(t =>
                        t.due_date_ts >= weekStart &&
                        t.due_date_ts < weekEnd &&
                        t.due_date_ts >= todayTs
                    ).length;
                case 'next_week':
                    return desktopTasks.filter(t =>
                        t.due_date_ts >= nextWeekStart &&
                        t.due_date_ts < nextWeekEnd
                    ).length;
                case 'no_date':
                    return desktopTasks.filter(t => !t.due_date_ts).length;
                case 'all':
                    return desktopTasks.length;
                default:
                    return 0;
            }
        };

        for (const card of ['past', 'today', 'tomorrow', 'this_week', 'next_week', 'no_date', 'all']) {
            result[card] = countByCard(card);
        }

        return result;
    }

    private getCardLabel(card: PlannerCard, lang: 'en' | 'fa'): string {
        const map: Record<PlannerCard, any> = {
            past: 'planner_stat_past',
            today: 'planner_stat_today',
            tomorrow: 'planner_stat_tomorrow',
            this_week: 'planner_stat_this_week',
            next_week: 'planner_stat_next_week',
            this_month: 'planner_stat_this_month',
            next_month: 'planner_stat_next_month',
            this_year: 'planner_stat_this_year',
            next_year: 'planner_stat_next_year',
            no_date: 'planner_stat_no_date',
            all: 'planner_stat_all',
        };
        return t(lang, map[card]);
    }

    private getCount(stats: any, card: PlannerCard): number {
        return stats[card] || 0;
    }

    private mkStatCard(
        parent: HTMLElement,
        cardId: PlannerCard,
        label: string,
        count: number,
        activeCard: PlannerCard
    ): void {
        const lang = this.plugin.settings.language;
        const isActive = activeCard === cardId;
        const card = parent.createDiv({
            cls: 'first-task-stat-card first-task-planner-stat-card' + (isActive ? ' is-active' : ''),
        });
        card.dataset.card = cardId;

        card.createDiv({
            cls: 'first-task-stat-value',
            text: displayNumber(count, lang),
        });
        card.createDiv({
            cls: 'first-task-stat-label',
            text: label,
        });

        card.onclick = async () => {
            if (this.plugin.settings.plannerCard === cardId) return;
            this.plugin.settings.plannerCard = cardId;
            await this.plugin.saveSettings();
            this.visibleCount = this.plugin.settings.tasksPerPage;
            this.contentEl.scrollTop = 0;
            this.render();
        };
    }

    /* ─── لیست تسک‌ها ─── */
    private renderTasksList(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;
        const card = this.plugin.settings.plannerCard || 'all';
        const category = this.getValidCategory();

        const headerRow = parent.createDiv({ cls: 'first-task-planner-tasks-header' });
        const titleSpan = headerRow.createEl('span', { cls: 'first-task-planner-tasks-title' });
        titleSpan.setText(`${t(lang, 'planner_tasks_in')} ${this.getCardLabel(card, lang)}`);

        const allTasks = this.plugin.taskManager.getTasksByCategory(category);
        const filtered = this.plugin.taskManager.filterByCard(allTasks, card);

        /* 🆕 Desktop tasks */
        const desktopTasks: DesktopTask[] = [];
        if (this.plugin.settings.desktop.enabled &&
            this.plugin.settings.desktop.showInPlanner) {
            const dt = this.plugin.desktopStore.getByCategory(category);
            const filteredDt = this.filterDesktopByCard(dt, card);
            desktopTasks.push(...filteredDt);
        }

        const totalCount = filtered.length + desktopTasks.length;
        const countSpan = headerRow.createEl('span', { cls: 'first-task-planner-tasks-count' });
        countSpan.setText(`(${displayNumber(totalCount, lang)})`);

        if (totalCount === 0) {
            const empty = parent.createDiv({ cls: 'first-task-empty' });
            empty.createEl('p', {
                text: t(lang, 'planner_no_tasks'),
                cls: 'first-task-empty-title',
            });
            return;
        }

        const body = parent.createDiv({ cls: 'first-task-body' });
        const visible = filtered.slice(0, this.visibleCount);

        for (const task of visible) this.renderTaskCard(body, task);

        /* 🆕 Desktop tasks */
        const remaining = Math.max(0, this.visibleCount - filtered.length);
        const desktopVisible = desktopTasks.slice(0, remaining);
        for (const task of desktopVisible) this.renderDesktopTaskCard(body, task);

        if (totalCount > this.visibleCount) {
            const remainingCount = totalCount - this.visibleCount;
            const moreBtn = body.createEl('button', {
                cls: 'first-task-show-more',
                text: `${t(lang, 'panel_show_more')} (${displayNumber(remainingCount, lang)})`,
            });
            moreBtn.onclick = () => {
                this.visibleCount += this.plugin.settings.tasksPerPage;
                this.render();
            };
        }
    }

    /* 🆕 فیلتر Desktop tasks بر اساس card */
    private filterDesktopByCard(tasks: DesktopTask[], card: PlannerCard): DesktopTask[] {
        const now = Date.now();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const todayTs = todayStart.getTime();
        const tomorrowStart = todayTs + 86400000;
        const weekStart = todayTs - 6 * 86400000;
        const weekEnd = todayTs + 7 * 86400000;
        const nextWeekStart = weekEnd;
        const nextWeekEnd = nextWeekStart + 7 * 86400000;

        switch (card) {
            case 'past':
                return tasks.filter(t =>
                    t.due_date_ts > 0 && t.due_date_ts < todayTs
                );
            case 'today':
                return tasks.filter(t => {
                    const ts = t.due_date_ts;
                    if (!ts) return false;
                    const tsStart = new Date(ts);
                    tsStart.setHours(0, 0, 0, 0);
                    return tsStart.getTime() === todayTs;
                });
            case 'tomorrow':
                return tasks.filter(t => {
                    const ts = t.due_date_ts;
                    if (!ts) return false;
                    const tsStart = new Date(ts);
                    tsStart.setHours(0, 0, 0, 0);
                    return tsStart.getTime() === tomorrowStart;
                });
            case 'this_week':
                return tasks.filter(t =>
                    t.due_date_ts >= weekStart &&
                    t.due_date_ts < weekEnd &&
                    t.due_date_ts >= todayTs
                );
            case 'next_week':
                return tasks.filter(t =>
                    t.due_date_ts >= nextWeekStart &&
                    t.due_date_ts < nextWeekEnd
                );
            case 'no_date':
                return tasks.filter(t => !t.due_date_ts);
            case 'all':
                return tasks;
            default:
                return tasks;
        }
    }

    /* ─── کارت تسک ─── */
    private renderTaskCard(parent: HTMLElement, task: ExtractedTask): void {
        const lang = this.plugin.settings.language;
        const useJalali = this.plugin.settings.useJalaliDate;
        const isSelected = this.selectedIds.has(task._id);
        const selectedClass = isSelected ? ' is-selected' : '';

        const card = parent.createDiv({
            cls: 'first-task-card' + (task.pinned ? ' is-pinned' : '') + selectedClass,
        });
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
            cb.checked = false;
            cb.onclick = async (e) => {
                e.stopPropagation();
                cb.disabled = true;
                const ok = await this.plugin.taskManager.toggleComplete(task._id);
                if (ok) {
                    this.plugin.toastManager.show(t(lang, 'notice_task_completed'), 'success');
                    this.plugin.refreshPanel();
                } else {
                    cb.disabled = false;
                }
            };
        }

        const bodyCard = card.createDiv({ cls: 'first-task-card-body' });

        const titleRow = bodyCard.createDiv({ cls: 'first-task-card-title-row' });
        if (task.pinned) {
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

        bodyCard.onclick = () => {
            if (this.selectionMode) {
                this.toggleTaskSelection(task._id);
            } else {
                new TaskDetailsModal(this.app, this.plugin, task, () => {
                    this.plugin.refreshPanel();
                }).open();
            }
        };
    }

    /* 🆕 کارت تسک Desktop */
    private renderDesktopTaskCard(parent: HTMLElement, task: DesktopTask): void {
        const lang = this.plugin.settings.language;
        const useJalali = this.plugin.settings.useJalaliDate;

        const card = parent.createDiv({ cls: 'first-task-card is-desktop' });

        const cbWrap = card.createDiv({ cls: 'first-task-card-checkbox' });
        const cb = cbWrap.createEl('input', { type: 'checkbox' });
        cb.checked = false;

        const bodyCard = card.createDiv({ cls: 'first-task-card-body' });
        const titleRow = bodyCard.createDiv({ cls: 'first-task-card-title-row' });
        titleRow.createDiv({ cls: 'first-task-card-title', text: task.title });

        const meta = bodyCard.createDiv({ cls: 'first-task-card-meta' });

        const dateDisplay = useJalali ? task.due_date_jalali : task.due_date_gregorian;
        if (dateDisplay) {
            const dateEl = meta.createSpan({ cls: 'first-task-card-date' });
            setIcon(dateEl.createSpan({ cls: 'first-task-icon' }), 'calendar');
            dateEl.createSpan({ text: ' ' + displayString(dateDisplay, lang) });
        }

        const desktopEl = meta.createSpan({ cls: 'first-task-card-note' });
        setIcon(desktopEl.createSpan({ cls: 'first-task-icon' }), 'layout-dashboard');
        desktopEl.createSpan({ text: ' ' + t(lang, 'desktop_badge') });

        bodyCard.onclick = () => {
            this.plugin.activateDesktopView();
        };
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
        const ok = await this.plugin.taskManager.bulkDelete(ids);

        if (ok) {
            this.plugin.toastManager.show(t(lang, 'notice_bulk_deleted'), 'success');
            this.exitSelectionMode();
            this.plugin.refreshPanel();
        }
    }

    private handleBulkEdit(): void {
        if (this.selectedIds.size === 0) return;
        const ids = Array.from(this.selectedIds);

        new BulkEditModal(this.app, this.plugin, ids, () => {
            this.exitSelectionMode();
            this.plugin.refreshPanel();
        }).open();
    }

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

    private async handleRescan(): Promise<void> {
        const lang = this.plugin.settings.language;
        this.plugin.toastManager.show(t(lang, 'panel_reloading'), 'info', 1500);
        try {
            await this.plugin.taskManager.rescanAll();
            this.visibleCount = this.plugin.settings.tasksPerPage;
            this.plugin.toastManager.show(t(lang, 'notice_rescan_ok'), 'success');
            this.plugin.refreshPanel();
        } catch (e: any) {
            this.plugin.toastManager.show(
                t(lang, 'notice_rescan_failed', { error: e?.message || 'unknown' }),
                'error'
            );
        }
    }
}
