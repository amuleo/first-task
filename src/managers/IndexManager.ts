/* ════════════════════════════════════════════════════════════
   💾 مدیریت ایندکس (توضیحات، تاریخ، دسته، پین)
   
   ✅ ذخیره در پوشه‌ی FirstTask/ داخل والت کاربر
      (نه توی پوشه‌ی پلاگین — تا سینک بشه)
   ✅ همراه با README محافظ + .gitignore
   ════════════════════════════════════════════════════════════ */

import { App, normalizePath } from 'obsidian';
import type {
    TaskIndexFile,
    TaskIndexEntry,
    FileCacheFile,
    FileCacheEntry,
} from '../types';

/* ───── نام‌های ثابت ───── */
const FOLDER_NAME = 'FirstTask';
const INDEX_FILE = 'index.json';
const CACHE_FILE = 'file-cache.json';
const README_FILE = '_README.md';
const GITIGNORE_FILE = '.gitignore';

/* ───── مقادیر پیش‌فرض ───── */
const DEFAULT_INDEX: TaskIndexFile = {
    version: 1,
    last_updated: 0,
    tasks: {},
};

const DEFAULT_CACHE: FileCacheFile = {
    version: 1,
    files: {},
};

const README_CONTENT = `# ⚠️ این پوشه رو حذف نکنید!

این پوشه توسط پلاگین **First Task** استفاده می‌شه.
اطلاعات زیر اینجا ذخیره می‌شن:

- 📝 توضیحات تسک‌ها
- 📅 تاریخ انجام
- 🏷️ دسته‌بندی‌ها
- 📌 پین‌ها

**اگه این پوشه رو حذف کنید:**
- ❌ توضیحات از بین می‌ره
- ❌ دسته‌بندی‌ها از بین می‌رن
- ❌ پین‌ها از بین می‌رن
- ✅ ولی خود تسک‌ها (عنوان) توی نوت‌ها سالم می‌مونن

**این پوشه با Remotely Save سینک می‌شه، پس خودکار بکاپ می‌گیره.**
`;

const GITIGNORE_CONTENT = `# کش فایل‌ها (قابل بازسازی، نیازی به بکاپ نیست)
file-cache.json
`;

export class IndexManager {
    private app: App;
    private folderPath: string;
    private indexPath: string;
    private cachePath: string;

    private index: TaskIndexFile = { ...DEFAULT_INDEX };
    private fileCache: FileCacheFile = { ...DEFAULT_CACHE };

    constructor(app: App) {
        this.app = app;
        this.folderPath = normalizePath(FOLDER_NAME);
        this.indexPath = normalizePath(`${FOLDER_NAME}/${INDEX_FILE}`);
        this.cachePath = normalizePath(`${FOLDER_NAME}/${CACHE_FILE}`);
    }

    /* ═══════════════════════════════════════════════════════
       🛠️ اطمینان از وجود پوشه و فایل‌های ضروری
       فقط یه بار، وقتی پلاگین لود می‌شه
       ═══════════════════════════════════════════════════════ */
    async ensureFolder(): Promise<void> {
        const adapter = this.app.vault.adapter;

        try {
            /* ─── پوشه ─── */
            if (!(await adapter.exists(this.folderPath))) {
                await this.app.vault.createFolder(this.folderPath);
            }

            /* ─── README محافظ ─── */
            const readmePath = normalizePath(`${FOLDER_NAME}/${README_FILE}`);
            if (!(await adapter.exists(readmePath))) {
                await this.app.vault.create(readmePath, README_CONTENT);
            }

            /* ─── .gitignore ─── */
            const gitignorePath = normalizePath(`${FOLDER_NAME}/${GITIGNORE_FILE}`);
            if (!(await adapter.exists(gitignorePath))) {
                await this.app.vault.create(gitignorePath, GITIGNORE_CONTENT);
            }

            /* ─── index.json ─── */
            if (!(await adapter.exists(this.indexPath))) {
                await this.saveIndex();
            }

            /* ─── file-cache.json ─── */
            if (!(await adapter.exists(this.cachePath))) {
                await this.saveFileCache();
            }
        } catch (e) {
            console.warn('[First Task] Failed to ensure folder:', e);
        }
    }

    /* ═══════════════════════════════════════════════════════
       📖 لود ایندکس
       ═══════════════════════════════════════════════════════ */
    async loadIndex(): Promise<void> {
        try {
            const exists = await this.app.vault.adapter.exists(this.indexPath);
            if (!exists) {
                this.index = { ...DEFAULT_INDEX };
                return;
            }

            const content = await this.app.vault.adapter.read(this.indexPath);
            const parsed = JSON.parse(content);

            this.index = {
                version: parsed.version || 1,
                last_updated: parsed.last_updated || 0,
                tasks: parsed.tasks || {},
            };
        } catch (e) {
            console.warn('[First Task] Failed to load index:', e);
            this.index = { ...DEFAULT_INDEX };
        }
    }

