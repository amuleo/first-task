/* ════════════════════════════════════════════════════════════
   🖥️ Desktop View — میز من (v0.3.0)
   ✅ فیلتر نامعتبر → ریست خودکار
   ✅ Highlight فیلتر فعال
   ════════════════════════════════════════════════════════════ */

import { ItemView, WorkspaceLeaf, setIcon } from 'obsidian';
import type FirstTaskPlugin from '../main';
import type {
    DesktopTask,
    RecurringSuggestion,
    SmartSuggestion,
} from '../types';
import { t, applyDirection } from '../i18n';
import { displayNumber, displayString } from '../utils/numberUtils';
import { DesktopCreateModal, DesktopTaskDetailsModal } from './DesktopTaskModal';
import { DesktopBulkEditModal } from './DesktopBulkEditModal';
import { ImportModal } from './ImportModal';

export const VIEW_TYPE_DESKTOP = 'first-task-desktop';

export class DesktopView extends ItemView {
    plugin: FirstTaskPlugin;
    private visibleCount: number = 0;
    private selectionMode: boolean = false;
    private selectedIds: Set<string> = new Set();
    private currentTab: 'pending' | 'completed' = 'pending';

    private smartSuggestions: SmartSuggestion[] = [];
    private recurringSuggestions: RecurringSuggestion[] = [];
    private suggestionsLoading = false;

