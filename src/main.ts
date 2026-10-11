/* ════════════════════════════════════════════════════════════
   🚀 نقطه ورود First Task
   ════════════════════════════════════════════════════════════ */

import { Plugin, WorkspaceLeaf } from 'obsidian';
import { DEFAULT_SETTINGS, FirstTaskSettings } from './types';
import { FirstTaskSettingsTab } from './settings/SettingsTab';
import { TaskPanelView, VIEW_TYPE_FIRST_TASK } from './views/TaskPanelView';
import { IndexManager } from './managers/IndexManager';
import { VaultScanner } from './managers/VaultScanner';
import { TaskExtractor } from './managers/TaskExtractor';
import { TaskManager } from './managers/TaskManager';
import { Notifier } from './managers/Notifier';
import { ToastManager } from './managers/ToastManager';
import { t } from './i18n';

export default class FirstTaskPlugin extends Plugin {
    settings: FirstTaskSettings;
    taskManager: TaskManager;
    toastManager: ToastManager;
    indexManager: IndexManager;

    private scanner: VaultScanner;
    private extractor: TaskExtractor;
    private notifier: Notifier;

    async onload(): Promise<void> {
        await this.loadSettings();

        /* ─── Toast ─── */
        this.toastManager = new ToastManager();
        this.toastManager.setRTL(this.settings.language === 'fa');

        /* ─── Managers ─── */
        this.indexManager = new IndexManager(this.app);
        this.scanner = new VaultScanner(this.app, () => this.settings);
        this.extractor = new TaskExtractor();
        this.taskManager = new TaskManager(
            this.app,
            this.scanner,
            this.extractor,
            this.indexManager,
            () => this.settings
        );

        /* ─── راه‌اندازی اولیه (async، بدون بلاک کردن) ─── */
        this.taskManager.initialize().then(() => {
            this.refreshPanel();
        }).catch(e => {
            console.warn('[First Task] Initialization failed:', e);
        });

        /* ─── Notifier (real-time) ─── */
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

        /* ─── View ─── */
        this.registerView(
            VIEW_TYPE_FIRST_TASK,
            (leaf) => new TaskPanelView(leaf, this)
        );

        /* ─── Ribbon icon ─── */
        this.addRibbonIcon('check-square', 'First Task', () => {
            this.activateView();
        });

        /* ─── Settings tab ─── */
        this.addSettingTab(new FirstTaskSettingsTab(this.app, this));

        /* ─── Commands ─── */
        this.registerCommands();
    }

    async onunload(): Promise<void> {
        if (this.notifier) this.notifier.stop();
        if (this.toastManager) this.toastManager.destroy();
    }

    /* ═══════════════════════════════════════════════════════
       📋 کامندها
       ═══════════════════════════════════════════════════════ */
    private registerCommands(): void {
        this.addCommand({
            id: 'open-panel',
            name: 'Open task panel',
            callback: () => this.activateView(),
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
                const { CreateTaskModal } = await import('./views/CreateTaskModal');
                const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_FIRST_TASK)[0];
                if (leaf) {
                    const view = leaf.view as TaskPanelView;
                    new CreateTaskModal(this.app, this, () => view.refresh()).open();
                }
            },
        });
    }

    /* ═══════════════════════════════════════════════════════
       📂 باز کردن پنل
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

    /* ═══════════════════════════════════════════════════════
       🔄 رفرش پنل
       ═══════════════════════════════════════════════════════ */
    refreshPanel(): void {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FIRST_TASK);
        for (const leaf of leaves) {
            const view = leaf.view;
            if (
                view &&
                typeof (view as any).refresh === 'function' &&
                view.getViewType?.() === VIEW_TYPE_FIRST_TASK
            ) {
                try {
                    (view as TaskPanelView).refresh();
                } catch (e) {
                    console.warn('[First Task] Panel refresh failed:', e);
                }
            }
        }
    }

    /* ═══════════════════════════════════════════════════════
       💾 تنظیمات
       ═══════════════════════════════════════════════════════ */
    async loadSettings(): Promise<void> {
        try {
            const data = await this.loadData();
            this.settings = Object.assign({}, DEFAULT_SETTINGS, data || {});
            /* ادغام nested objects */
            this.settings.dynamicCategories = Object.assign(
                {},
                DEFAULT_SETTINGS.dynamicCategories,
                data?.dynamicCategories || {}
            );
        } catch (e) {
            console.debug('[First Task] No settings file, using defaults');
            this.settings = Object.assign({}, DEFAULT_SETTINGS);
        }
    }

    async saveSettings(): Promise<void> {
        try {
            await this.saveData(this.settings);
            /* بروزرسانی RTL برای Toast */
            this.toastManager.setRTL(this.settings.language === 'fa');
        } catch (e) {
            console.warn('[First Task] Failed to save settings:', e);
        }
    }
}