    /* ═══════════════════════════════════════════════════════
       💾 ذخیره ایندکس
       ═══════════════════════════════════════════════════════ */
    async saveIndex(): Promise<void> {
        try {
            this.index.last_updated = Date.now();
            const content = JSON.stringify(this.index, null, 2);
            await this.app.vault.adapter.write(this.indexPath, content);
        } catch (e) {
            console.warn('[First Task] Failed to save index:', e);
        }
    }

    /* ═══════════════════════════════════════════════════════
       📖 لود کش فایل‌ها
       ═══════════════════════════════════════════════════════ */
    async loadFileCache(): Promise<void> {
        try {
            const exists = await this.app.vault.adapter.exists(this.cachePath);
            if (!exists) {
                this.fileCache = { ...DEFAULT_CACHE };
                return;
            }

            const content = await this.app.vault.adapter.read(this.cachePath);
            const parsed = JSON.parse(content);

            this.fileCache = {
                version: parsed.version || 1,
                files: parsed.files || {},
            };
        } catch (e) {
            console.warn('[First Task] Failed to load file cache:', e);
            this.fileCache = { ...DEFAULT_CACHE };
        }
    }

    /* ═══════════════════════════════════════════════════════
       💾 ذخیره کش فایل‌ها
       ═══════════════════════════════════════════════════════ */
    async saveFileCache(): Promise<void> {
        try {
            const content = JSON.stringify(this.fileCache, null, 2);
            await this.app.vault.adapter.write(this.cachePath, content);
        } catch (e) {
            console.warn('[First Task] Failed to save file cache:', e);
        }
    }

    /* ═══════════════════════════════════════════════════════
       🆔 گرفتن ورودی ایندکس برای یه تسک
       اگه نبود، ورودی پیش‌فرض برمی‌گردونه (همه خالی)
       ═══════════════════════════════════════════════════════ */
    getEntry(taskId: string): TaskIndexEntry {
        const existing = this.index.tasks[taskId];
        if (existing) {
            return {
                description: existing.description || '',
                due_date_iso: existing.due_date_iso || '',
                category: existing.category || '',
                pinned: existing.pinned === true,
            };
        }
        return {
            description: '',
            due_date_iso: '',
            category: '',
            pinned: false,
        };
    }

    /* ═══════════════════════════════════════════════════════
       ✍️ آپدیت ورودی ایندکس
       فقط فیلدهایی که توی patch هستن، عوض می‌شن
       ═══════════════════════════════════════════════════════ */
    async updateEntry(taskId: string, patch: Partial<TaskIndexEntry>): Promise<void> {
        const existing = this.index.tasks[taskId] || {
            description: '',
            due_date_iso: '',
            category: '',
            pinned: false,
        };

        this.index.tasks[taskId] = {
            description: patch.description ?? existing.description,
            due_date_iso: patch.due_date_iso ?? existing.due_date_iso,
            category: patch.category ?? existing.category,
            pinned: patch.pinned ?? existing.pinned,
        };

        await this.saveIndex();
    }

    /* ═══════════════════════════════════════════════════════
       🗑️ حذف ورودی ایندکس
       ═══════════════════════════════════════════════════════ */
    async removeEntry(taskId: string): Promise<void> {
        if (this.index.tasks[taskId]) {
            delete this.index.tasks[taskId];
            await this.saveIndex();
        }
    }

    /* ═══════════════════════════════════════════════════════
       🧹 پاکسازی ورودی‌های یتیم
       تسک‌هایی که توی markdown دیگه وجود ندارن
       ═══════════════════════════════════════════════════════ */
    async cleanupOrphans(activeIds: Set<string>): Promise<number> {
        let removed = 0;
        for (const id of Object.keys(this.index.tasks)) {
            if (!activeIds.has(id)) {
                delete this.index.tasks[id];
                removed++;
            }
        }
        if (removed > 0) {
            await this.saveIndex();
        }
        return removed;
    }

    /* ═══════════════════════════════════════════════════════
       📁 کش فایل‌ها
       ═══════════════════════════════════════════════════════ */
    getFileCache(filePath: string): FileCacheEntry | null {
        return this.fileCache.files[filePath] || null;
    }

    updateFileCache(filePath: string, entry: FileCacheEntry): void {
        this.fileCache.files[filePath] = entry;
    }

    removeFileCache(filePath: string): void {
        if (this.fileCache.files[filePath]) {
            delete this.fileCache.files[filePath];
        }
    }

    /* ═══════════════════════════════════════════════════════
       📊 گرفتن همه ورودی‌ها (برای دیباگ)
       ═══════════════════════════════════════════════════════ */
    getAllEntries(): Record<string, TaskIndexEntry> {
        return this.index.tasks;
    }
}