    private dismissedSuggestionIds: Set<string> = new Set();
    private dismissedRecurringTemplateIds: Set<string> = new Set();

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
        await this.loadSuggestions();
        this.render();
    }

    async onClose(): Promise<void> {}

    refresh(): void {
        this.loadSuggestions().then(() => this.render());
    }

    private getValidCategory(): string {
        const cat = this.plugin.settings.panelCategory || '';
        if (!cat) return '';
        if (cat === 'none') return 'none';

        const categories = this.plugin.taskManager.getCategories();
        const exists = categories.some(c => c.id === cat);

        if (!exists) {
            this.plugin.settings.panelCategory = '';
            this.plugin.saveSettings();
            return '';
        }

        return cat;
    }

    private async loadSuggestions(): Promise<void> {
        if (this.suggestionsLoading) return;
        this.suggestionsLoading = true;

        try {
            if (this.plugin.settings.desktop.recurringEnabled) {
                const raw = this.plugin.recurringManager.getTodaysSuggestions();
                this.recurringSuggestions = raw.filter(
                    s => !this.dismissedRecurringTemplateIds.has(s.template.id)
                );
            } else {
                this.recurringSuggestions = [];
            }

            if (this.plugin.settings.desktop.suggestionsEnabled) {
                const all = await this.plugin.suggestionEngine.generateSuggestions();
                this.smartSuggestions = all.filter(
                    s => !this.dismissedSuggestionIds.has(s.id)
                );
            } else {
                this.smartSuggestions = [];
            }
        } catch (e) {
            console.warn('[First Task] loadSuggestions failed:', e);
            this.smartSuggestions = [];
            this.recurringSuggestions = [];
        } finally {
            this.suggestionsLoading = false;
        }
    }

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
            this.renderRecurringSuggestions(contentEl);
            this.renderSmartSuggestions(contentEl);
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
            const importBtn = actions.createEl('button', { cls: 'clickable-icon' });
            setIcon(importBtn, 'download');
            importBtn.setAttribute('aria-label', t(lang, 'import_title'));
            importBtn.onclick = () => this.handleImport();
        }

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

    private renderCategoryDropdown(parent: HTMLElement): void {
        if (!this.plugin.settings.enableCategories) return;

        const lang = this.plugin.settings.language;
        const cats = this.plugin.taskManager.getCategories();
        const hasUncategorized = this.plugin.desktopStore.hasTasksWithoutCategory();
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

        if (validCategory) {
            select.classList.add('is-filtered');
        }

        select.onchange = () => {
            this.plugin.settings.panelCategory = select.value;
            this.plugin.saveSettings();
            this.visibleCount = this.plugin.settings.tasksPerPage;
            this.contentEl.scrollTop = 0;
            this.render();
        };
    }

    private renderTabs(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;
        const tabs = parent.createDiv({ cls: 'first-task-tabs' });

        const currentCategory = this.getValidCategory();
        const pendingCount = this.plugin.desktopStore.getByCategory(currentCategory).length;
        const completedCount = this.plugin.desktopStore.getCompletedByCategory(currentCategory).length;

        const mkTab = (id: 'pending' | 'completed', icon: string, label: string, count: number) => {
            const btn = tabs.createEl('button', {
                cls: 'first-task-tab' + (this.currentTab === id ? ' is-active' : ''),
            });
            setIcon(btn.createSpan({ cls: 'first-task-tab-icon' }), icon);
            btn.createSpan({ text: ` ${label} (${displayNumber(count, lang)})` });

            btn.onclick = async () => {
                if (this.currentTab === id) return;
                this.selectionMode = false;
                this.selectedIds.clear();
                this.currentTab = id;
                this.visibleCount = this.plugin.settings.tasksPerPage;
                this.contentEl.scrollTop = 0;

                if (id === 'pending') {
                    await this.loadSuggestions();
                }
                this.render();
            };
        };

        mkTab('pending', 'circle-dot', t(lang, 'tab_pending'), pendingCount);
        mkTab('completed', 'check-circle', t(lang, 'tab_completed'), completedCount);
    }

    private renderRecurringSuggestions(parent: HTMLElement): void {
        if (!this.plugin.settings.desktop.recurringEnabled) return;
        if (this.recurringSuggestions.length === 0) return;

        const lang = this.plugin.settings.language;

        const wrap = parent.createDiv({ cls: 'first-task-suggestions' });

        const header = wrap.createDiv({ cls: 'first-task-suggestions-header' });

        const headerLeft = header.createDiv({ cls: 'first-task-suggestions-header-left' });
        const iconWrap = headerLeft.createSpan({ cls: 'first-task-suggestions-header-icon' });
        setIcon(iconWrap, 'repeat');

        headerLeft.createSpan({
            text: t(lang, 'recurring_title'),
            cls: 'first-task-suggestions-header-title',
        });

        headerLeft.createSpan({
            cls: 'first-task-suggestions-count',
            text: displayNumber(this.recurringSuggestions.length, lang),
        });

        const addAllBtn = header.createEl('button', {
            cls: 'first-task-suggestions-add-all',
        });
        setIcon(addAllBtn.createSpan({ cls: 'first-task-suggestions-add-all-icon' }), 'check-check');
        addAllBtn.createSpan({ text: ' ' + t(lang, 'recurring_add_all') });
        addAllBtn.onclick = () => this.handleAddAllRecurring();

        const list = wrap.createDiv({ cls: 'first-task-suggestions-list' });

        for (const suggestion of this.recurringSuggestions) {
            this.renderRecurringRow(list, suggestion);
        }
    }

    private renderRecurringRow(
        parent: HTMLElement,
        suggestion: RecurringSuggestion
    ): void {
        const lang = this.plugin.settings.language;
        const useJalali = this.plugin.settings.useJalaliDate;
        const template = suggestion.template;

        const row = parent.createDiv({ cls: 'first-task-suggestion-row' });

        const iconWrap = row.createDiv({ cls: 'first-task-suggestion-icon' });
        const iconName = this.getRecurrenceIcon(template.recurrence);
        setIcon(iconWrap, iconName);

        const body = row.createDiv({ cls: 'first-task-suggestion-body' });

        const titleRow = body.createDiv({ cls: 'first-task-suggestion-title' });
        titleRow.setText(template.title);

        const meta = body.createDiv({ cls: 'first-task-suggestion-meta' });

        const dateDisplay = useJalali
            ? suggestion.instance_date_jalali
            : suggestion.instance_date_gregorian;

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const isToday = suggestion.instance_date_ts === todayStart.getTime();

        const dateBadge = meta.createSpan({
            cls: 'first-task-suggestion-date-badge' +
                (isToday ? '' : ' is-overdue'),
        });

        if (isToday) {
            dateBadge.setText(t(lang, 'recurring_suggestion_from') + ': ' + displayString(dateDisplay, lang));
        } else {
            dateBadge.setText(t(lang, 'recurring_suggestion_overdue') + ': ' + displayString(dateDisplay, lang));
        }

        if (template.category) {
            const catName = this.plugin.taskManager.getCategoryDisplayName(template.category);
            meta.createSpan({
                cls: 'first-task-suggestion-cat',
                text: ' · ' + catName,
            });
        }

        const actions = row.createDiv({ cls: 'first-task-suggestion-actions' });

        const addBtn = actions.createEl('button', {
            cls: 'first-task-suggestion-add-btn',
        });
        setIcon(addBtn, 'plus');
        addBtn.setAttribute('aria-label', t(lang, 'recurring_add_one'));
        addBtn.onclick = (e) => {
            e.stopPropagation();
            this.handleAddRecurring(suggestion);
        };

        const dismissBtn = actions.createEl('button', {
            cls: 'first-task-suggestion-dismiss-btn',
        });
        setIcon(dismissBtn, 'x');
        dismissBtn.setAttribute('aria-label', t(lang, 'smart_action_dismiss'));
        dismissBtn.onclick = (e) => {
            e.stopPropagation();
            this.handleDismissRecurring(suggestion);
        };
    }

    private async handleAddRecurring(suggestion: RecurringSuggestion): Promise<void> {
        const lang = this.plugin.settings.language;

        const result = await this.plugin.recurringManager.createInstanceFromSuggestion(suggestion);

        if (result) {
            await this.plugin.statsManager.recordCreation(result);
            this.plugin.toastManager.show(t(lang, 'recurring_added_one'), 'success');
            await this.loadSuggestions();
            this.render();
        } else {
            this.plugin.toastManager.show(
                lang === 'fa' ? 'افزودن ناموفق' : 'Add failed',
                'error'
            );
        }
    }

    private async handleAddAllRecurring(): Promise<void> {
        const lang = this.plugin.settings.language;
        let count = 0;

        for (const s of this.recurringSuggestions) {
            const result = await this.plugin.recurringManager.createInstanceFromSuggestion(s);
            if (result) {
                await this.plugin.statsManager.recordCreation(result);
                count++;
            }
        }

        if (count > 0) {
            this.plugin.toastManager.show(
                t(lang, 'recurring_added_many', {
                    count: displayNumber(count, lang),
                }),
                'success'
            );
            await this.loadSuggestions();
            this.render();
        }
    }

    private handleDismissRecurring(suggestion: RecurringSuggestion): void {
        this.dismissedRecurringTemplateIds.add(suggestion.template.id);
        this.recurringSuggestions = this.recurringSuggestions.filter(
            s => s.template.id !== suggestion.template.id
        );
        this.render();
    }

    private renderSmartSuggestions(parent: HTMLElement): void {
        if (!this.plugin.settings.desktop.suggestionsEnabled) return;
        if (this.smartSuggestions.length === 0) return;

        const lang = this.plugin.settings.language;
        const wrap = parent.createDiv({ cls: 'first-task-smart-suggestions' });

        const header = wrap.createDiv({ cls: 'first-task-smart-header' });

        const headerLeft = header.createDiv({ cls: 'first-task-smart-header-left' });
        const iconWrap = headerLeft.createSpan({ cls: 'first-task-smart-header-icon' });
        setIcon(iconWrap, 'sparkles');

        headerLeft.createSpan({
            text: t(lang, 'smart_title'),
            cls: 'first-task-smart-header-title',
        });

        headerLeft.createSpan({
            cls: 'first-task-smart-count',
            text: displayNumber(this.smartSuggestions.length, lang),
        });

        const list = wrap.createDiv({ cls: 'first-task-smart-list' });

        for (const suggestion of this.smartSuggestions) {
            this.renderSmartRow(list, suggestion);
        }
    }

    private renderSmartRow(
        parent: HTMLElement,
        suggestion: SmartSuggestion
    ): void {
        const lang = this.plugin.settings.language;
        const row = parent.createDiv({ cls: 'first-task-smart-row' });

        const iconWrap = row.createDiv({ cls: 'first-task-smart-icon' });
        const iconName = this.getSuggestionIcon(suggestion.type);
        setIcon(iconWrap, iconName);

        const body = row.createDiv({ cls: 'first-task-smart-body' });

        const titleRow = body.createDiv({ cls: 'first-task-smart-title' });
        titleRow.setText(suggestion.title);

        const meta = body.createDiv({ cls: 'first-task-smart-meta' });

        const typeBadge = meta.createSpan({ cls: 'first-task-smart-type-badge' });
        typeBadge.setText(t(lang, `smart_type_${suggestion.type}` as any));

        if (suggestion.type === 'from_pattern' && suggestion.pattern_count) {
            meta.createSpan({
                cls: 'first-task-smart-extra',
                text: ' · ' + t(lang, 'smart_pattern_count', {
                    count: displayNumber(suggestion.pattern_count, lang),
                }),
            });
        }

        if (suggestion.type === 'from_notes' && suggestion.source_file) {
            const fileName = suggestion.source_file.split('/').pop()?.replace(/\.md$/, '') || '';
            meta.createSpan({
                cls: 'first-task-smart-extra',
                text: ' · ' + fileName,
            });
        }

        const actions = row.createDiv({ cls: 'first-task-smart-actions' });

        if (suggestion.type === 'from_notes') {
            const moveBtn = actions.createEl('button', {
                cls: 'first-task-smart-action-btn mod-cta',
            });
            setIcon(moveBtn, 'download');
            moveBtn.setAttribute('aria-label', t(lang, 'smart_action_move'));
            moveBtn.onclick = (e) => {
                e.stopPropagation();
                this.handleSmartMoveFromNotes(suggestion);
            };
        } else if (suggestion.type === 'from_pattern') {
            const createBtn = actions.createEl('button', {
                cls: 'first-task-smart-action-btn',
            });
            setIcon(createBtn, 'repeat');
            createBtn.setAttribute('aria-label', t(lang, 'smart_action_create_recurring'));
            createBtn.onclick = (e) => {
                e.stopPropagation();
                this.handleSmartCreateRecurring(suggestion);
            };
        }

        const dismissBtn = actions.createEl('button', {
            cls: 'first-task-smart-action-btn is-dismiss',
        });
        setIcon(dismissBtn, 'x');
        dismissBtn.setAttribute('aria-label', t(lang, 'smart_action_dismiss'));
        dismissBtn.onclick = (e) => {
            e.stopPropagation();
            this.handleSmartDismiss(suggestion);
        };
    }

    private getSuggestionIcon(type: string): string {
        switch (type) {
            case 'from_notes': return 'file-text';
            case 'from_pattern': return 'trending-up';
            case 'from_old_task': return 'history';
            case 'random_pick': return 'shuffle';
            default: return 'sparkles';
        }
    }

    private handleSmartDismiss(suggestion: SmartSuggestion): void {
        this.dismissedSuggestionIds.add(suggestion.id);
        this.smartSuggestions = this.smartSuggestions.filter(s => s.id !== suggestion.id);
        this.render();
    }

    private async handleSmartMoveFromNotes(suggestion: SmartSuggestion): Promise<void> {
        if (!suggestion.task_id) return;
        const lang = this.plugin.settings.language;

        try {
            const result = await this.plugin.importManager.moveTasksFromNotes(
                [suggestion.task_id],
                {
                    deleteFromNote: true,
                    assignCategory: suggestion.category || '',
                }
            );

            if (result.imported > 0) {
                this.plugin.toastManager.show(
                    t(lang, 'notice_bulk_moved', {
                        count: displayNumber(result.imported, lang),
                    }),
                    'success'
                );
                await this.loadSuggestions();
                this.render();
            }
        } catch (e) {
            console.warn('[First Task] Smart move failed:', e);
        }
    }

    private handleSmartCreateRecurring(suggestion: SmartSuggestion): void {
        const lang = this.plugin.settings.language;
        this.plugin.toastManager.show(
            t(lang, 'smart_pattern_hint'),
            'info',
            4000
        );

        this.dismissedSuggestionIds.add(suggestion.id);
        this.smartSuggestions = this.smartSuggestions.filter(s => s.id !== suggestion.id);
        this.render();
    }

    private getRecurrenceIcon(type: string): string {
        switch (type) {
            case 'daily': return 'sun';
            case 'weekly': return 'calendar-days';
            case 'monthly': return 'calendar';
            default: return 'repeat';
        }
    }

    private renderPending(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;
        const body = parent.createDiv({ cls: 'first-task-body' });

        const category = this.getValidCategory();
        const tasks = this.plugin.desktopStore.getByCategory(category);

        if (tasks.length === 0) {
            const hasSuggestions =
                (this.plugin.settings.desktop.recurringEnabled && this.recurringSuggestions.length > 0) ||
                (this.plugin.settings.desktop.suggestionsEnabled && this.smartSuggestions.length > 0);

            if (!hasSuggestions) {
                this.renderEmpty(
                    body,
                    t(lang, 'desktop_empty'),
                    t(lang, 'desktop_empty_hint')
                );
            }
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

    private renderCompleted(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;

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

        const totalCompleted = this.plugin.statsManager.getTotalCompleted();
        const totalArchived = this.plugin.statsManager.getTotalArchived();

        if (totalArchived > 0 || totalCompleted > stats.total) {
            const globalStats = parent.createDiv({ cls: 'first-task-global-stats' });
            globalStats.createDiv({ cls: 'first-task-global-stats-title' })
                .setText(t(lang, 'stats_global_title'));

            const globalGrid = globalStats.createDiv({ cls: 'first-task-global-stats-grid' });

            const mkGlobal = (label: string, value: number, icon: string) => {
                const item = globalGrid.createDiv({ cls: 'first-task-global-stat-item' });
                const iconWrap = item.createSpan({ cls: 'first-task-global-stat-icon' });
                setIcon(iconWrap, icon);
                const text = item.createDiv({ cls: 'first-task-global-stat-text' });
                text.createDiv({ cls: 'first-task-global-stat-value', text: displayNumber(value, lang) });
                text.createDiv({ cls: 'first-task-global-stat-label', text: label });
            };

            mkGlobal(t(lang, 'stats_global_total_completed'), totalCompleted, 'check-circle');
            mkGlobal(t(lang, 'stats_global_total_archived'), totalArchived, 'archive');
        }

        const body = parent.createDiv({ cls: 'first-task-body' });
        const category = this.getValidCategory();
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
                    const updatedTask = this.plugin.desktopStore.getById(task.id);
                    if (updatedTask) {
                        if (res.completed) {
                            await this.plugin.statsManager.recordCompletion(updatedTask);
                        } else {
                            await this.plugin.statsManager.recordUncompletion(updatedTask);
                        }
                    }

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

        const badgeEl = meta.createSpan({ cls: 'first-task-card-note' });
        if (task.from_recurring) {
            setIcon(badgeEl.createSpan({ cls: 'first-task-icon' }), 'repeat');
            badgeEl.createSpan({ text: ' ' + t(lang, 'badge_recurring') });
        } else {
            setIcon(badgeEl.createSpan({ cls: 'first-task-icon' }), 'layout-dashboard');
            badgeEl.createSpan({ text: ' ' + t(lang, 'desktop_badge') });
        }

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

    private renderEmpty(parent: HTMLElement, title: string, hint: string): void {
        const empty = parent.createDiv({ cls: 'first-task-empty' });
        empty.createEl('p', { text: title, cls: 'first-task-empty-title' });
        if (hint) empty.createEl('p', { text: hint, cls: 'first-task-empty-hint' });
    }

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

        for (const id of ids) {
            const task = this.plugin.desktopStore.getById(id);
            if (task) {
                await this.plugin.statsManager.recordDeletion(task);
            }
        }

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

    private handleNewTask(): void {
        new DesktopCreateModal(this.app, this.plugin, async () => {
            const latest = this.plugin.desktopStore.getPending().slice(-1)[0];
            if (latest) {
                await this.plugin.statsManager.recordCreation(latest);
            }
            this.render();
        }).open();
    }

    private handleImport(): void {
        new ImportModal(this.app, this.plugin, () => this.render()).open();
    }
}
