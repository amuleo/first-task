/* ════════════════════════════════════════════════════════════
   📝 توابع کمکی برای نام نوت
   ════════════════════════════════════════════════════════════ */

const MAX_NAME_LENGTH = 12;

/* ─── گرفتن نام قابل نمایش ─── */
export function getDisplayNoteName(path: string): string {
    if (!path) return '';
    const parts = path.split('/');
    let name = parts[parts.length - 1] || path;
    name = name.replace(/\.md$/i, '');
    return name;
}

/* ─── کوتاه کردن نام نوت (۱۲ کاراکتر) ─── */
export function truncateNoteName(name: string, maxLength: number = MAX_NAME_LENGTH): string {
    if (!name || name.length <= maxLength) return name;
    return name.substring(0, maxLength - 3) + '...';
}

/* ─── گرفتن مسیر کوتاه ─── */
export function getShortPath(path: string): string {
    if (!path) return '';
    const parts = path.split('/');
    if (parts.length > 2) {
        return parts.slice(-2).join('/');
    }
    return path;
}
