/* ════════════════════════════════════════════════════════════
   📅 پلنر — v0.1.2
   ✅ کارت‌های قابل تنظیم
   ✅ اعداد داینامیک (فارسی/انگلیسی)
   ✅ نمایش دقیق بر اساس weekStartDay
   ════════════════════════════════════════════════════════════ */

import { ItemView, WorkspaceLeaf, setIcon } from 'obsidian';
import type FirstTaskPlugin from '../main';
import type { ExtractedTask, PlannerCard } from '../types';
import { t, applyDirection } from '../i18n';
import { displayNumber, displayString } from '../utils/numberUtils';
import { TaskDetailsModal } from './TaskDetailsModal';

export const VIEW_TYPE_PLANNER = 'first-task-planner';

export class PlannerView extends ItemView {
    plugin: FirstTaskPlugin;
    private visibleCount: number = 0;

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
    }

    /* ─── dropdown دسته‌بندی ─── */
    private renderCategoryDropdown(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;
        const cats = this.plugin.taskManager.getCategories();
        const hasUncategorized = this.plugin.taskManager.hasTasksWithoutCategory();

        const row = parent.createDiv({ cls: 'first-task-category-row' });
        const select = row.createEl('select', { cls: 'dropdown first-task-category-select' });

        /* ۱. همه */
        select.createEl('option', {
            value: '',
            text: t(lang, 'panel_all_categories'),
        });

        /* ۲. بدون دسته (اگه وجود داره) */
        if (hasUncategorized) {
            select.createEl('option', {
                value: 'none',
                text: t(lang, 'panel_no_category'),
            });
        }

        /* ۳. بقیه دسته‌ها */
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

        /* ─── ردیف ۱ (گذشته، امروز، فردا) ─── */
        const row1Cards: PlannerCard[] = [];
        if (visibility.past) row1Cards.push('past');
        if (visibility.today) row1Cards.push('today');
        if (visibility.tomorrow) row1Cards.push('tomorrow');

        if (row1Cards.length > 0) {
            const row1 = parent.createDiv({ cls: 'first-task-stats-grid' });
            for (const cardId of row1Cards) {
                this.mkStatCard(row1, cardId, this.getCardLabel(cardId, lang), this.getCount(stats, cardId), activeCard);
            }
        }

        /* ─── ردیف ۲ (این هفته، این ماه، امسال) ─── */
        const row2Cards: PlannerCard[] = [];
        if (visibility.this_week) row2Cards.push('this_week');
        if (visibility.this_month) row2Cards.push('this_month');
        if (visibility.this_year) row2Cards.push('this_year');

        if (row2Cards.length > 0) {
            const row2 = parent.createDiv({ cls: 'first-task-stats-grid' });
            for (const cardId of row2Cards) {
                this.mkStatCard(row2, cardId, this.getCardLabel(cardId, lang), this.getCount(stats, cardId), activeCard);
            }
        }

        /* ─── ردیف ۳ (بدون تاریخ، همه) ─── */
        const row3 = parent.createDiv({ cls: 'first-task-planner-stats-row-3' });
        this.mkStatCard(row3, 'no_date', t(lang, 'planner_stat_no_date'), stats.no_date, activeCard);
        this.mkStatCard(row3, 'all', t(lang, 'planner_stat_all'), stats.all, activeCard);
    }

    private getCardLabel(card: PlannerCard, lang: 'en' | 'fa'): string {
        const map: Record<string, any> = {
            past: 'planner_stat_past',
            today: 'planner_stat_today',
            tomorrow: 'planner_stat_tomorrow',
            this_week: 'planner_stat_this_week',
            this_month: 'planner_stat_this_month',
            this_year: 'planner_stat_this_year',
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

        /* ─── عنوان لیست ─── */
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
        const card = parent.createDiv({ cls: 'first-task-card' + (task.pinned ? ' is-pinned' : '') });

        /* ─── چک‌باکس ─── */
        const cbWrap = card.createDiv({ cls: 'first-task-card-checkbox' });
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

        bodyCard.onclick = () => {
            new TaskDetailsModal(this.app, this.plugin, task, () => this.render()).open();
        };
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
