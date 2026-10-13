/* ════════════════════════════════════════════════════════════
   📅 Planner — v0.1.2
   ✅ ۹ کارت زمانی + بدون تاریخ + همه
   ✅ حالت انتخاب گروهی
   ✅ رفع باگ "تسک های undefined"
   ════════════════════════════════════════════════════════════ */

import { ItemView, WorkspaceLeaf, setIcon } from 'obsidian';
import type FirstTaskPlugin from '../main';
import type { ExtractedTask, PlannerCard } from '../types';
import { t, applyDirection } from '../i18n';
import { displayNumber, displayString } from '../utils/numberUtils';
import { TaskDetailsModal } from './TaskDetailsModal';
import { BulkEditModal } from './BulkEditModal';

export const VIEW_TYPE_PLANNER = 'first-task-planner';

export class PlannerView extends ItemView {
    plugin: FirstTaskPlugin;
    private visibleCount: number = 0;

    /* 🆕 حالت انتخاب گروهی */
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

        /* 🆕 دکمه انتخاب */
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

        select.value = this.plugin.settings.plannerCategory || '';
        select.onchange = async () => {
            this.plugin.settings.plannerCategory = select.value;
            this.plugin.settings.plannerCard = 'all';
            await this.plugin.saveSettings();
            this.visibleCount = this.plugin.settings.tasksPerPage;
            this.contentEl.scrollTop = 0;
            this.render();
        };
    }

    /* ─── کارت‌های آماری ─── */
    private renderStatCards(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;
        const stats = this.plugin.taskManager.getCategoryStats(
            this.plugin.settings.plannerCategory || ''
        );
        const activeCard = this.plugin.settings.plannerCard || 'all';
        const visibility = this.plugin.settings.plannerCards;

        /* ─── ردیف ۱: گذشته، امروز، فردا ─── */
        const row1: PlannerCard[] = [];
        if (visibility.past) row1.push('past');
        if (visibility.today) row1.push('today');
        if (visibility.tomorrow) row1.push('tomorrow');
        if (row1.length > 0) {
            const r = parent.createDiv({ cls: 'first-task-stats-grid' });
            for (const c of row1) {
                this.mkStatCard(r, c, this.getCardLabel(c, lang), this.getCount(stats, c), activeCard);
            }
        }

        /* ─── ردیف ۲: این هفته، این ماه، امسال ─── */
        const row2: PlannerCard[] = [];
        if (visibility.this_week) row2.push('this_week');
        if (visibility.this_month) row2.push('this_month');
        if (visibility.this_year) row2.push('this_year');
        if (row2.length > 0) {
            const r = parent.createDiv({ cls: 'first-task-stats-grid' });
            for (const c of row2) {
                this.mkStatCard(r, c, this.getCardLabel(c, lang), this.getCount(stats, c), activeCard);
            }
        }

        /* ─── ردیف ۳: هفته آینده، ماه آینده، سال آینده 🆕 ─── */
        const row3: PlannerCard[] = [];
        if (visibility.next_week) row3.push('next_week');
        if (visibility.next_month) row3.push('next_month');
        if (visibility.next_year) row3.push('next_year');
        if (row3.length > 0) {
            const r = parent.createDiv({ cls: 'first-task-stats-grid' });
            for (const c of row3) {
                this.mkStatCard(r, c, this.getCardLabel(c, lang), this.getCount(stats, c), activeCard);
            }
        }

        /* ─── ردیف ۴: بدون تاریخ، همه ─── */
        const row4 = parent.createDiv({ cls: 'first-task-planner-stats-row-3' });
        this.mkStatCard(row4, 'no_date', t(lang, 'planner_stat_no_date'), stats.no_date, activeCard);
        this.mkStatCard(row4, 'all', t(lang, 'planner_stat_all'), stats.all, activeCard);
    }

    /* 🆕 getCardLabel — کامل با همه‌ی کارت‌ها */
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

        const headerRow = parent.createDiv({ cls: 'first-task-planner-tasks-header' });
        const titleSpan = headerRow.createEl('span', { cls: 'first-task-planner-tasks-title' });
        titleSpan.setText(`${t(lang, 'planner_tasks_in')} ${this.getCardLabel(card, lang)}`);

        const allTasks = this.plugin.taskManager.getTasksByCategory(
            this.plugin.settings.plannerCategory || ''
        );
        const filtered = this.plugin.taskManager.filterByCard(allTasks, card);

        const countSpan = headerRow.createEl('span', { cls: 'first-task-planner-tasks-count' });
        countSpan.setText(`(${displayNumber(filtered.length, lang)})`);

        if (filtered.length === 0) {
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

        if (filtered.length > this.visibleCount) {
            const remaining = filtered.length - this.visibleCount;
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

        /* ─── چک‌باکس: انتخاب یا انجام ─── */
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
                    this.render();
                } else {
                    cb.disabled = false;
                }
            };
        }

        /* ─── بدنه ─── */
        const bodyCard = card.createDiv({ cls: 'first-task-card-body' });

        const titleRow = bodyCard.createDiv({ cls: 'first-task-card-title-row' });
        if (task.pinned) {
            const pinIcon = titleRow.createSpan({ cls: 'first-task-pin-icon' });
            setIcon(pinIcon, 'pin');
        }
        titleRow.createDiv({ cls: 'first-task-card-title', text: task.title });

        /* ─── متادیتا ─── */
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

        /* ─── کلیک روی کارت ─── */
        bodyCard.onclick = () => {
            if (this.selectionMode) {
                this.toggleTaskSelection(task._id);
            } else {
                new TaskDetailsModal(this.app, this.plugin, task, () => this.render()).open();
            }
        };
    }

    /* ═══════════════════════════════════════════════════════
       🆕 نوار انتخاب
       ═══════════════════════════════════════════════════════ */
    private renderSelectionBar(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;
        const bar = parent.createDiv({ cls: 'first-task-selection-bar' });

        const countEl = bar.createDiv({ cls: 'first-task-selection-count' });
        countEl.setText(t(lang, 'bulk_selected_count', { count: displayNumber(this.selectedIds.size, lang) }));

        const actions = bar.createDiv({ cls: 'first-task-selection-actions' });

        const delBtn = actions.createEl('button', { cls: 'first-task-selection-btn mod-warning' });
        setIcon(delBtn.createSpan({ cls: 'first-task-selection-icon' }), 'trash-2');
        delBtn.createSpan({ text: ' ' + t(lang, 'bulk_delete') });
        delBtn.disabled = this.selectedIds.size === 0;
        delBtn.onclick = () => this.handleBulkDelete();

        const editBtn = actions.createEl('button', { cls: 'first-task-selection-btn mod-cta' });
        setIcon(editBtn.createSpan({ cls: 'first-task-selection-icon' }), 'edit');
        editBtn.createSpan({ text: ' ' + t(lang, 'bulk_edit') });
        editBtn.disabled = this.selectedIds.size === 0;
        editBtn.onclick = () => this.handleBulkEdit();

        const cancelBtn = actions.createEl('button', { cls: 'first-task-selection-btn' });
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

        const confirmMsg = t(lang, 'bulk_delete_confirm', { count: displayNumber(count, lang) });
        if (!window.confirm(confirmMsg)) return;

        const ids = Array.from(this.selectedIds);
        const ok = await this.plugin.taskManager.bulkDelete(ids);
        if (ok) {
            this.plugin.toastManager.show(t(lang, 'notice_bulk_deleted'), 'success');
            this.exitSelectionMode();
        }
    }

    private handleBulkEdit(): void {
        if (this.selectedIds.size === 0) return;

        const ids = Array.from(this.selectedIds);
        new BulkEditModal(this.app, this.plugin, ids, () => {
            this.exitSelectionMode();
        }).open();
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
}
