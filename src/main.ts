/* ════════════════════════════════════════════════════════════
   🚀 First Task Plugin — v0.1.3
   ✅ Notifier فقط بعد از initialize کامل شروع می‌شه
   ✅ flush روی unload
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
import { Notifier } from './managers/Notifier';
import { ToastManager } from './managers/ToastManager';
import { FirstTaskSettingsTab } from './settings/SettingsTab';
import { TaskPanelView, VIEW_TYPE_FIRST_TASK } from './views/TaskPanelView';
import { PlannerView, VIEW_TYPE_PLANNER } from './views/PlannerView';
import { CreateTaskModal } from './views/CreateTaskModal';
import { t } from './i18n';

export default class FirstTaskPlugin extends Plugin {
    settings: FirstTaskSettings;
    taskManager: TaskManager;
    indexManager: IndexManager;
    categoriesManager: CategoriesManager;
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
        this.taskManager = new TaskManager(
            this.app,
            this.scanner,
            this.extractor,
            this.indexManager,
            this.categoriesManager,
            () => this.settings
        );

        /* ═══════════════════════════════════════════════════
           🆕 اول initialize، بعد Notifier
           این ترتیب حیاتیه! اگه Notifier قبل از آماده شدن
           TaskManager شروع کنه، cleanupOrphans با یه لیست
           ناقص صدا زده می‌شه و متادیتای همه پاک می‌شه.
           ═══════════════════════════════════════════════════ */
        this.taskManager
            .initialize()
            .then(() => {
                this.refreshPanel();

                /* 🆕 حالا که TaskManager آماده‌ست، Notifier رو شروع کن */
                this.notifier = new Notifier(
                    this.app,
                    /* onFileChanged */
                    async (file) => {
                        await this.taskManager.rescanFile(file);
                        this.refreshPanel();
                    },
                    /* onFileDeleted */
                    (path) => {
                        this.taskManager.removeTasksForFile(path);
                        this.refreshPanel();
                    },
                    /* onFileRenamed */
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

        this.registerView(
            VIEW_TYPE_FIRST_TASK,
            (leaf) => new TaskPanelView(leaf, this)
        );
        this.registerView(
            VIEW_TYPE_PLANNER,
            (leaf) => new PlannerView(leaf, this)
        );

        this.addRibbonIcon('check-square', 'First Task', () => {
            this.activateView();
        });
        this.addRibbonIcon('calendar-days', 'Planner', () => {
            this.activatePlannerView();
        });

        this.addSettingTab(new FirstTaskSettingsTab(this.app, this));

        this.registerCommands();
    }

    async onunload(): Promise<void> {
        /* ─── توقف Notifier ─── */
        if (this.notifier) this.notifier.stop();

        /* 🆕 flush نهایی — ذخیره‌ی همه چیز قبل از بستن */
        try {
            if (this.indexManager) {
                await this.indexManager.saveIndex();
                await this.indexManager.saveFileCache();
            }
        } catch (e) {
            console.warn('[First Task] Failed to flush on unload:', e);
        }

        if (this.toastManager) this.toastManager.destroy();
    }

    /* ═══════════════════════════════════════════════════════
       کامندها
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
       باز کردن پنل‌ها
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

    /* ═══════════════════════════════════════════════════════
       رفرش همه پنل‌ها
       ═══════════════════════════════════════════════════════ */
    refreshPanel(): void {
        const mainLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FIRST_TASK);
        for (const leaf of mainLeaves) {
            const view = leaf.view as any;
            if (view && typeof view.refresh === 'function') {
                try {
                    view.refresh();
                } catch (e) {
                    console.warn('[First Task] Main panel refresh failed:', e);
                }
            }
        }

        const plannerLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_PLANNER);
        for (const leaf of plannerLeaves) {
            const view = leaf.view as any;
            if (view && typeof view.refresh === 'function') {
                try {
                    view.refresh();
                } catch (e) {
                    console.warn('[First Task] Planner refresh failed:', e);
                }
            }
        }
    }

    /* ═══════════════════════════════════════════════════════
       تنظیمات
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
