/* ════════════════════════════════════════════════════════════
   🔢 تبدیل ارقام + نمایش داینامیک اعداد
   ════════════════════════════════════════════════════════════ */

import type { Language } from '../types';

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS  = '٠١٢٣٤٥٦٧٨٩';
const LATIN_DIGITS   = '0123456789';

/* ─── تبدیل ارقام فارسی/عربی به انگلیسی ─── */
export function normalizeNumbers(input: string): string {
    if (!input) return '';
    let result = input;
    for (let i = 0; i < 10; i++) {
        result = result.split(PERSIAN_DIGITS[i]).join(LATIN_DIGITS[i]);
        result = result.split(ARABIC_DIGITS[i]).join(LATIN_DIGITS[i]);
    }
    return result;
}

/* ─── تبدیل ارقام انگلیسی به فارسی ─── */
export function toPersianDigits(input: string): string {
    if (!input) return '';
    let result = input;
    for (let i = 0; i < 10; i++) {
        result = result.split(LATIN_DIGITS[i]).join(PERSIAN_DIGITS[i]);
    }
    return result;
}

/* ─── آیا رشته شامل عدد فارسی/عربی هست؟ ─── */
export function hasNonLatinNumbers(input: string): boolean {
    if (!input) return false;
    return /[۰-۹٠-٩]/.test(input);
}

/* ═══════════════════════════════════════════════════════════
   🎯 نمایش داینامیک
   ═══════════════════════════════════════════════════════════ */

/* نمایش عدد بر اساس زبان (با محدودیت 999+) */
export function displayNumber(n: number, lang: Language): string {
    let str: string;
    if (!n || n < 0) {
        str = '0';
    } else if (n > 999) {
        str = '+999';
    } else {
        str = String(n);
    }
    return lang === 'fa' ? toPersianDigits(str) : str;
}

/* نمایش رشته (تاریخ، شمارنده) بر اساس زبان */
export function displayString(str: string, lang: Language): string {
    if (!str) return '';
    return lang === 'fa' ? toPersianDigits(str) : str;
}
