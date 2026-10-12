/* ════════════════════════════════════════════════════════════
   🔢 فرمت اعداد و مقادیر
   ════════════════════════════════════════════════════════════ */

const MAX_DISPLAY = 999;

/* نمایش عدد با محدودیت ۹۹۹+ */
export function formatCount(n: number): string {
    if (!n || n < 0) return '0';
    if (n > MAX_DISPLAY) return '+999';
    return String(n);
}

/* نمایش زمان نسبی (اختیاری، برای آینده) */
export function formatRelativeTime(ts: number, lang: 'en' | 'fa'): string {
    if (!ts) return '';
    const diff = Date.now() - ts;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (lang === 'fa') {
        if (minutes < 1) return 'همین حالا';
        if (minutes < 60) return `${minutes} دقیقه پیش`;
        if (hours < 24) return `${hours} ساعت پیش`;
        return `${days} روز پیش`;
    }

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}
