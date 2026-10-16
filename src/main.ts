/* ════════════════════════════════════════════════════════════
   🚀 First Task Plugin — v0.2.1
   ✅ Desktop panel (میز من)
   ✅ Import از نوت‌ها
   ✅ Desktop enabled/disabled check
   ✅ Notifier فقط بعد از initialize کامل
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
    scanner: VaultScanner;
    extractor: TaskExtractor;
    notifier: Notifier;
    toastManager: ToastManager;

    async onload(): Promise<void> {
        await this.loadSettings();

        this.toastManager = new ToastManager();
        this.toastManager.setRTL(this.settings.language === 'fa');

        this.indexManager = new IndexManager(this.app);
        this.categoriesManager = new CategoriesManager(this.app);
        this.scanner = new VaultScanner(this.app, () => this.settings);
        this.extractor = new TaskExtractor();

        this.desktopStore = new DesktopStore(
            this.app,
            () => this.settings.useJalaliDate
        );

        this.taskManager = new TaskManager(
            this.app,
            this.scanner,
            this.extractor,
            this.indexManager,
            this.categoriesManager,
            () => this.settings
        );

        /* 🆕 ImportManager */
        this.importManager = new ImportManager(
            this.app,
            this.taskManager,
            this.desktopStore,
            this.scanner,
            this.extractor
        );

        /* ─── Desktop Store init ─── */
        this.desktopStore.initialize().then(() => {
            this.refreshPanel();
        }).catch((e) => {
            console.warn('[First Task] DesktopStore init failed:', e);
        });

        /* ─── TaskManager init + Notifier ─── */
        this.taskManager
            .initialize()
            .then(() => {
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
            })
            .catch((e) => {
                console.warn('[First Task] Initialization failed:', e);
            });

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

        /* 🆕 Desktop ribbon — فقط اگه enabled */
        if (this.settings.desktop.enabled) {
            this.addRibbonIcon('layout-dashboard', 'My Desktop', () => {
                this.activateDesktopView();
            });
        }

        this.addSettingTab(new FirstTaskSettingsTab(this.app, this));

        this.registerCommands();
    }

    async onunload(): Promise<void> {
        if (this.notifier) this.notifier.stop();

        try {
            if (this.indexManager) {
                await this.indexManager.saveIndex();
                await this.indexManager.saveFileCache();
            }
            if (this.desktopStore) {
                await this.desktopStore.save();
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

        /* 🆕 Desktop */
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

    /* 🆕 Desktop — با چک enabled */
    async activateDesktopView(): Promise<void> {
        const lang = this.settings.language;

        /* ─── چک enabled ─── */
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
