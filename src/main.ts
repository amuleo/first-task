/* ════════════════════════════════════════════════════════════
   🚀 First Task Plugin — v0.3.0
   ✅ Flush save در unload
   ✅ Debounced save
   ════════════════════════════════════════════════════════════ */

import { Plugin, WorkspaceLeaf } from 'obsidian';
import {
    DEFAULT_SETTINGS,
    FirstTaskSettings,
} from './types';
import { TaskManager } from './managers/TaskManager';
import { VaultScanner } from './managers/VaultScanner';
import { TaskExtractor } from './managers/TaskExtractor';
import { IndexManager } from './managers/IndexManager';
import { CategoriesManager } from './managers/CategoriesManager';
import { DesktopStore } from './managers/DesktopStore';
import { ImportManager } from './managers/ImportManager';
import { RecurringManager } from './managers/RecurringManager';
import { StatsManager } from './managers/StatsManager';
import { ArchiveManager } from './managers/ArchiveManager';
import { SuggestionEngine } from './managers/SuggestionEngine';
import { Notifier } from './managers/Notifier';
import { ToastManager } from './managers/ToastManager';
import { FirstTaskSettingsTab } from './settings/SettingsTab';
import { TaskPanelView, VIEW_TYPE_FIRST_TASK } from './views/TaskPanelView';
import { PlannerView, VIEW_TYPE_PLANNER } from './views/PlannerView';
import { DesktopView, VIEW_TYPE_DESKTOP } from './views/DesktopView';
import { CreateTaskModal } from './views/CreateTaskModal';
import { t } from './i18n';

export default class FirstTaskPlugin extends Plugin {
    settings: FirstTaskSettings;
    taskManager: TaskManager;
    indexManager: IndexManager;
    categoriesManager: CategoriesManager;
    desktopStore: DesktopStore;
    importManager: ImportManager;
    recurringManager: RecurringManager;
    statsManager: StatsManager;
    archiveManager: ArchiveManager;
    suggestionEngine: SuggestionEngine;
    scanner: VaultScanner;
    extractor: TaskExtractor;
    notifier: Notifier;
    toastManager: ToastManager;

    async onload(): Promise<void> {
        await this.loadSettings();

        this.toastManager = new ToastManager();
        this.toastManager.setRTL(this.settings.language === 'fa');

        /* ─── Managers ─── */
        this.indexManager = new IndexManager(this.app);
        this.categoriesManager = new CategoriesManager(this.app);
        this.scanner = new VaultScanner(this.app, () => this.settings);
        this.extractor = new TaskExtractor();

        this.desktopStore = new DesktopStore(
            this.app,
            () => this.settings.useJalaliDate
        );

        this.statsManager = new StatsManager(this.app);

        this.archiveManager = new ArchiveManager(
            this.app,
            this.desktopStore,
            this.statsManager
        );

        this.recurringManager = new RecurringManager(
            this.app,
            this.desktopStore
        );

        this.taskManager = new TaskManager(
            this.app,
            this.scanner,
            this.extractor,
            this.indexManager,
            this.categoriesManager,
            () => this.settings
        );

        this.importManager = new ImportManager(
            this.app,
            this.taskManager,
            this.desktopStore,
            this.scanner,
            this.extractor
        );

        this.suggestionEngine = new SuggestionEngine(
            this.taskManager,
            this.desktopStore
        );

        /* ─── Initialize ─── */
        this.initializeManagers();

        /* ─── Views ─── */
        this.registerView(
            VIEW_TYPE_FIRST_TASK,
            (leaf) => new TaskPanelView(leaf, this)
        );
        this.registerView(
            VIEW_TYPE_PLANNER,
            (leaf) => new PlannerView(leaf, this)
        );
        this.registerView(
            VIEW_TYPE_DESKTOP,
            (leaf) => new DesktopView(leaf, this)
        );

        /* ─── Ribbons ─── */
        this.addRibbonIcon('check-square', 'First Task', () => {
            this.activateView();
        });
        this.addRibbonIcon('calendar-days', 'Planner', () => {
            this.activatePlannerView();
        });

        if (this.settings.desktop.enabled) {
            this.addRibbonIcon('layout-dashboard', 'My Desktop', () => {
                this.activateDesktopView();
            });
        }

        this.addSettingTab(new FirstTaskSettingsTab(this.app, this));

        this.registerCommands();
    }

