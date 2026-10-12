/* ════════════════════════════════════════════════════════════
   🏷️ مدیریت دسته‌بندی‌ها
   ✅ فایل _categories.json توی پوشه‌ی FirstTask
   ✅ ۹ دسته‌بندی پیش‌فرض
   ✅ کاربر می‌تونه دستی ویرایش کنه
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

    /* ─── لود ─── */
    async load(): Promise<void> {
        try {
            const exists = await this.app.vault.adapter.exists(this.path);
            if (!exists) {
                this.categories = [...DEFAULT_CATEGORIES.categories];
                return;
            }
            const content = await this.app.vault.adapter.read(this.path);
            const parsed: CategoriesFile = JSON.parse(content);
            this.categories = parsed.categories || [...DEFAULT_CATEGORIES.categories];
        } catch (e) {
            console.warn('[First Task] Categories load failed:', e);
            this.categories = [...DEFAULT_CATEGORIES.categories];
        }
    }

    /* ─── ذخیره ─── */
    async save(): Promise<void> {
        try {
            const data: CategoriesFile = {
                version: 1,
                categories: this.categories,
            };
            await this.app.vault.adapter.write(this.path, JSON.stringify(data, null, 2));
        } catch (e) {
            console.warn('[First Task] Categories save failed:', e);
        }
    }

    /* ─── گرفتن همه ─── */
    getAll(): CategoryDef[] {
        return this.categories;
    }

    /* ─── گرفتن بر اساس id ─── */
    getById(id: string): CategoryDef | null {
        return this.categories.find(c => c.id === id) || null;
    }

    /* ─── نام نمایشی ─── */
    getDisplayName(id: string, lang: 'en' | 'fa'): string {
        const cat = this.getById(id);
        if (!cat) return id;
        return lang === 'fa' ? cat.name_fa : cat.name;
    }
}
