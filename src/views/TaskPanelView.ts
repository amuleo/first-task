/* ════════════════════════════════════════════════════════════
   📋 پنل اصلی — v0.1.2
   ✅ dropdown دسته‌بندی
   ✅ اعداد داینامیک
   ✅ نمایش badge ها بر اساس تنظیمات کاربر
   ✅ بدون گروه‌بندی
   ════════════════════════════════════════════════════════════ */

import { ItemView, WorkspaceLeaf, setIcon } from 'obsidian';
import type FirstTaskPlugin from '../main';
import type { ExtractedTask } from '../types';
import { t, applyDirection } from '../i18n';
import { displayNumber, displayString } from '../utils/numberUtils';
import { CreateTaskModal } from './CreateTaskModal';
import { TaskDetailsModal } from './TaskDetailsModal';

export const VIEW_TYPE_FIRST_TASK = 'first-task-panel';

export class TaskPanelView extends ItemView {
    plugin: FirstTaskPlugin;
    private visibleCount: number = 0;

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

        requestAnimationFrame(() => {
            contentEl.scrollTop = savedScroll;
        });
    }

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

        if (this.plugin.settings.currentTab === 'pending') {
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

        const mkTab = (id: 'pending' | 'completed', icon: string, label: string, count: number) => {
            const btn = tabs.createEl('button', {
                cls: 'first-task-tab' + (this.plugin.settings.currentTab === id ? ' is-active' : ''),
            });
            setIcon(btn.createSpan({ cls: 'first-task-tab-icon' }), icon);
            btn.createSpan({ text: ` ${label} (${displayNumber(count, lang)})` });
            btn.onclick = async () => {
                if (this.plugin.settings.currentTab === id) return;
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

    /* ─── کارت تسک ─── */
    private renderTaskCard(parent: HTMLElement, task: ExtractedTask, isCompleted: boolean): void {
        const lang = this.plugin.settings.language;
        const useJalali = this.plugin.settings.useJalaliDate;
        const pinnedClass = (task.pinned && !isCompleted) ? ' is-pinned' : '';
        const card = parent.createDiv({ cls: 'first-task-card' + pinnedClass });
        card.dataset.taskId = task._id;

        const cbWrap = card.createDiv({ cls: 'first-task-card-checkbox' });
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

        /* ─── badge های داینامیک (فقط اگه کاربر بخواد) ─── */
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
            new TaskDetailsModal(this.app, this.plugin, task, () => this.render()).open();
        };
    }

    private renderEmpty(parent: HTMLElement, title: string, hint: string): void {
        const empty = parent.createDiv({ cls: 'first-task-empty' });
        empty.createEl('p', { text: title, cls: 'first-task-empty-title' });
        if (hint) empty.createEl('p', { text: hint, cls: 'first-task-empty-hint' });
    }

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
