/* ════════════════════════════════════════════════════════════
   📅 تبدیل تاریخ + محاسبات دقیق (Jalali + Gregorian)
   ✅ هفته / ماه / سال دقیق با پشتیبانی از weekStartDay
   ════════════════════════════════════════════════════════════ */

import { normalizeNumbers } from './numberUtils';
import type { WeekStartDay } from '../types';

/* ─── تعداد روزهای ماه‌های شمسی ─── */
const JALALI_MONTH_DAYS = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];

/* ─── کبیسه شمسی ─── */
export function isJalaliLeapYear(jy: number): boolean {
    const mod = jy % 33;
    return [1, 5, 9, 13, 17, 22, 26, 30].includes(mod);
}

export function getJalaliMonthDays(jy: number, jm: number): number {
    if (jm === 12) {
        return isJalaliLeapYear(jy) ? 30 : 29;
    }
    return JALALI_MONTH_DAYS[jm - 1];
}

/* ═══════════════════════════════════════════════════════════
   تبدیل میلادی ↔ شمسی
   ═══════════════════════════════════════════════════════════ */

export function toJalali(gy: number, gm: number, gd: number): [number, number, number] {
    const gDM = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let jy = gy <= 1600 ? 0 : 979;
    gy -= gy <= 1600 ? 621 : 1600;
    const gy2 = gm > 2 ? gy + 1 : gy;
    let days =
        365 * gy +
        Math.floor((gy2 + 3) / 4) -
        Math.floor((gy2 + 99) / 100) +
        Math.floor((gy2 + 399) / 400) -
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

export function toGregorian(jy: number, jm: number, jd: number): [number, number, number] {
    jy += 1595;
    let days =
        -355668 + 365 * jy + Math.floor(jy / 33) * 8 +
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
   رشته‌های تاریخ
   ═══════════════════════════════════════════════════════════ */

export function getJalaliDateShort(date: Date): string {
    const [jy, jm, jd] = toJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
    return `${jy}/${pad(jm)}/${pad(jd)}`;
}

export function getJalaliDateFull(date: Date): string {
    return `${getJalaliDateShort(date)} - ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function getGregorianDateShort(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function getGregorianDateFull(date: Date): string {
    return `${getGregorianDateShort(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

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
   پارس ورودی تاریخ
   ═══════════════════════════════════════════════════════════ */

export interface ParsedDate {
    jalali: string;
    gregorian: string;
    ts: number;
}

export function parseDateInput(input: string, useJalali: boolean): ParsedDate | null {
    if (!input) return null;
    const normalized = normalizeNumbers(input).trim();
    if (!normalized) return null;

    let jy: number, jm: number, jd: number;

    if (useJalali) {
        const match = normalized.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
        if (!match) return null;
        jy = parseInt(match[1]);
        jm = parseInt(match[2]);
        jd = parseInt(match[3]);

        if (jy < 1300 || jy > 1500) return null;
        if (jm < 1 || jm > 12) return null;
        const maxDay = getJalaliMonthDays(jy, jm);
        if (jd < 1 || jd > maxDay) return null;
    } else {
        const match = normalized.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
        if (!match) return null;
        const gy = parseInt(match[1]);
        const gm = parseInt(match[2]);
        const gd = parseInt(match[3]);

        if (gy < 1900 || gy > 2200) return null;
        if (gm < 1 || gm > 12) return null;
        if (gd < 1 || gd > 31) return null;

        const test = new Date(gy, gm - 1, gd);
        if (test.getFullYear() !== gy || test.getMonth() !== gm - 1 || test.getDate() !== gd) {
            return null;
        }

        const [jy2, jm2, jd2] = toJalali(gy, gm, gd);
        jy = jy2; jm = jm2; jd = jd2;
    }

    const [gy, gm, gd] = toGregorian(jy, jm, jd);
    const date = new Date(gy, gm - 1, gd, 0, 0, 0, 0);

    return {
        jalali: `${jy}/${pad(jm)}/${pad(jd)}`,
        gregorian: `${gy}-${pad(gm)}-${pad(gd)}`,
        ts: date.getTime(),
    };
}

/* ═══════════════════════════════════════════════════════════
   شروع / پایان بازه‌ها
   ═══════════════════════════════════════════════════════════ */

export function startOfDay(ts: number): number {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

export function endOfDay(ts: number): number {
    const d = new Date(ts);
    d.setHours(23, 59, 59, 999);
    return d.getTime();
}

export function startOfDaysAgo(ts: number, days: number): number {
    const d = new Date(ts);
    d.setDate(d.getDate() - days);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

export function startOfYesterday(ts: number): number {
    return startOfDaysAgo(ts, 1);
}

/* ─── شروع / پایان هفته بر اساس weekStartDay ─── */
export function startOfWeek(ts: number, weekStartDay: WeekStartDay): number {
    const d = new Date(ts);
    const currentDay = d.getDay();          /* 0=Sunday, ..., 6=Saturday */
    const diff = (currentDay - weekStartDay + 7) % 7;
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

export function endOfWeek(ts: number, weekStartDay: WeekStartDay): number {
    const start = startOfWeek(ts, weekStartDay);
    const d = new Date(start);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d.getTime();
}

/* ─── ماه میلادی ─── */
export function startOfGregorianMonth(ts: number): number {
    const d = new Date(ts);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

export function endOfGregorianMonth(ts: number): number {
    const d = new Date(ts);
    d.setMonth(d.getMonth() + 1, 0);
    d.setHours(23, 59, 59, 999);
    return d.getTime();
}

/* ─── ماه شمسی ─── */
export function startOfJalaliMonth(ts: number): number {
    const d = new Date(ts);
    const [jy, jm] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const [gy, gm, gd] = toGregorian(jy, jm, 1);
    return new Date(gy, gm - 1, gd, 0, 0, 0, 0).getTime();
}

export function endOfJalaliMonth(ts: number): number {
    const d = new Date(ts);
    const [jy, jm] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const daysInMonth = getJalaliMonthDays(jy, jm);
    const [gy, gm, gd] = toGregorian(jy, jm, daysInMonth);
    return new Date(gy, gm - 1, gd, 23, 59, 59, 999).getTime();
}

/* ─── سال میلادی ─── */
export function startOfGregorianYear(ts: number): number {
    const d = new Date(ts);
    d.setMonth(0, 1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

export function endOfGregorianYear(ts: number): number {
    const d = new Date(ts);
    d.setMonth(11, 31);
    d.setHours(23, 59, 59, 999);
    return d.getTime();
}

/* ─── سال شمسی ─── */
export function startOfJalaliYear(ts: number): number {
    const d = new Date(ts);
    const [jy] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const [gy, gm, gd] = toGregorian(jy, 1, 1);
    return new Date(gy, gm - 1, gd, 0, 0, 0, 0).getTime();
}

export function endOfJalaliYear(ts: number): number {
    const d = new Date(ts);
    const [jy] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const lastDay = isJalaliLeapYear(jy) ? 30 : 29;
    const [gy, gm, gd] = toGregorian(jy, 12, lastDay);
    return new Date(gy, gm - 1, gd, 23, 59, 59, 999).getTime();
}

/* ═══════════════════════════════════════════════════════════
   🎯 بررسی بازه‌ها (کاملاً دقیق)
   ═══════════════════════════════════════════════════════════ */

export function isPastTs(ts: number): boolean {
    if (!ts) return false;
    return ts < startOfDay(Date.now());
}

export function isTodayTs(ts: number): boolean {
    if (!ts) return false;
    return startOfDay(ts) === startOfDay(Date.now());
}

export function isTomorrowTs(ts: number): boolean {
    if (!ts) return false;
    const tomorrow = startOfDay(Date.now()) + 86400000;
    return startOfDay(ts) === tomorrow;
}

export function isThisWeekTs(ts: number, weekStartDay: WeekStartDay): boolean {
    if (!ts) return false;
    const start = startOfWeek(Date.now(), weekStartDay);
    const end = endOfWeek(Date.now(), weekStartDay);
    return ts >= start && ts <= end;
}

export function isThisMonthTs(ts: number, useJalali: boolean): boolean {
    if (!ts) return false;
    const start = useJalali ? startOfJalaliMonth(Date.now()) : startOfGregorianMonth(Date.now());
    const end = useJalali ? endOfJalaliMonth(Date.now()) : endOfGregorianMonth(Date.now());
    return ts >= start && ts <= end;
}

export function isThisYearTs(ts: number, useJalali: boolean): boolean {
    if (!ts) return false;
    const start = useJalali ? startOfJalaliYear(Date.now()) : startOfGregorianYear(Date.now());
    const end = useJalali ? endOfJalaliYear(Date.now()) : endOfGregorianYear(Date.now());
    return ts >= start && ts <= end;
}

/* ─── شروع ماه/سال قبل (برای آمار) ─── */
export function getJalaliYearStart(ts: number): number {
    return startOfJalaliYear(ts);
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
    return startOfGregorianYear(ts);
}

export function getGregorianPrevMonthStart(ts: number): number {
    const d = new Date(ts);
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}
