/* ════════════════════════════════════════════════════════════
   🗂️ مدیریت ایندکس — v0.1.3
   ✅ Backup خودکار در صورت خرابی
   ✅ Guard ایمنی در cleanupOrphans
   ✅ Grace period برای orphanها
   ✅ متدهای کمکی برای بازیابی متادیتا
   ════════════════════════════════════════════════════════════ */

import { App, normalizePath } from 'obsidian';
import type {
    TaskIndexFile,
    TaskIndexEntry,
    FileCacheFile,
    FileCacheEntry,
} from '../types';
import { DEFAULT_ENTRY } from '../types';

const FOLDER_NAME = 'FirstTask';
const INDEX_FILE = 'index.json';
const CACHE_FILE = 'file-cache.json';
const README_FILE = 'DO-NOT-DELETE.md';
const GITIGNORE_FILE = '.gitignore';

/* 🆕 grace period: ۳۰ روز */
const ORPHAN_GRACE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

const DEFAULT_INDEX: TaskIndexFile = {
    version: 1,
    last_updated: 0,
    tasks: {},
};

const DEFAULT_CACHE: FileCacheFile = {
    version: 1,
    files: {},
};

const README_CONTENT = `# ⚠️ DO NOT DELETE THIS FOLDER

This folder is used by the **First Task** plugin.
It stores task metadata like:

- 📝 Descriptions
- 🏷️ Categories
- 📌 Pins
- 📅 Due dates
- ⏱️ Creation & completion times

**If you delete this folder:**
- ❌ All task metadata will be lost
- ✅ Task titles (in your notes) will remain safe

**This folder is synced by Remotely Save**, so it's automatically backed up.
`;

