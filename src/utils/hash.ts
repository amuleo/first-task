/* ════════════════════════════════════════════════════════════
   🔐 توابع هش — v0.1.2
   ✅ پشتیبانی از occurrence (تسک‌های با عنوان تکراری)
   ════════════════════════════════════════════════════════════ */

function fnv1a(input: string): string {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}

/* 🆕 ساخت شناسه با شماره تکرار
   → دو تسک با عنوان یکسان توی یه فایل، ID متفاوت می‌گیرن
   ─ مثال:
     task1: file.md:::خرید نان:::0
     task2: file.md:::خرید نان:::1
*/
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

export function hashContent(content: string): string {
    const h1 = fnv1a(content);
    const h2 = fnv1a(content + '::hash-salt');
    return h1 + h2;
}
