/* ════════════════════════════════════════════════════════════
   🍞 Toast Manager — نمایش سریالی (یکی یکی)
   ✅ بالای صفحه (شبیه اعلان‌های پیش‌فرض آبسیدین)
   ✅ انیمیشن خروج نرم
   ════════════════════════════════════════════════════════════ */

export type ToastType = 'info' | 'success' | 'error' | 'warning';

interface ToastItem {
    id: number;
    text: string;
    type: ToastType;
    duration: number;
}

const EXIT_ANIMATION_MS = 250;

export class ToastManager {
    private container: HTMLElement;
    private queue: ToastItem[] = [];
    private current: ToastItem | null = null;
    private currentEl: HTMLElement | null = null;
    private currentTimeout: number | null = null;
    private isExiting = false;
    private nextId = 1;

    constructor() {
        this.container = document.body.createDiv({ cls: 'first-task-toast-container' });
    }

    setRTL(rtl: boolean): void {
        this.container.toggleClass('first-task-toast-rtl', rtl);
    }

    show(text: string, type: ToastType = 'info', duration = 3000): void {
        const item: ToastItem = {
            id: this.nextId++,
            text,
            type,
            duration,
        };
        this.queue.push(item);

        if (!this.current && !this.isExiting) {
            this.showNext();
        }
    }

    clear(): void {
        if (this.currentTimeout) {
            window.clearTimeout(this.currentTimeout);
            this.currentTimeout = null;
        }
        this.queue = [];
        this.current = null;
        this.currentEl = null;
        this.isExiting = false;
        this.container.empty();
    }

    destroy(): void {
        this.clear();
        this.container.remove();
    }

    private showNext(): void {
        if (this.queue.length === 0) {
            this.current = null;
            this.currentEl = null;
            this.isExiting = false;
            return;
        }

        const item = this.queue.shift()!;
        this.current = item;
        this.isExiting = false;

        this.container.empty();
        const el = this.container.createDiv({
            cls: `first-task-toast first-task-toast-${item.type}`,
        });
        el.dataset.id = String(item.id);
        el.createSpan({ text: item.text });
        this.currentEl = el;

        requestAnimationFrame(() => el.addClass('is-visible'));

        el.onclick = () => this.exitCurrent();

        this.currentTimeout = window.setTimeout(() => {
            this.currentTimeout = null;
            this.exitCurrent();
        }, item.duration);
    }

    private exitCurrent(): void {
        if (this.isExiting || !this.currentEl) return;
        this.isExiting = true;

        if (this.currentTimeout) {
            window.clearTimeout(this.currentTimeout);
            this.currentTimeout = null;
        }

        const el = this.currentEl;
        el.removeClass('is-visible');
        el.addClass('is-exiting');

        window.setTimeout(() => {
            this.current = null;
            this.currentEl = null;
            this.isExiting = false;
            this.showNext();
        }, EXIT_ANIMATION_MS);
    }
}