    /* ═══════════════════════════════════════════════════════
       Initialize
       ═══════════════════════════════════════════════════════ */
    private async initializeManagers(): Promise<void> {
        try {
            /* ─── ۱. Desktop + Stats + Archive + Recurring ─── */
            await this.desktopStore.initialize();
            await this.statsManager.initialize();
            await this.archiveManager.initialize();
            await this.recurringManager.initialize();
            this.refreshPanel();

            /* ─── ۲. TaskManager + Notifier ─── */
            await this.taskManager.initialize();
            this.refreshPanel();

            this.notifier = new Notifier(
                this.app,
                async (file) => {
                    await this.taskManager.rescanFile(file);
                    this.refreshPanel();
                },
                (path) => {
                    this.taskManager.removeTasksForFile(path);
                    this.refreshPanel();
                },
                async (oldPath, file) => {
                    this.taskManager.removeTasksForFile(oldPath);
                    await this.taskManager.rescanFile(file);
                    this.refreshPanel();
                }
            );
            this.notifier.start();

            /* ─── ۳. Auto-Archive ─── */
            await this.runStartupAutoArchive();
        } catch (e) {
            console.warn('[First Task] Initialization failed:', e);
        }
    }

    private async runStartupAutoArchive(): Promise<void> {
        if (!this.settings.desktop.autoArchiveEnabled) return;

        try {
            const result = await this.archiveManager.runAutoArchive(
                this.settings.desktop
            );

            if (result.archived > 0) {
                console.log(`[First Task] Auto-archived ${result.archived} task(s)`);
                this.refreshPanel();
            }
        } catch (e) {
            console.warn('[First Task] Startup auto-archive failed:', e);
        }
    }

    /* ═══════════════════════════════════════════════════════
       onunload — 🆕 flushSave
       ═══════════════════════════════════════════════════════ */
    async onunload(): Promise<void> {
        if (this.notifier) this.notifier.stop();

        try {
            /* 🆕 flush همه saveهای debounced */
            if (this.indexManager) {
                await this.indexManager.flushSave();
            }
            if (this.desktopStore) {
                await this.desktopStore.save();
            }
            if (this.recurringManager) {
                await this.recurringManager.save();
            }
            if (this.statsManager) {
                await this.statsManager.save();
            }
            if (this.archiveManager) {
                await this.archiveManager.save();
            }
        } catch (e) {
            console.warn('[First Task] Failed to flush on unload:', e);
        }

        if (this.toastManager) this.toastManager.destroy();
    }

    /* ═══════════════════════════════════════════════════════
       Commands
       ═══════════════════════════════════════════════════════ */
    registerCommands(): void {
        this.addCommand({
            id: 'open-panel',
            name: 'Open task panel',
            callback: () => this.activateView(),
        });

        this.addCommand({
            id: 'open-planner',
            name: 'Open planner',
            callback: () => this.activatePlannerView(),
        });

        this.addCommand({
            id: 'open-desktop',
            name: 'Open Desktop',
            callback: () => this.activateDesktopView(),
        });

        this.addCommand({
            id: 'rescan-vault',
            name: 'Rescan vault for tasks',
            callback: async () => {
                await this.taskManager.rescanAll();
                this.refreshPanel();
                this.toastManager.show(
                    t(this.settings.language, 'notice_rescan_ok'),
                    'success'
                );
            },
        });

        this.addCommand({
            id: 'new-task',
            name: 'Create new task',
            callback: async () => {
                await this.activateView();
                const leaf = this.app.workspace.getLeavesOfType(
                    VIEW_TYPE_FIRST_TASK
                )[0];
                if (leaf) {
                    const view = leaf.view as TaskPanelView;
                    new CreateTaskModal(this.app, this, () =>
                        view.refresh()
                    ).open();
                }
            },
        });

        this.addCommand({
            id: 'run-archive',
            name: 'Run auto-archive now',
            callback: async () => {
                const result = await this.archiveManager.runAutoArchive(
                    this.settings.desktop
                );
                const lang = this.settings.language;

                if (result.archived > 0) {
                    this.toastManager.show(
                        t(lang, 'notice_archive_success', {
                            count: String(result.archived),
                        }),
                        'success'
                    );
                } else {
                    this.toastManager.show(
                        t(lang, 'notice_archive_none'),
                        'info'
                    );
                }
                this.refreshPanel();
            },
        });
    }

