/* ════════════════════════════════════════════════════════════
   📁 اسکنر والت — پیدا کردن فایل‌های markdown
   ✅ با فیلتر پوشه‌ها
   ✅ فقط فایل‌های markdown
   ════════════════════════════════════════════════════════════ */

import { App, TFile } from 'obsidian';
import type { FirstTaskSettings } from '../types';

export class VaultScanner {
    constructor(
        private app: App,
        private getSettings: () => FirstTaskSettings
    ) {}

    /* ═══════════════════════════════════════════════════════
       📋 گرفتن همه‌ی فایل‌های markdown معتبر
       ═══════════════════════════════════════════════════════ */
    getMarkdownFiles(): TFile[] {
        const allFiles = this.app.vault.getMarkdownFiles();
        return allFiles.filter(f => this.shouldInclude(f));
    }

    /* ═══════════════════════════════════════════════════════
       ✅ چک کردن اینکه فایل باید اسکن بشه یا نه
       ═══════════════════════════════════════════════════════ */
    shouldInclude(file: TFile): boolean {
        const settings = this.getSettings();
        const path = file.path;

        /* ─── فایل‌های مخفی ─── */
        const parts = path.split('/');
        for (const part of parts) {
            if (part.startsWith('.')) return false;
        }

        /* ─── پوشه‌های نادیده ─── */
        for (const exclude of settings.excludeFolders) {
            const norm = exclude.replace(/^\/+|\/+$/g, '');
            if (!norm) continue;
            if (path === norm || path.startsWith(norm + '/')) {
                return false;
            }
        }

        /* ─── پوشه‌های شامل (اگه تنظیم شده) ─── */
        if (settings.includeFolders.length > 0) {
            let included = false;
            for (const include of settings.includeFolders) {
                const norm = include.replace(/^\/+|\/+$/g, '');
                if (!norm) continue;
                if (path === norm || path.startsWith(norm + '/')) {
                    included = true;
                    break;
                }
            }
            if (!included) return false;
        }

        return true;
    }

    /* ═══════════════════════════════════════════════════════
       📖 خواندن محتوای یه فایل
       ═══════════════════════════════════════════════════════ */
    async readFile(file: TFile): Promise<string> {
        try {
            return await this.app.vault.cachedRead(file);
        } catch (e) {
            console.warn('[First Task] Failed to read file:', file.path, e);
            return '';
        }
    }

    /* ═══════════════════════════════════════════════════════
       🕐 گرفتن اطلاعات فایل (mtime + size)
       ═══════════════════════════════════════════════════════ */
    getFileStat(file: TFile): { mtime: number; size: number } {
        return {
            mtime: file.stat.mtime,
            size: file.stat.size,
        };
    }

    /* ═══════════════════════════════════════════════════════
       🔍 پیدا کردن فایل با مسیر
       ═══════════════════════════════════════════════════════ */
    getFileByPath(path: string): TFile | null {
        const file = this.app.vault.getAbstractFileByPath(path);
        if (file instanceof TFile) return file;
        return null;
    }
}
