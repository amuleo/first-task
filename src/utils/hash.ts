/* ════════════════════════════════════════════════════════════
   🆔 ابزارهای هش و ID — v0.3.0
   ✅ hashContent برای کش فایل‌ها
   ✅ generateTaskId برای تسک‌های نوت‌محور
   ✅ generateDesktopTaskId برای تسک‌های Desktop
   ✅ 🆕 generateRecurringId برای الگوهای تکرارشونده
   ════════════════════════════════════════════════════════════ */

/* ─── FNV-1a hash ─── */
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
   🆔 generateDesktopTaskId — برای تسک‌های Desktop
   ═══════════════════════════════════════════════════════════ */
export function generateDesktopTaskId(): string {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).substring(2, 10);
    return `${ts}-${rand}`;
}

/* ═══════════════════════════════════════════════════════════
   🆕 generateRecurringId — برای الگوهای تکرارشونده
   ═══════════════════════════════════════════════════════════ */
export function generateRecurringId(): string {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).substring(2, 10);
    return `rec-${ts}-${rand}`;
}

/* ═══════════════════════════════════════════════════════════
   📦 hashContent — برای کش محتوای فایل‌های نوت
   ═══════════════════════════════════════════════════════════ */
export function hashContent(content: string): string {
    const h1 = fnv1a(content);
    const h2 = fnv1a(content + '::hash-salt');
    return h1 + h2;
}
