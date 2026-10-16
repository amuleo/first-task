/* ════════════════════════════════════════════════════════════
   📥 ImportModal — وارد کردن تسک از نوت‌ها به میز من
   ✅ کشف تسک‌های انجام‌نشده
   ✅ فیلتر (جستجو، فایل)
   ✅ انتخاب دسته‌ای
   ✅ دسته‌بندی پیش‌فرض
   ✅ حذف خط از نوت بعد از import
   ════════════════════════════════════════════════════════════ */

import { App, Modal, Setting } from 'obsidian';
import type FirstTaskPlugin from '../main';
import type { DiscoveredTask, ImportOptions } from '../types';
import { t, applyDirection } from '../i18n';
import { displayNumber } from '../utils/numberUtils';

export class ImportModal extends Modal {
    plugin: FirstTaskPlugin;
    onDone: () => void;

    private allTasks: DiscoveredTask[] = [];
    private selected: Set<string> = new Set();      /* Set of task_id */
    private loading = true;
    private importing = false;

    private searchQuery = '';
    private filterFile = '';
    private showAlreadyImported = false;
    private deleteFromNote = true;
    private assignCategory = '';

    constructor(app: App, plugin: FirstTaskPlugin, onDone: () => void) {
        super(app);
        this.plugin = plugin;
        this.onDone = onDone;
        /* پیش‌فرض از تنظیمات */
        this.deleteFromNote = plugin.settings.desktop.defaultImportMode === 'move';
    }

    async onOpen(): Promise<void> {
        await this.loadTasks();
    }

    private async loadTasks(): Promise<void> {
        this.loading = true;
        this.render();

        try {
            this.allTasks = await this.plugin.importManager.discoverTasks();
            this.loading = false;
            this.render();
        } catch (e) {
            console.warn('[First Task] Discovery failed:', e);
            this.loading = false;
            this.render();
        }
    }

    /* ═══════════════════════════════════════════════════════
       فیلترها
       ═══════════════════════════════════════════════════════ */
    private getFilteredTasks(): DiscoveredTask[] {
        let result = this.allTasks;

        if (!this.showAlreadyImported) {
            result = result.filter(t => !t.already_imported);
        }

        if (this.filterFile) {
            result = result.filter(t => t.source_file === this.filterFile);
        }

        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            result = result.filter(t => t.title.toLowerCase().includes(q));
        }

