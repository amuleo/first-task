/* ════════════════════════════════════════════════════════════
   📅 ابزارهای تاریخ — شمسی + میلادی (v0.3.0)
   ✅ تبدیل شمسی ↔ میلادی
   ✅ محاسبات روز/هفته/ماه/سال
   ✅ ۳ کارت جدید (next_week, next_month, next_year)
   ✅ 🆕 pad حالا export شده
   ════════════════════════════════════════════════════════════ */

import { normalizeNumbers } from './numberUtils';
import type { WeekStartDay } from '../types';

/* ═══════════════════════════════════════════════════════════
   توابع پایه
   ═══════════════════════════════════════════════════════════ */

function div(a: number, b: number): number {
    return Math.trunc(a / b);
}

function mod(a: number, b: number): number {
    return a - Math.trunc(a / b) * b;
}

/* ─── محاسبه‌ی سال کبیسه‌ی شمسی ─── */
function jalCal(jy: number): { leap: number; gy: number; march: number } {
    const bl = BREAKS.length;
    const gy = jy + 621;
    let leapJ = -14;
    let jp = BREAKS[0];
    let jm = 0;
    let jump = 0;

    if (jy < jp || jy >= BREAKS[bl - 1]) {
        return { leap: -1, gy, march: 20 };
    }

    for (let i = 1; i < bl; i++) {
        jm = BREAKS[i];
        jump = jm - jp;
        if (jy < jm) break;
        leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
        jp = jm;
    }

    let n = jy - jp;
    leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);

    if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

    const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
    const march = 20 + leapJ - leapG;

    if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;

    let leap = mod(mod(n + 1, 33) - 1, 4);
    if (leap === -1) leap = 4;

    return { leap, gy, march };
}

export function isJalaliLeapYear(jy: number): boolean {
    return jalCal(jy).leap === 0;
}

export function getJalaliMonthDays(jy: number, jm: number): number {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    return isJalaliLeapYear(jy) ? 30 : 29;
}

export function isValidJalaliYear(jy: number): boolean {
    return jy >= 1300 && jy <= 1500;
}

export function isValidGregorianYear(gy: number): boolean {
    return gy >= 1900 && gy <= 2200;
}

/* ═══════════════════════════════════════════════════════════
   تبدیل شمسی ↔ میلادی
   ═══════════════════════════════════════════════════════════ */

export function toJalali(gy: number, gm: number, gd: number): [number, number, number] {
    const gDM = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

    let jy = gy <= 1600 ? 0 : 979;
    gy -= gy <= 1600 ? 621 : 1600;

    const gy2 = gm > 2 ? gy + 1 : gy;

    let days = (
        365 * gy +
        Math.floor((gy2 + 3) / 4) -
        Math.floor((gy2 + 99) / 100) +
        Math.floor((gy2 + 399) / 400) -
        80 +
        gd +
        gDM[gm - 1]
    );

    jy += 33 * Math.floor(days / 12053);
    days %= 12053;

    jy += 4 * Math.floor(days / 1461);
    days %= 1461;

    if (days > 365) {
        jy += Math.floor((days - 1) / 365);
        days = (days - 1) % 365;
    }

    const jm = days < 186
        ? 1 + Math.floor(days / 31)
        : 7 + Math.floor((days - 186) / 30);

    const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);

    return [jy, jm, jd];
}

export function toGregorian(jy: number, jm: number, jd: number): [number, number, number] {
    jy += 1595;

    let days = (
        -355668 +
        365 * jy +
        Math.floor(jy / 33) * 8 +
        Math.floor((jy % 33 + 3) / 4) +
        jd +
        (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186)
    );

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

    let gm;
    for (gm = 1; gm <= 12; gm++) {
        if (gd <= sal_a[gm]) break;
        gd -= sal_a[gm];
    }

    return [gy, gm, gd];
}

/* ═══════════════════════════════════════════════════════════
   🆕 pad — حالا export شده
   ═══════════════════════════════════════════════════════════ */
export function pad(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
}

/* ═══════════════════════════════════════════════════════════
   فرمت‌های نمایشی
   ═══════════════════════════════════════════════════════════ */

