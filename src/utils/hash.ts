/* ════════════════════════════════════════════════════════════
   🔐 توابع هش (سبک، بدون وابستگی، کار روی موبایل و دسکتاپ)
   ════════════════════════════════════════════════════════════ */

/* FNV-1a hash — سریع، بدون وابستگی، و کار روی همه‌ی پلتفرم‌ها */
function fnv1a(input: string): string {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}

/* ═══════════════════════════════════════════════════════
   🆔 ساخت شناسه یکتا از فایل + عنوان
   → ۱۶ کاراکتر (ترکیب دو هش FNV)
   
   نکته: اگه عنوان یا فایل عوض بشه، ID عوض می‌شه.
   ولی تغییر توضیحات/تاریخ/دسته → ID ثابت می‌مونه.
   ═══════════════════════════════════════════════════════ */
export function generateTaskId(sourceFile: string, title: string): string {
    const raw = `${sourceFile}:::${title}`;
    const h1 = fnv1a(raw);
    const h2 = fnv1a(raw + '::first-task-salt');
    return h1 + h2;
}

/* ═══════════════════════════════════════════════════════
   📄 هش محتوای فایل (برای کش هوشمند)
   وقتی mtime عوض بشه ولی محتوا یکی باشه، rescan نکن
   ═══════════════════════════════════════════════════════ */
export function hashContent(content: string): string {
    const h1 = fnv1a(content);
    const h2 = fnv1a(content + '::hash-salt');
    return h1 + h2;
}