    /* ═══════════════════════════════════════════════════════
       Activate Views
       ═══════════════════════════════════════════════════════ */
    async activateView(): Promise<void> {
        const { workspace } = this.app;
        let leaf: WorkspaceLeaf | null = null;

        const leaves = workspace.getLeavesOfType(VIEW_TYPE_FIRST_TASK);
        if (leaves.length > 0) {
            leaf = leaves[0];
        } else {
            leaf = workspace.getRightLeaf(false);
            await leaf?.setViewState({
                type: VIEW_TYPE_FIRST_TASK,
                active: true,
            });
        }
        if (leaf) workspace.revealLeaf(leaf);
    }

    async activatePlannerView(): Promise<void> {
        const { workspace } = this.app;
        let leaf: WorkspaceLeaf | null = null;

        const leaves = workspace.getLeavesOfType(VIEW_TYPE_PLANNER);
        if (leaves.length > 0) {
            leaf = leaves[0];
        } else {
            leaf = workspace.getRightLeaf(false);
            await leaf?.setViewState({
                type: VIEW_TYPE_PLANNER,
                active: true,
            });
        }
        if (leaf) workspace.revealLeaf(leaf);
    }

    async activateDesktopView(): Promise<void> {
        const lang = this.settings.language;

        if (!this.settings.desktop.enabled) {
            this.toastManager.show(
                t(lang, 'desktop_disabled'),
                'warning'
            );
            return;
        }

        const { workspace } = this.app;
        let leaf: WorkspaceLeaf | null = null;

        const leaves = workspace.getLeavesOfType(VIEW_TYPE_DESKTOP);
        if (leaves.length > 0) {
            leaf = leaves[0];
        } else {
            leaf = workspace.getRightLeaf(false);
            await leaf?.setViewState({
                type: VIEW_TYPE_DESKTOP,
                active: true,
            });
        }
        if (leaf) workspace.revealLeaf(leaf);
    }

    /* ═══════════════════════════════════════════════════════
       Refresh Panels
       ═══════════════════════════════════════════════════════ */
    refreshPanel(): void {
        const views = [
            VIEW_TYPE_FIRST_TASK,
            VIEW_TYPE_PLANNER,
            VIEW_TYPE_DESKTOP,
        ];

        for (const viewType of views) {
            const leaves = this.app.workspace.getLeavesOfType(viewType);
            for (const leaf of leaves) {
                const view = leaf.view as any;
                if (view && typeof view.refresh === 'function') {
                    try {
                        view.refresh();
                    } catch (e) {
                        console.warn(`[First Task] ${viewType} refresh failed:`, e);
                    }
                }
            }
        }
    }

    /* ═══════════════════════════════════════════════════════
       Settings
       ═══════════════════════════════════════════════════════ */
    async loadSettings(): Promise<void> {
        try {
            const data = await this.loadData();
            this.settings = Object.assign({}, DEFAULT_SETTINGS, data || {});

            this.settings.dynamicCategories = Object.assign(
                {},
                DEFAULT_SETTINGS.dynamicCategories,
                data?.dynamicCategories || {}
            );
            this.settings.plannerCards = Object.assign(
                {},
                DEFAULT_SETTINGS.plannerCards,
                data?.plannerCards || {}
            );
            this.settings.desktop = Object.assign(
                {},
                DEFAULT_SETTINGS.desktop,
                data?.desktop || {}
            );
        } catch (e) {
            console.debug('[First Task] No settings file, using defaults');
            this.settings = Object.assign({}, DEFAULT_SETTINGS);
        }
    }

    async saveSettings(): Promise<void> {
        try {
            await this.saveData(this.settings);
            this.toastManager.setRTL(this.settings.language === 'fa');
        } catch (e) {
            console.warn('[First Task] Failed to save settings:', e);
        }
    }
}
