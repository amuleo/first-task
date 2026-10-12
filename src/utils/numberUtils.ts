/* ════════════════════════════════════════════════════════════
   🔢 تبدیل ارقام فارسی/عربی به انگلیسی
   ════════════════════════════════════════════════════════════ */

const PERSIAN_DIGITS  = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS   = '٠١٢٣٤٥٦٧٨٩';

/* تبدیل هر رقم فارسی/عربی به انگلیسی */
export function normalizeNumbers(input: string): string {
    if (!input) return '';
    let result = input;
    for (let i = 0; i < 10; i++) {
        result = result.split(PERSIAN_DIGITS[i]).join(String(i));
        result = result.split(ARABIC_DIGITS[i]).join(String(i));
    }
    return result;
}

/* آیا رشته شامل عدد فارسی/عربیه؟ */
export function hasNonLatinNumbers(input: string): boolean {
    if (!input) return false;
    return /[۰-۹٠-٩]/.test(input);
}