export function getJalaliDateShort(date: Date): string {
    const [jy, jm, jd] = toJalali(
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate()
    );
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

export function getJalaliMonthName(jm: number, lang: 'en' | 'fa'): string {
    if (jm < 1 || jm > 12) return '';
    return lang === 'fa' ? JALALI_MONTHS_FA[jm - 1] : JALALI_MONTHS_EN[jm - 1];
}

export function getWeekdayName(date: Date, lang: 'en' | 'fa'): string {
    return lang === 'fa'
        ? WEEKDAYS_FA[date.getDay()]
        : WEEKDAYS_EN[date.getDay()];
}

/* ═══════════════════════════════════════════════════════════
   Parse تاریخ
   ═══════════════════════════════════════════════════════════ */

export interface ParsedDate {
    jalali: string;
    gregorian: string;
    ts: number;
}

export function parseDateInput(
    input: string,
    useJalali: boolean
): ParsedDate | null {
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

        if (!isValidJalaliYear(jy)) return null;
        if (jm < 1 || jm > 12) return null;

        const maxDay = getJalaliMonthDays(jy, jm);
        if (jd < 1 || jd > maxDay) return null;
    } else {
        const match = normalized.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
        if (!match) return null;

        const gy2 = parseInt(match[1]);
        const gm2 = parseInt(match[2]);
        const gd2 = parseInt(match[3]);

        if (!isValidGregorianYear(gy2)) return null;
        if (gm2 < 1 || gm2 > 12) return null;
        if (gd2 < 1 || gd2 > 31) return null;

        const test = new Date(gy2, gm2 - 1, gd2);
        if (
            test.getFullYear() !== gy2 ||
            test.getMonth() !== gm2 - 1 ||
            test.getDate() !== gd2
        ) {
            return null;
        }

        const [jy2, jm2, jd2] = toJalali(gy2, gm2, gd2);
        jy = jy2;
        jm = jm2;
        jd = jd2;
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
   محاسبات روز/هفته/ماه/سال
   ═══════════════════════════════════════════════════════════ */

export function startOfDay(ts: number): number {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
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

export function startOfWeek(ts: number, weekStartDay: WeekStartDay): number {
    const d = new Date(ts);
    const currentDay = d.getDay();
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

export function startOfJalaliYear(ts: number): number {
    const d = new Date(ts);
    const [jy] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const [gy, gm, gd] = toGregorian(jy, 1, 1);
    return new Date(gy, gm - 1, gd, 0, 0, 0, 0).getTime();
}

export function endOfJalaliYear(ts: number): number {
    const d = new Date(ts);
    const [jy] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const lastDay = getJalaliMonthDays(jy, 12);
    const [gy, gm, gd] = toGregorian(jy, 12, lastDay);
    return new Date(gy, gm - 1, gd, 23, 59, 59, 999).getTime();
}

/* ═══════════════════════════════════════════════════════════
   is* — چک‌کننده‌ها
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
    const start = useJalali
        ? startOfJalaliMonth(Date.now())
        : startOfGregorianMonth(Date.now());
    const end = useJalali
        ? endOfJalaliMonth(Date.now())
        : endOfGregorianMonth(Date.now());
    return ts >= start && ts <= end;
}

export function isThisYearTs(ts: number, useJalali: boolean): boolean {
    if (!ts) return false;
    const start = useJalali
        ? startOfJalaliYear(Date.now())
        : startOfGregorianYear(Date.now());
    const end = useJalali
        ? endOfJalaliYear(Date.now())
        : endOfGregorianYear(Date.now());
    return ts >= start && ts <= end;
}

/* ═══════════════════════════════════════════════════════════
   🆕 هفته / ماه / سال آینده
   ═══════════════════════════════════════════════════════════ */

export function startOfNextWeek(ts: number, weekStartDay: WeekStartDay): number {
    const thisWeekStart = startOfWeek(ts, weekStartDay);
    const d = new Date(thisWeekStart);
    d.setDate(d.getDate() + 7);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

export function endOfNextWeek(ts: number, weekStartDay: WeekStartDay): number {
    const start = startOfNextWeek(ts, weekStartDay);
    const d = new Date(start);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d.getTime();
}

export function isNextWeekTs(ts: number, weekStartDay: WeekStartDay): boolean {
    if (!ts) return false;
    const start = startOfNextWeek(Date.now(), weekStartDay);
    const end = endOfNextWeek(Date.now(), weekStartDay);
    return ts >= start && ts <= end;
}

export function startOfNextJalaliMonth(ts: number): number {
    const d = new Date(ts);
    let [jy, jm] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    jm += 1;
    if (jm > 12) {
        jm = 1;
        jy += 1;
    }
    const [gy, gm, gd] = toGregorian(jy, jm, 1);
    return new Date(gy, gm - 1, gd, 0, 0, 0, 0).getTime();
}

export function endOfNextJalaliMonth(ts: number): number {
    const d = new Date(ts);
    let [jy, jm] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    jm += 1;
    if (jm > 12) {
        jm = 1;
        jy += 1;
    }
    const daysInMonth = getJalaliMonthDays(jy, jm);
    const [gy, gm, gd] = toGregorian(jy, jm, daysInMonth);
    return new Date(gy, gm - 1, gd, 23, 59, 59, 999).getTime();
}

export function startOfNextGregorianMonth(ts: number): number {
    const d = new Date(ts);
    d.setDate(1);
    d.setMonth(d.getMonth() + 1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

export function endOfNextGregorianMonth(ts: number): number {
    const d = new Date(ts);
    d.setDate(1);
    d.setMonth(d.getMonth() + 2, 0);
    d.setHours(23, 59, 59, 999);
    return d.getTime();
}

export function isNextMonthTs(ts: number, useJalali: boolean): boolean {
    if (!ts) return false;
    const start = useJalali
        ? startOfNextJalaliMonth(Date.now())
        : startOfNextGregorianMonth(Date.now());
    const end = useJalali
        ? endOfNextJalaliMonth(Date.now())
        : endOfNextGregorianMonth(Date.now());
    return ts >= start && ts <= end;
}

export function startOfNextJalaliYear(ts: number): number {
    const d = new Date(ts);
    const [jy] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const [gy, gm, gd] = toGregorian(jy + 1, 1, 1);
    return new Date(gy, gm - 1, gd, 0, 0, 0, 0).getTime();
}

export function endOfNextJalaliYear(ts: number): number {
    const d = new Date(ts);
    const [jy] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const nextYear = jy + 1;
    const lastDay = getJalaliMonthDays(nextYear, 12);
    const [gy, gm, gd] = toGregorian(nextYear, 12, lastDay);
    return new Date(gy, gm - 1, gd, 23, 59, 59, 999).getTime();
}

export function startOfNextGregorianYear(ts: number): number {
    const d = new Date(ts);
    d.setMonth(0, 1);
    d.setFullYear(d.getFullYear() + 1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

export function endOfNextGregorianYear(ts: number): number {
    const d = new Date(ts);
    d.setMonth(11, 31);
    d.setFullYear(d.getFullYear() + 1);
    d.setHours(23, 59, 59, 999);
    return d.getTime();
}

export function isNextYearTs(ts: number, useJalali: boolean): boolean {
    if (!ts) return false;
    const start = useJalali
        ? startOfNextJalaliYear(Date.now())
        : startOfNextGregorianYear(Date.now());
    const end = useJalali
        ? endOfNextJalaliYear(Date.now())
        : endOfNextGregorianYear(Date.now());
    return ts >= start && ts <= end;
}

/* ═══════════════════════════════════════════════════════════
   کمک‌کننده‌های آمار
   ═══════════════════════════════════════════════════════════ */

export function getJalaliYearStart(ts: number): number {
    return startOfJalaliYear(ts);
}

export function getJalaliPrevMonthStart(ts: number): number {
    const d = new Date(ts);
    let [jy, jm] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    jm -= 1;
    if (jm < 1) {
        jm = 12;
        jy -= 1;
    }
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

/* ═══════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════ */

const BREAKS = [
    -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210,
    1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178,
];

const JALALI_MONTHS_FA = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

const JALALI_MONTHS_EN = [
    'Farvardin', 'Ordibehesht', 'Khordad', 'Tir', 'Mordad', 'Shahrivar',
    'Mehr', 'Aban', 'Azar', 'Dey', 'Bahman', 'Esfand',
];

const WEEKDAYS_FA = [
    'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه',
];

const WEEKDAYS_EN = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];