        return result;
    }

    private getUniqueFiles(): string[] {
        const files = new Set<string>();
        for (const t of this.allTasks) files.add(t.source_file);
        return Array.from(files).sort();
    }

    /* ═══════════════════════════════════════════════════════
       رندر
       ═══════════════════════════════════════════════════════ */
    private render(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('first-task-modal-content');
        contentEl.addClass('first-task-import-modal');

        const lang = this.plugin.settings.language;
        applyDirection(contentEl, lang);

        contentEl.createEl('h3', {
            text: t(lang, 'import_title'),
            cls: 'first-task-modal-title',
        });

        if (this.loading) {
            contentEl.createEl('p', {
                text: t(lang, 'import_loading'),
                cls: 'first-task-import-loading',
            });
            return;
        }

        /* ─── اگه هیچ تسکی نیست ─── */
        if (this.allTasks.length === 0) {
            const empty = contentEl.createDiv({ cls: 'first-task-empty' });
            empty.createEl('p', {
                text: t(lang, 'import_no_tasks'),
                cls: 'first-task-empty-title',
            });
            this.renderButtons(contentEl);
            return;
        }

        /* ─── فیلترها ─── */
        this.renderFilters(contentEl);

        /* ─── لیست تسک‌ها ─── */
        this.renderTasksList(contentEl);

        /* ─── گزینه‌ها + دکمه‌ها ─── */
        this.renderOptions(contentEl);
        this.renderButtons(contentEl);
    }

    /* ─── فیلترها ─── */
    private renderFilters(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;
        const filters = parent.createDiv({ cls: 'first-task-import-filters' });

        /* ─── جستجو ─── */
        new Setting(filters)
            .setName(t(lang, 'import_search'))
            .addText(text => {
                text.setPlaceholder(t(lang, 'import_search_ph'));
                text.setValue(this.searchQuery);
                text.inputEl.style.width = '100%';
                text.onChange(v => {
                    this.searchQuery = v.trim();
                    this.render();
                });
            });

        /* ─── فایل ─── */
        new Setting(filters)
            .setName(t(lang, 'import_filter_file'))
            .addDropdown(dd => {
                dd.addOption('', t(lang, 'import_all_files'));
                for (const f of this.getUniqueFiles()) {
                    dd.addOption(f, f);
                }
                dd.setValue(this.filterFile);
                dd.onChange(v => {
                    this.filterFile = v;
                    this.render();
                });
            });

        /* ─── نمایش import‌شده‌ها ─── */
        new Setting(filters)
            .setName(t(lang, 'import_show_imported'))
            .addToggle(tg => tg
                .setValue(this.showAlreadyImported)
                .onChange(v => {
                    this.showAlreadyImported = v;
                    this.render();
                }));

        /* ─── انتخاب همه/هیچ ─── */
        const actionsRow = filters.createDiv({ cls: 'first-task-import-actions' });
        const filtered = this.getFilteredTasks();

        const selectAllBtn = actionsRow.createEl('button', {
            text: t(lang, 'import_select_all'),
            cls: 'first-task-selection-btn',
        });
        selectAllBtn.onclick = () => {
            for (const task of filtered) {
                if (!task.already_imported) this.selected.add(task.task_id);
            }
            this.render();
        };

        const selectNoneBtn = actionsRow.createEl('button', {
            text: t(lang, 'import_select_none'),
            cls: 'first-task-selection-btn',
        });
        selectNoneBtn.onclick = () => {
            this.selected.clear();
            this.render();
        };
    }

    /* ─── لیست تسک‌ها ─── */
    private renderTasksList(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;
        const filtered = this.getFilteredTasks();

        if (filtered.length === 0) {
            parent.createEl('p', {
                text: t(lang, 'import_no_match'),
                cls: 'first-task-import-empty',
            });
            return;
        }

        const listWrap = parent.createDiv({ cls: 'first-task-import-list' });

        /* ─── گروه‌بندی بر اساس فایل ─── */
        const byFile = new Map<string, DiscoveredTask[]>();
        for (const task of filtered) {
            if (!byFile.has(task.source_file)) {
                byFile.set(task.source_file, []);
            }
            byFile.get(task.source_file)!.push(task);
        }

        for (const [filePath, fileTasks] of byFile) {
            /* ─── هدر فایل ─── */
            const fileHeader = listWrap.createDiv({
                cls: 'first-task-import-file-header',
            });
            fileHeader.setText(filePath);

            for (const task of fileTasks) {
                const isSelected = this.selected.has(task.task_id);
                const cls = 'first-task-import-row' +
                    (isSelected ? ' is-selected' : '') +
                    (task.already_imported ? ' is-imported' : '');

                const row = listWrap.createDiv({ cls });

                /* ─── checkbox ─── */
                const cb = row.createEl('input', { type: 'checkbox' });
                cb.checked = isSelected;
                cb.disabled = task.already_imported;

                cb.onclick = (e) => {
                    e.stopPropagation();
                    if (task.already_imported) return;
                    if (this.selected.has(task.task_id)) {
                        this.selected.delete(task.task_id);
                    } else {
                        this.selected.add(task.task_id);
                    }
                    this.render();
                };

                /* ─── عنوان + badge ─── */
                const body = row.createDiv({ cls: 'first-task-import-row-body' });
                const titleRow = body.createDiv({ cls: 'first-task-import-row-title' });
                titleRow.setText(task.title);

                if (task.already_imported) {
                    const badge = titleRow.createSpan({
                        cls: 'first-task-import-badge',
                    });
                    badge.setText('✓ ' + t(lang, 'import_already_done'));
                }

                /* ─── کلیک روی کل row ─── */
                row.onclick = (e) => {
                    if ((e.target as HTMLElement).tagName === 'INPUT') return;
                    if (task.already_imported) return;
                    if (this.selected.has(task.task_id)) {
                        this.selected.delete(task.task_id);
                    } else {
                        this.selected.add(task.task_id);
                    }
                    this.render();
                };
            }
        }
    }

    /* ─── گزینه‌ها ─── */
    private renderOptions(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;
        const options = parent.createDiv({ cls: 'first-task-import-options' });

        /* ─── حذف از نوت ─── */
        new Setting(options)
            .setName(t(lang, 'import_delete_from_note'))
            .setDesc(t(lang, 'import_delete_from_note_desc'))
            .addToggle(tg => tg
                .setValue(this.deleteFromNote)
                .onChange(v => {
                    this.deleteFromNote = v;
                }));

        /* ─── دسته‌بندی پیش‌فرض ─── */
        if (this.plugin.settings.enableCategories) {
            const cats = this.plugin.taskManager.getCategories();
            new Setting(options)
                .setName(t(lang, 'import_assign_category'))
                .setDesc(t(lang, 'import_assign_category_desc'))
                .addDropdown(dd => {
                    dd.addOption('', t(lang, 'import_keep_category'));
                    for (const c of cats) {
                        const label = lang === 'fa' ? c.name_fa : c.name;
                        dd.addOption(c.id, label);
                    }
                    dd.setValue(this.assignCategory);
                    dd.onChange(v => {
                        this.assignCategory = v;
                    });
                });
        }
    }

    /* ─── دکمه‌ها ─── */
    private renderButtons(parent: HTMLElement): void {
        const lang = this.plugin.settings.language;
        const selectedCount = this.selected.size;

        const actions = parent.createDiv({ cls: 'first-task-modal-buttons' });

        const cancelBtn = actions.createEl('button', {
            text: t(lang, 'btn_cancel'),
        });
        cancelBtn.onclick = () => this.close();

        const importBtn = actions.createEl('button', {
            text: t(lang, 'import_button', {
                count: displayNumber(selectedCount, lang),
            }),
            cls: 'mod-cta',
        });
        importBtn.disabled = selectedCount === 0 || this.importing;
        importBtn.onclick = () => this.handleImport();
    }

    /* ═══════════════════════════════════════════════════════
       Import
       ═══════════════════════════════════════════════════════ */
    private async handleImport(): Promise<void> {
        if (this.importing || this.selected.size === 0) return;

        this.importing = true;
        const lang = this.plugin.settings.language;

        const selectedTasks = this.allTasks.filter(t =>
            this.selected.has(t.task_id)
        );

        const options: ImportOptions = {
            deleteFromNote: this.deleteFromNote,
            assignCategory: this.assignCategory,
        };

        try {
            const result = await this.plugin.importManager.importTasks(
                selectedTasks,
                options
            );

            /* ─── toast ─── */
            if (result.imported > 0) {
                this.plugin.toastManager.show(
                    t(lang, 'import_success', {
                        count: displayNumber(result.imported, lang),
                    }),
                    'success'
                );
            }

            if (result.errors.length > 0) {
                console.warn('[First Task] Import errors:', result.errors);
            }

            this.onDone();
            this.close();
        } catch (e) {
            this.importing = false;
            this.plugin.toastManager.show(
                t(lang, 'import_failed'),
                'error'
            );
        }
    }

    onClose(): void {
        this.contentEl.empty();
    }
}
