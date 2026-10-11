/* ════════════════════════════════════════════════════════════
   🔔 Notifier — گوش دادن به تغییرات والت
   ✅ Real-time (ایونت‌های آبسیدین)
   ✅ Debounce برای جلوگیری از اسکن‌های پشت سر هم
   ════════════════════════════════════════════════════════════ */

import { App, TFile, EventRef } from 'obsidian';

/* مدت debounce (میلی‌ثانیه) */
const DEBOUNCE_MS = 400;

type FileChangedCallback = (file: TFile) => void;
type FileDeletedCallback = (path: string) => void;
type FileRenamedCallback = (oldPath: string, file: TFile) => void;

export class Notifier {
    private timers: Map<string, number> = new Map();
    private eventRefs: EventRef[] = [];

    constructor(
        private app: App,
        private onFileChanged: FileChangedCallback,
        private onFileDeleted: FileDeletedCallback,
        private onFileRenamed: FileRenamedCallback
    ) {}

    /* ═══════════════════════════════════════════════════════
       ▶️ شروع گوش دادن
       ═══════════════════════════════════════════════════════ */
    start(): void {
        /* ─── فایل تغییر کرد ─── */
        this.eventRefs.push(
            this.app.vault.on('modify', (file) => {
                if (!(file instanceof TFile)) return;
                if (file.extension !== 'md') return;
                this.scheduleChange(file);
            })
        );

        /* ─── فایل جدید ساخته شد ─── */
        this.eventRefs.push(
            this.app.vault.on('create', (file) => {
                if (!(file instanceof TFile)) return;
                if (file.extension !== 'md') return;
                this.scheduleChange(file);
            })
        );

        /* ─── فایل حذف شد ─── */
        this.eventRefs.push(
            this.app.vault.on('delete', (file) => {
                if (!(file instanceof TFile)) return;
                if (file.extension !== 'md') return;
                /* اگه تایمری برای این فایل بود، پاکش کن */
                const timer = this.timers.get(file.path);
                if (timer) {
                    window.clearTimeout(timer);
                    this.timers.delete(file.path);
                }
                try {
                    this.onFileDeleted(file.path);
                } catch (e) {
                    console.warn('[First Task] onFileDeleted failed:', e);
                }
            })
        );

        /* ─── فایل تغییر نام داد ─── */
        this.eventRefs.push(
            this.app.vault.on('rename', (file, oldPath) => {
                if (!(file instanceof TFile)) return;
                if (file.extension !== 'md') return;
                try {
                    this.onFileRenamed(oldPath, file);
                } catch (e) {
                    console.warn('[First Task] onFileRenamed failed:', e);
                }
            })
        );
    }

    /* ═══════════════════════════════════════════════════════
       ⏹️ توقف گوش دادن (هنگام unload)
       ═══════════════════════════════════════════════════════ */
    stop(): void {
        for (const ref of this.eventRefs) {
            this.app.vault.offref(ref);
        }
        this.eventRefs = [];

        for (const timer of this.timers.values()) {
            window.clearTimeout(timer);
        }
        this.timers.clear();
    }

    /* ═══════════════════════════════════════════════════════
       ⏱️ Debounce کردن تغییرات (جلوگیری از اسکن پشت سر هم)
       ═══════════════════════════════════════════════════════ */
    private scheduleChange(file: TFile): void {
        const path = file.path;

        /* ─── پاک کردن تایمر قبلی ─── */
        const existing = this.timers.get(path);
        if (existing) {
            window.clearTimeout(existing);
        }

        /* ─── تایمر جدید ─── */
        const timer = window.setTimeout(() => {
            this.timers.delete(path);
            try {
                this.onFileChanged(file);
            } catch (e) {
                console.warn('[First Task] onFileChanged failed:', e);
            }
        }, DEBOUNCE_MS);

        this.timers.set(path, timer);
    }
}
