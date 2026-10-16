/* ════════════════════════════════════════════════════════════
   🏷️ مدیریت دسته‌بندی‌ها — v0.2.1
   ✅ Auto-merge دسته‌های جدید
   ════════════════════════════════════════════════════════════ */

import { App, normalizePath } from 'obsidian';
import type { CategoryDef, CategoriesFile } from '../types';
import { DEFAULT_CATEGORIES } from '../types';

const FOLDER_NAME = 'FirstTask';
const CATEGORIES_FILE = '_categories.json';

export class CategoriesManager {
    private app: App;
    private path: string;
    private categories: CategoryDef[] = [];

    constructor(app: App) {
        this.app = app;
        this.path = normalizePath(`${FOLDER_NAME}/${CATEGORIES_FILE}`);
    }

    /* ─── اطمینان از وجود فایل ─── */
    async ensureFile(): Promise<void> {
        try {
            const exists = await this.app.vault.adapter.exists(this.path);
            if (!exists) {
                const content = JSON.stringify(DEFAULT_CATEGORIES, null, 2);
                await this.app.vault.adapter.write(this.path, content);
            }
        } catch (e) {
            console.warn('[First Task] Categories file failed:', e);
        }
    }

    /* ─── لود (با auto-merge) ─── */
    async load(): Promise<void> {
        try {
            const exists = await this.app.vault.adapter.exists(this.path);
            if (!exists) {
                this.categories = [...DEFAULT_CATEGORIES.categories];
                return;
            }

            const content = await this.app.vault.adapter.read(this.path);
            const parsed = JSON.parse(content);
            const loaded: CategoryDef[] = parsed.categories || [
                ...DEFAULT_CATEGORIES.categories,
            ];

            /* 🆕 Merge دسته‌های جدید پیش‌فرض */
            const loadedIds = new Set(loaded.map(c => c.id));
            const merged = [...loaded];
            let changed = false;

            for (const defCat of DEFAULT_CATEGORIES.categories) {
                if (loadedIds.has(defCat.id)) continue;

                /* ─── درج پویا بر اساس موقعیت ─── */
                if (defCat.id === 'desktop') {
                    /* قبل از important */
                    const idx = merged.findIndex(c => c.id === 'important');
                    if (idx !== -1) {
                        merged.splice(idx, 0, defCat);
                        changed = true;
                        continue;
                    }
                }

                /* ─── پیش‌فرض: آخر اضافه کن ─── */
                merged.push(defCat);
                changed = true;
            }

            this.categories = merged;

            /* ─── اگه چیزی اضافه شد، ذخیره کن ─── */
            if (changed) {
                await this.save();
            }
        } catch (e) {
            console.warn('[First Task] Categories load failed:', e);
            this.categories = [...DEFAULT_CATEGORIES.categories];
        }
    }

    /* ─── ذخیره ─── */
    async save(): Promise<void> {
        try {
            const data = {
                version: 1,
                categories: this.categories,
            };
            await this.app.vault.adapter.write(
                this.path,
                JSON.stringify(data, null, 2)
            );
        } catch (e) {
            console.warn('[First Task] Categories save failed:', e);
        }
    }

    getAll(): CategoryDef[] {
        return this.categories;
    }

    getById(id: string): CategoryDef | null {
        return this.categories.find(c => c.id === id) || null;
    }

    getDisplayName(id: string, lang: 'en' | 'fa'): string {
        const cat = this.getById(id);
        if (!cat) return id;
        return lang === 'fa' ? cat.name_fa : cat.name;
    }
}
