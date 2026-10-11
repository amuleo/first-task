/* ════════════════════════════════════════════════════════════
   📝 توابع کمکی برای نام نوت
   ════════════════════════════════════════════════════════════ */

const MAX_NAME_LENGTH = 25;

/* ───── گرفتن نام قابل نمایش از مسیر ───── */
export function getDisplayNoteName(path: string): string {
    if (!path) return '';

    /* ─── آخرین بخش مسیر ─── */
    const parts = path.split('/');
    let name = parts[parts.length - 1] || path;

    /* ─── حذف پسوند .md ─── */
    name = name.replace(/\.md$/i, '');

    return name;
}

/* ───── کوتاه کردن نام نوت (برای نمایش در مودال) ───── */
export function truncateNoteName(name: string, maxLength = MAX_NAME_LENGTH): string {
    if (!name || name.length <= maxLength) return name;
    return name.substring(0, maxLength - 3) + '...';
}

/* ───── گرفتن مسیر کوتاه (برای نمایش در گروه‌ها) ───── */
export function getShortPath(path: string): string {
    if (!path) return '';

    const parts = path.split('/');

    /* ─── اگه بیشتر از ۲ بخش بود، فقط ۲ بخش آخر ─── */
    if (parts.length > 2) {
        return parts.slice(-2).join('/');
    }

    return path;
}
