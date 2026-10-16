/* ════════════════════════════════════════════════════════════
   🆔 ابزارهای هش و ID — v0.2.0
   ✅ hashContent برای کش فایل‌ها
   ✅ generateTaskId برای تسک‌های نوت‌محور
   ✅ 🆕 generateDesktopTaskId برای تسک‌های Desktop
   ════════════════════════════════════════════════════════════ */

/* ─── FNV-1a hash (سریع و قابل اعتماد برای حجم پایین) ─── */
function fnv1a(input: string): string {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}

/* ═══════════════════════════════════════════════════════════
   🆔 generateTaskId — برای تسک‌های نوت‌محور
   بر اساس: مسیر فایل + عنوان + شماره تکرار
   ═══════════════════════════════════════════════════════════ */
export function generateTaskId(
    sourceFile: string,
    title: string,
    occurrence: number = 0
): string {
    const raw = `${sourceFile}:::${title}:::${occurrence}`;
    const h1 = fnv1a(raw);
    const h2 = fnv1a(raw + '::first-task-salt');
    return h1 + h2;
}

/* ═══════════════════════════════════════════════════════════
   🆕 generateDesktopTaskId — برای تسک‌های Desktop
   ID یکتا، پایدار، مستقل از محتوا
   ─ فرمت: timestamp-base36 + random-base36
   ─ مثال: "lq4k8f-9a3b1c2d"
   ═══════════════════════════════════════════════════════════ */
export function generateDesktopTaskId(): string {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).substring(2, 10);
    return `${ts}-${rand}`;
}

/* ═══════════════════════════════════════════════════════════
   📦 hashContent — برای کش محتوای فایل‌های نوت
   ═══════════════════════════════════════════════════════════ */
export function hashContent(content: string): string {
    const h1 = fnv1a(content);
    const h2 = fnv1a(content + '::hash-salt');
    return h1 + h2;
}
