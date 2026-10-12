/* ════════════════════════════════════════════════════════════
   📅 تبدیل تاریخ + محاسبات + پارس ورودی کاربر
   ════════════════════════════════════════════════════════════ */

import { normalizeNumbers } from './numberUtils';

/* ───── تبدیل میلادی → شمسی ───── */
export function toJalali(gy: number, gm: number, gd: number): [number, number, number] {
    const gDM = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let jy = gy <= 1600 ? 0 : 979;
    gy -= gy <= 1600 ? 621 : 1600;
    const gy2 = gm > 2 ? gy + 1 : gy;
    let days = 365 * gy + Math.floor((gy2 + 3) / 4) -
        Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) -
        80 + gd + gDM[gm - 1];
    jy += 33 * Math.floor(days / 12053);
    days %= 12053;
    jy += 4 * Math.floor(days / 1461);
    days %= 1461;
    if (days > 365) {
        jy += Math.floor((days - 1) / 365);
        days = (days - 1) % 365;
    }
    const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
    const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
    return [jy, jm, jd];
}

/* ───── تبدیل شمسی → میلادی ───── */
export function toGregorian(jy: number, jm: number, jd: number): [number, number, number] {
    jy += 1595;
    let days = -355668 + 365 * jy + Math.floor(jy / 33) * 8 +
        Math.floor(((jy % 33) + 3) / 4) + jd +
        (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
    let gy = 400 * Math.floor(days / 146097);
    days %= 146097;
    if (days > 36524) {
        gy += 100 * Math.floor(--days / 36524);
        days %= 36524;
        if (days >= 365) days++;
    }
    gy += 4 * Math.floor(days / 1461);
    days %= 1461;
    if (days > 365) {
        gy += Math.floor((days - 1) / 365);
        days = (days - 1) % 365;
    }
    let gd = days + 1;
    const leap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
    const sal_a = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let gm: number;
    for (gm = 1; gm <= 12; gm++) {
        if (gd <= sal_a[gm]) break;
        gd -= sal_a[gm];
    }
    return [gy, gm, gd];
}

function pad(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
}

/* ═══════════════════════════════════════════════════════════
   📅 رشته‌های تاریخ (کوتاه = فقط تاریخ، بلند = تاریخ + ساعت)
   ═══════════════════════════════════════════════════════════ */

/* Jalali کوتاه: "1405/07/25" */
export function getJalaliDateShort(date: Date): string {
    const [jy, jm, jd] = toJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
    return `${jy}/${pad(jm)}/${pad(jd)}`;
}

/* Jalali بلند: "1405/07/25 - 14:30" */
export function getJalaliDateFull(date: Date): string {
    return `${getJalaliDateShort(date)} - ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/* Gregorian کوتاه: "2026-10-15" */
export function getGregorianDateShort(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/* Gregorian بلند: "2026-10-15 14:30" */
export function getGregorianDateFull(date: Date): string {
    return `${getGregorianDateShort(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/* نمایش بر اساس تنظیمات کاربر */
export function formatDateDisplay(
    jalali: string,
    gregorian: string,
    useJalali: boolean
): string {
    return useJalali ? jalali : gregorian;
}

/* ═══════════════════════════════════════════════════════════
   🎯 پارس ورودی تاریخ کاربر (با پشتیبانی اعداد فارسی)
   ═══════════════════════════════════════════════════════════ */

export interface ParsedDate {
    jalali: string;      // "1405/07/25"
    gregorian: string;   // "2026-10-15"
    ts: number;          // زمان (midnight محلی)
}

export function parseDateInput(input: string, useJalali: boolean): ParsedDate | null {
    if (!input) return null;

    /* ─── تبدیل اعداد فارسی به انگلیسی ─── */
    const normalized = normalizeNumbers(input).trim();
    if (!normalized) return null;

    let jy: number, jm: number, jd: number;

    if (useJalali) {
        /* فرمت: YYYY/MM/DD یا YYYY-MM-DD */
        const match = normalized.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
        if (!match) return null;
        jy = parseInt(match[1]);
        jm = parseInt(match[2]);
        jd = parseInt(match[3]);

        /* اعتبارسنجی */
        if (jy < 1300 || jy > 1500) return null;
        if (jm < 1 || jm > 12) return null;
        if (jd < 1 || jd > 31) return null;
    } else {
        /* فرمت میلادی: YYYY-MM-DD */
        const match = normalized.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
        if (!match) return null;
        const gy = parseInt(match[1]);
        const gm = parseInt(match[2]);
        const gd = parseInt(match[3]);

        if (gy < 1900 || gy > 2200) return null;
        if (gm < 1 || gm > 12) return null;
        if (gd < 1 || gd > 31) return null;

        /* تبدیل به شمسی */
        const [jy2, jm2, jd2] = toJalali(gy, gm, gd);
        jy = jy2;
        jm = jm2;
        jd = jd2;
    }

    /* ─── تبدیل شمسی به میلادی ─── */
    const [gy, gm, gd] = toGregorian(jy, jm, jd);

    /* ─── ساخت Date ─── */
    const date = new Date(gy, gm - 1, gd, 0, 0, 0, 0);
    const ts = date.getTime();

    return {
        jalali: `${jy}/${pad(jm)}/${pad(jd)}`,
        gregorian: `${gy}-${pad(gm)}-${pad(gd)}`,
        ts,
    };
}

/* ═══════════════════════════════════════════════════════════
   📅 گرفتن امروز
   ═══════════════════════════════════════════════════════════ */

export function getTodayJalali(): string {
    return getJalaliDateShort(new Date());
}

export function getTodayGregorian(): string {
    return getGregorianDateShort(new Date());
}

export function getTodayDateInput(useJalali: boolean): string {
    return useJalali ? getTodayJalali() : getTodayGregorian();
}

/* ═══════════════════════════════════════════════════════════
   ⏱️ محاسبات بازه‌ها (DST-safe)
   ═══════════════════════════════════════════════════════════ */

export function startOfDay(ts: number): number {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

export function startOfYesterday(ts: number): number {
    const d = new Date(ts);
    d.setDate(d.getDate() - 1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

export function startOfDaysAgo(ts: number, days: number): number {
    const d = new Date(ts);
    d.setDate(d.getDate() - days);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

export function getJalaliYearStart(ts: number): number {
    const d = new Date(ts);
    const [jy] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const [gy, gm, gd] = toGregorian(jy, 1, 1);
    return new Date(gy, gm - 1, gd, 0, 0, 0, 0).getTime();
}

export function getJalaliPrevMonthStart(ts: number): number {
    const d = new Date(ts);
    let [jy, jm] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    jm -= 1;
    if (jm < 1) { jm = 12; jy -= 1; }
    const [gy, gm, gd] = toGregorian(jy, jm, 1);
    return new Date(gy, gm - 1, gd, 0, 0, 0, 0).getTime();
}

export function getGregorianYearStart(ts: number): number {
    const d = new Date(ts);
    d.setMonth(0, 1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

export function getGregorianPrevMonthStart(ts: number): number {
    const d = new Date(ts);
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

/* ═══════════════════════════════════════════════════════════
   🎯 دسته‌بندی‌های داینامیک (بر اساس due_date_ts)
   ═══════════════════════════════════════════════════════════ */

export function isTodayTs(ts: number): boolean {
    if (!ts) return false;
    const target = startOfDay(ts);
    const today = startOfDay(Date.now());
    return target === today;
}

export function isTomorrowTs(ts: number): boolean {
    if (!ts) return false;
    const target = startOfDay(ts);
    const tomorrow = startOfDaysAgo(Date.now(), -1);
    return target === tomorrow;
}

export function isWithinNextWeekTs(ts: number): boolean {
    if (!ts) return false;
    const target = startOfDay(ts);
    const today = startOfDay(Date.now());
    const weekLater = startOfDaysAgo(Date.now(), -7);
    return target >= today && target < weekLater;
}

export function isThisMonthTs(ts: number): boolean {
    if (!ts) return false;
    const d = new Date(ts);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export function isThisYearTs(ts: number): boolean {
    if (!ts) return false;
    return new Date(ts).getFullYear() === new Date().getFullYear();
}