const GITIGNORE_CONTENT = `# Cache — regenerable
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

    /* ─── اطمینان از پوشه + فایل‌ها ─── */
    async ensureFolder(): Promise<void> {
        const adapter = this.app.vault.adapter;
        try {
            if (!(await adapter.exists(this.folderPath))) {
                await this.app.vault.createFolder(this.folderPath);
            }

            const readmePath = normalizePath(`${FOLDER_NAME}/${README_FILE}`);
            if (!(await adapter.exists(readmePath))) {
                await this.app.vault.create(readmePath, README_CONTENT);
            }

            const gitignorePath = normalizePath(`${FOLDER_NAME}/${GITIGNORE_FILE}`);
            if (!(await adapter.exists(gitignorePath))) {
                await this.app.vault.create(gitignorePath, GITIGNORE_CONTENT);
            }

            if (!(await adapter.exists(this.indexPath))) {
                await this.saveIndex();
            }
            if (!(await adapter.exists(this.cachePath))) {
                await this.saveFileCache();
            }
        } catch (e) {
            console.warn('[First Task] Failed to ensure folder:', e);
        }
    }

    /* ─── لود index (با backup خرابی) ─── */
    async loadIndex(): Promise<void> {
        try {
            const exists = await this.app.vault.adapter.exists(this.indexPath);
            if (!exists) {
                this.index = { ...DEFAULT_INDEX };
                return;
            }

            const content = await this.app.vault.adapter.read(this.indexPath);

            /* 🆕 اگه JSON خراب بود، backup بگیر */
            let parsed: any;
            try {
                parsed = JSON.parse(content);
            } catch (parseErr) {
                const backupPath = normalizePath(
                    `${FOLDER_NAME}/index.corrupted-${Date.now()}.json`
                );
                try {
                    await this.app.vault.adapter.write(backupPath, content);
                    console.warn(
                        `[First Task] Corrupted index backed up to: ${backupPath}`
                    );
                } catch (_) {
                    /* ignore */
                }
                this.index = { ...DEFAULT_INDEX };
                return;
            }

            this.index = {
                version: parsed.version || 1,
                last_updated: parsed.last_updated || 0,
                tasks: parsed.tasks || {},
            };
        } catch (e) {
            console.warn('[First Task] Index load failed:', e);
            this.index = { ...DEFAULT_INDEX };
        }
    }

    async saveIndex(): Promise<void> {
        try {
            this.index.last_updated = Date.now();
            const content = JSON.stringify(this.index, null, 2);
            await this.app.vault.adapter.write(this.indexPath, content);
        } catch (e) {
            console.warn('[First Task] Index save failed:', e);
        }
    }

    /* ─── لود / ذخیره cache ─── */
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
            console.warn('[First Task] File cache load failed:', e);
            this.fileCache = { ...DEFAULT_CACHE };
        }
    }

    async saveFileCache(): Promise<void> {
        try {
            const content = JSON.stringify(this.fileCache, null, 2);
            await this.app.vault.adapter.write(this.cachePath, content);
        } catch (e) {
            console.warn('[First Task] File cache save failed:', e);
        }
    }

    /* ─── گرفتن ورودی (با پیش‌فرض) ─── */
    getEntry(taskId: string): TaskIndexEntry {
        const existing = this.index.tasks[taskId];
        if (!existing) return { ...DEFAULT_ENTRY };
        return { ...DEFAULT_ENTRY, ...existing };
    }

    /* 🆕 چک وجود */
    hasEntry(taskId: string): boolean {
        return !!this.index.tasks[taskId];
    }

    /* 🆕 گرفتن همه‌ی entryها برای بازیابی */
    exportAllEntries(): Array<[string, TaskIndexEntry]> {
        return Object.entries(this.index.tasks);
    }

    /* 🆕 انتقال entry از یه ID به یه ID دیگه */
    async moveEntry(fromId: string, toId: string): Promise<void> {
        const entry = this.index.tasks[fromId];
        if (!entry) return;
        this.index.tasks[toId] = { ...entry };
        delete this.index.tasks[fromId];
        await this.saveIndex();
    }

    /* ─── آپدیت ─── */
    async updateEntry(
        taskId: string,
        patch: Partial<TaskIndexEntry>
    ): Promise<void> {
        const existing = this.index.tasks[taskId] || { ...DEFAULT_ENTRY };
        this.index.tasks[taskId] = {
            ...existing,
            ...patch,
        };
        await this.saveIndex();
    }

    /* ─── حذف ─── */
    async removeEntry(taskId: string): Promise<void> {
        if (this.index.tasks[taskId]) {
            delete this.index.tasks[taskId];
            await this.saveIndex();
        }
    }

    /* ═══════════════════════════════════════════════════════
       🆕 cleanupOrphans — ایمن و عاقلانه
       - گارد ایمنی: اگه بیشتر از ۵۰٪ ایندکس می‌خواد پاک بشه، رد کن
       - Grace period: orphanها ۳۰ روز زنده می‌مونن
       ═══════════════════════════════════════════════════════ */
    async cleanupOrphans(activeIds: Set<string>): Promise<number> {
        const totalEntries = Object.keys(this.index.tasks).length;
        const totalActive = activeIds.size;

        /* 🆕 گارد ایمنی — جلوگیری از فاجعه */
        if (totalEntries > 5 && totalActive < totalEntries * 0.5) {
            console.warn(
                `[First Task] Skipping cleanupOrphans: ` +
                `only ${totalActive} active vs ${totalEntries} entries. ` +
                `Possible bug, keeping metadata safe.`
            );
            return 0;
        }

        const now = Date.now();
        let removed = 0;

        for (const id of Object.keys(this.index.tasks)) {
            if (activeIds.has(id)) {
                /* 🆕 mark as seen */
                (this.index.tasks[id] as any)._last_seen_ts = now;
                continue;
            }

            const lastSeen =
                (this.index.tasks[id] as any)._last_seen_ts || 0;

            /* اگه entry قدیمی بدون last_seen داریم → بهش زمان بده */
            if (!lastSeen) {
                (this.index.tasks[id] as any)._last_seen_ts = now;
                continue;
            }

            /* اگه هنوز تو بازه‌ی مهلته → نگهش دار */
            if (now - lastSeen < ORPHAN_GRACE_PERIOD_MS) continue;

            delete this.index.tasks[id];
            removed++;
        }

        if (removed > 0) await this.saveIndex();
        return removed;
    }

    /* ─── کش فایل‌ها ─── */
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
}
