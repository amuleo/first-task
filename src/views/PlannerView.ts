/* ════════════════════════════════════════════════════════════
   📅 پلنر — نمایش تسک‌ها بر اساس زمان‌بندی
   ✅ dropdown دسته‌بندی
   ✅ ۸ کارت آماری کلیک‌پذیر
   ✅ لیست تسک بر اساس کارت انتخاب‌شده
   ════════════════════════════════════════════════════════════ */

import { ItemView, WorkspaceLeaf, setIcon } from 'obsidian';
import type FirstTaskPlugin from '../main';
import type { ExtractedTask, PlannerCard } from '../types';
import { t, applyDirection } from '../i18n';
import { formatCount } from '../utils/formatUtils';
import { TaskDetailsModal } from './TaskDetailsModal';

export const VIEW_TYPE_PLANNER = 'first-task-planner';

export class PlannerView extends ItemView {
    plugin: FirstTaskPlugin;
    private visibleCount: number = 0;
    private scrolling: boolean = false;

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

    refresh(): void {
        /* اگه کاربر داره اسکرول می‌کنه، رفرش رو بذار برای بعد */
        if (this.scrolling) return;
        this.render();
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

        const row = parent.createDiv({ cls: 'first-task-category-row' });
        const select = row.createEl('select', { cls: 'dropdown first-task-category-select' });

        select.createEl('option', {
            value: '',
            text: t(lang, 'panel_all_categories'),
        });

        for (const c of cats) {
            const label = lang === 'fa' ? c.name_fa : c.name;
            select.createEl('option', { value: c.id, text: label });
        }

        select.createEl('option', {
            value: 'none',
            text: t(lang, 'panel_no_category'),
        });

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

        /* ─── ردیف ۱: گذشته، امروز، فردا ─── */
        const row1 = parent.createDiv({ cls: 'first-task-stats-grid' });
        this.mkStatCard(row1, 'past', t(lang, 'planner_stat_past'), stats.past, activeCard);
        this.mkStatCard(row1, 'today', t(lang, 'planner_stat_today'), stats.today, activeCard);
        this.mkStatCard(row1, 'tomorrow', t(lang, 'planner_stat_tomorrow'), stats.tomorrow, activeCard);

        /* ─── ردیف ۲: این هفته، این ماه، امسال ─── */
        const row2 = parent.createDiv({ cls: 'first-task-stats-grid' });
        this.mkStatCard(row2, 'this_week', t(lang, 'planner_stat_this_week'), stats.this_week, activeCard);
        this.mkStatCard(row2, 'this_month', t(lang, 'planner_stat_this_month'), stats.this_month, activeCard);
        this.mkStatCard(row2, 'this_year', t(lang, 'planner_stat_this_year'), stats.this_year, activeCard);

        /* ─── ردیف ۳: بدون تاریخ، همه ─── */
        const row3 = parent.createDiv({ cls: 'first-task-planner-stats-row-3' });
        this.mkStatCard(row3, 'no_date', t(lang, 'planner_stat_no_date'), stats.no_date, activeCard);
        this.mkStatCard(row3, 'all', t(lang, 'planner_stat_all'), stats.all, activeCard);
    }

    private mkStatCard(
        parent: HTMLElement,
        cardId: PlannerCard,
        label: string,
        count: number,
        activeCard: PlannerCard
    ): void {
        const isActive = activeCard === cardId;
        const card = parent.createDiv({
            cls: 'first-task-stat-card first-task-planner-stat-card' + (isActive ? ' is-active' : ''),
        });
        card.dataset.card = cardId;

        card.createDiv({
            cls: 'first-task-stat-value',
            text: formatCount(count),
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
        titleSpan.setText(`${t(lang, 'planner_tasks_in')} ${t(lang, `planner_stat_${card}` as any)}`);

        /* ─── گرفتن تسک‌ها ─── */
        const allTasks = this.plugin.taskManager.getTasksByCategory(
            this.plugin.settings.plannerCategory || ''
        );
        const filtered = this.plugin.taskManager.filterByCard(allTasks, card);

        const countSpan = headerRow.createEl('span', { cls: 'first-task-planner-tasks-count' });
        countSpan.setText(`(${formatCount(filtered.length)})`);

        /* ─── حالت خالی ─── */
        if (filtered.length === 0) {
            const empty = parent.createDiv({ cls: 'first-task-empty' });
            empty.createEl('p', {
                text: t(lang, 'planner_no_tasks'),
                cls: 'first-task-empty-title',
            });
            return;
        }

        /* ─── لیست ─── */
        const body = parent.createDiv({ cls: 'first-task-body' });
        const visible = filtered.slice(0, this.visibleCount);

        for (const task of visible) {
            this.renderTaskCard(body, task);
        }

        /* ─── نمایش بیشتر ─── */
        if (filtered.length > this.visibleCount) {
            const remaining = filtered.length - this.visibleCount;
            const moreBtn = body.createEl('button', {
                cls: 'first-task-show-more',
                text: `${t(lang, 'panel_show_more')} (${formatCount(remaining)})`,
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
            dateEl.createSpan({ text: ' ' + dateDisplay });
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
