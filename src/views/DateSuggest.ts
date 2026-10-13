/* ════════════════════════════════════════════════════════════
   📅 Date Suggest — پیشرفته و داینامیک
   ✅ پیشنهاد بر اساس هر بخشی که کاربر تایپ می‌کنه
   ✅ پشتیبانی از سال/ماه/روز جزئی
   ✅ اعداد فارسی/انگلیسی داینامیک
   ✅ اسم روز هفته زیر هر تاریخ
   ════════════════════════════════════════════════════════════ */

import { AbstractInputSuggest, App } from 'obsidian';
import type FirstTaskPlugin from '../main';
import { normalizeNumbers, toPersianDigits } from '../utils/numberUtils';
import {
    getJalaliDateShort,
    getGregorianDateShort,
    getJalaliMonthDays,
    getJalaliMonthName,
    getWeekdayName,
    toJalali,
    toGregorian,
    isValidJalaliYear,
    isValidGregorianYear,
} from '../utils/jalaliDate';

/* ─── تعداد پیشنهادات ۷ روز آینده ─── */
const NEXT_DAYS_COUNT = 7;

/* ─── حداکثر تعداد پیشنهاد ─── */
const MAX_SUGGESTIONS = 15;

export class DateSuggest extends AbstractInputSuggest<string> {
    private plugin: FirstTaskPlugin;
    private selectCallback: (date: string) => void;

    constructor(
        app: App,
        inputEl: HTMLInputElement,
        plugin: FirstTaskPlugin,
        selectCallback: (date: string) => void
    ) {
        super(app, inputEl);
        this.plugin = plugin;
        this.selectCallback = selectCallback;
    }

    /* ═══════════════════════════════════════════════════════
       🎯 منطق پیشنهاد
       ═══════════════════════════════════════════════════════ */
    getSuggestions(query: string): string[] {
        const useJalali = this.plugin.settings.useJalaliDate;
        const cleanQuery = normalizeNumbers(query || '').trim();

        /* ─── حالت ۱: خالی → ۷ روز آینده ─── */
        if (!cleanQuery) {
            return this.getNext7Days(useJalali);
        }

        /* ─── تقسیم ورودی ─── */
        const parts = cleanQuery.split(/[\/\-]/);

        /* ─── حالت ۲: فقط بخشی از سال تایپ شده ─── */
        if (parts.length === 1) {
            return this.handleYearOnly(parts[0], useJalali);
        }

        /* ─── سال + جداکننده ─── */
        const yearStr = parts[0];
        if (yearStr.length !== 4) {
            return this.getNext7Days(useJalali);
        }
        const year = parseInt(yearStr);
        if (isNaN(year)) return [];

        /* ─── حالت ۳: سال + / (ماه خالی) → پیشنهاد ماه‌ها ─── */
        if (parts.length === 2 && parts[1] === '') {
            return this.getSmartMonths(year, useJalali);
        }

        /* ─── بخشی از ماه تایپ شده ─── */
        const monthStr = parts[1] || '';
        if (monthStr.length < 2) {
            return this.handleMonthOnly(year, monthStr, useJalali);
        }

        const month = parseInt(monthStr);
        if (isNaN(month) || month < 1 || month > 12) return [];

        /* ─── حالت ۴: سال + ماه (روز خالی) → تاریخ‌های هوشمند ماه ─── */
        if (parts.length === 2) {
            return this.getSmartDatesOfMonth(year, month, useJalali);
        }

        /* ─── سال + ماه + / (روز خالی) ─── */
        const dayStr = parts[2] || '';
        if (dayStr === '') {
            return this.getSmartDatesOfMonth(year, month, useJalali);
        }

        /* ─── حالت ۵: روز تایپ شده ─── */
        return this.handleDay(year, month, dayStr, useJalali);
    }

    /* ═══════════════════════════════════════════════════════
       🌟 ۷ روز آینده
       ═══════════════════════════════════════════════════════ */
    private getNext7Days(useJalali: boolean): string[] {
        const dates: string[] = [];
        const today = new Date();
        for (let i = 0; i < NEXT_DAYS_COUNT; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() + i);
            dates.push(useJalali ? getJalaliDateShort(d) : getGregorianDateShort(d));
        }
        return dates;
    }

    /* ═══════════════════════════════════════════════════════
       🗓️ فقط سال تایپ شده
       ═══════════════════════════════════════════════════════ */
    private handleYearOnly(yearStr: string, useJalali: boolean): string[] {
        /* اگه سال کامل نیست → ۷ روز آینده */
        if (yearStr.length < 4) {
            return this.getNext7Days(useJalali);
        }

        const year = parseInt(yearStr);
        if (isNaN(year)) return [];

        /* اگه سال معتبر → ماه‌های اون سال */
        return this.getSmartMonths(year, useJalali);
    }

    /* ═══════════════════════════════════════════════════════
       🗓️ پیشنهاد ماه‌ها
       ═══════════════════════════════════════════════════════ */
    private getSmartMonths(year: number, useJalali: boolean): string[] {
        const pad = (n: number) => n < 10 ? `0${n}` : `${n}`;
        const sep = useJalali ? '/' : '-';

        /* اعتبارسنجی سال */
        if (useJalali && !isValidJalaliYear(year)) return [];
        if (!useJalali && !isValidGregorianYear(year)) return [];

        const months: string[] = [];
        for (let m = 1; m <= 12; m++) {
            months.push(`${year}${sep}${pad(m)}`);
        }
        return months;
    }

    /* ═══════════════════════════════════════════════════════
       🗓️ ماه جزئی (1 رقمی)
       ═══════════════════════════════════════════════════════ */
    private handleMonthOnly(year: number, monthStr: string, useJalali: boolean): string[] {
        const pad = (n: number) => n < 10 ? `0${n}` : `${n}`;
        const sep = useJalali ? '/' : '-';

        /* اعتبارسنجی سال */
        if (useJalali && !isValidJalaliYear(year)) return [];
        if (!useJalali && !isValidGregorianYear(year)) return [];

        /* ─── ماه خالی → همه ماه‌ها ─── */
        if (monthStr === '') {
            return this.getSmartMonths(year, useJalali);
        }

        /* ─── prefix ─── */
        const prefix = monthStr;
        const monthNum = parseInt(prefix);
        if (isNaN(monthNum)) return [];

        const results: string[] = [];

        /* ─── اگه عدد 0 → 01 تا 09 ─── */
        if (monthNum === 0) {
            for (let m = 1; m <= 9; m++) {
                results.push(`${year}${sep}${pad(m)}`);
            }
            return results;
        }

        /* ─── اگه ماه دقیق معتبر → اول ─── */
        if (monthNum >= 1 && monthNum <= 12) {
            results.push(`${year}${sep}${pad(monthNum)}`);
        }

        /* ─── ماه‌هایی که با این رقم شروع می‌شن (2 رقمی) ─── */
        for (let m = monthNum * 10; m <= monthNum * 10 + 9 && m <= 12; m++) {
            const str = `${year}${sep}${pad(m)}`;
            if (!results.includes(str)) results.push(str);
        }

        return results;
    }

    /* ═══════════════════════════════════════════════════════
       📅 تاریخ‌های هوشمند یه ماه
       ═══════════════════════════════════════════════════════ */
    private getSmartDatesOfMonth(year: number, month: number, useJalali: boolean): string[] {
        const pad = (n: number) => n < 10 ? `0${n}` : `${n}`;
        const sep = useJalali ? '/' : '-';

        /* ─── اعتبارسنجی ─── */
        if (useJalali && !isValidJalaliYear(year)) return [];
        if (!useJalali && !isValidGregorianYear(year)) return [];
        if (month < 1 || month > 12) return [];

        /* ─── حداکثر روز ماه ─── */
        let maxDay: number;
        if (useJalali) {
            maxDay = getJalaliMonthDays(year, month);
        } else {
            maxDay = new Date(year, month, 0).getDate();
        }

        /* ─── بررسی اینکه این ماه، ماه جاریه؟ ─── */
        const now = new Date();
        let isCurrentMonth = false;
        let todayDay = 1;

        if (useJalali) {
            const [jy, jm, jd] = toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
            isCurrentMonth = (jy === year && jm === month);
            todayDay = jd;
        } else {
            isCurrentMonth = (now.getFullYear() === year && now.getMonth() + 1 === month);
            todayDay = now.getDate();
        }

        const results: string[] = [];

        /* ─── اگه ماه جاری → از امروز به بعد (7 روز) ─── */
        if (isCurrentMonth) {
            const limit = Math.min(maxDay, todayDay + NEXT_DAYS_COUNT - 1);
            for (let d = todayDay; d <= limit; d++) {
                results.push(`${year}${sep}${pad(month)}${sep}${pad(d)}`);
            }
            return results;
        }

        /* ─── وگرنه → تاریخ‌های کلیدی ─── */
        const keyDays = [1, 5, 10, 15, 20, 25];
        for (const d of keyDays) {
            if (d <= maxDay) {
                results.push(`${year}${sep}${pad(month)}${sep}${pad(d)}`);
            }
        }
        if (!keyDays.includes(maxDay)) {
            results.push(`${year}${sep}${pad(month)}${sep}${pad(maxDay)}`);
        }

        return results;
    }

    /* ═══════════════════════════════════════════════════════
       📅 روز تایپ شده
       ═══════════════════════════════════════════════════════ */
    private handleDay(year: number, month: number, dayStr: string, useJalali: boolean): string[] {
        const pad = (n: number) => n < 10 ? `0${n}` : `${n}`;
        const sep = useJalali ? '/' : '-';

        /* ─── اعتبارسنجی سال ─── */
        if (useJalali && !isValidJalaliYear(year)) return [];
        if (!useJalali && !isValidGregorianYear(year)) return [];
        if (month < 1 || month > 12) return [];

        /* ─── حداکثر روز ماه ─── */
        let maxDay: number;
        if (useJalali) {
            maxDay = getJalaliMonthDays(year, month);
        } else {
            maxDay = new Date(year, month, 0).getDate();
        }

        const results: string[] = [];

        /* ─── حالت ۱: روز تک‌رقمی ─── */
        if (dayStr.length === 1) {
            const dayNum = parseInt(dayStr);
            if (isNaN(dayNum)) return [];

            /* ─── صفر → 01 تا 09 ─── */
            if (dayNum === 0) {
                for (let d = 1; d <= 9 && d <= maxDay; d++) {
                    results.push(`${year}${sep}${pad(month)}${sep}${pad(d)}`);
                }
                return results;
            }

            /* ─── عدد دقیق → اول ─── */
            if (dayNum <= maxDay) {
                results.push(`${year}${sep}${pad(month)}${sep}${pad(dayNum)}`);
            }

            /* ─── روزهایی که با این رقم شروع می‌شن (2 رقمی) ─── */
            for (let d = dayNum * 10; d <= dayNum * 10 + 9 && d <= maxDay; d++) {
                const str = `${year}${sep}${pad(month)}${sep}${pad(d)}`;
                if (!results.includes(str)) results.push(str);
            }

            return results;
        }

        /* ─── حالت ۲: روز کامل (2 رقمی) ─── */
        if (dayStr.length === 2) {
            const dayNum = parseInt(dayStr);
            if (isNaN(dayNum) || dayNum < 1 || dayNum > maxDay) return [];

            /* ─── از این روز به بعد (تا حداکثر ۱۰ روز) ─── */
            const limit = Math.min(maxDay, dayNum + 9);
            for (let d = dayNum; d <= limit; d++) {
                results.push(`${year}${sep}${pad(month)}${sep}${pad(d)}`);
            }
            return results;
        }

        return [];
    }

    /* ═══════════════════════════════════════════════════════
       🎨 رندر گزینه
       ═══════════════════════════════════════════════════════ */
    renderSuggestion(dateStr: string, el: HTMLElement): void {
        const lang = this.plugin.settings.language;
        const useJalali = this.plugin.settings.useJalaliDate;

        const display = lang === 'fa' ? toPersianDigits(dateStr) : dateStr;

        const container = el.createDiv({ cls: 'first-task-suggest-item' });

        /* ─── خط اول: تاریخ ─── */
        const nameRow = container.createDiv({ cls: 'first-task-suggest-name' });
        nameRow.createSpan({ text: display });

        /* ─── خط دوم: روز هفته + اسم ماه ─── */
        const info = this.getDateInfo(dateStr, useJalali, lang);
        if (info) {
            container.createDiv({
                cls: 'first-task-suggest-path',
                text: info,
            });
        }
    }

    /* ─── اطلاعات اضافی: روز هفته + ماه ─── */
    private getDateInfo(dateStr: string, useJalali: boolean, lang: 'en' | 'fa'): string {
        try {
            let date: Date;

            if (useJalali) {
                const [jy, jm, jd] = dateStr.split('/').map(Number);
                const [gy, gm, gd] = toGregorian(jy, jm, jd);
                date = new Date(gy, gm - 1, gd);

                const weekday = getWeekdayName(date, lang);
                const monthName = getJalaliMonthName(jm, lang);
                return `${weekday} · ${monthName}`;
            } else {
                const [gy, gm, gd] = dateStr.split('-').map(Number);
                date = new Date(gy, gm - 1, gd);
                return getWeekdayName(date, lang);
            }
        } catch {
            return '';
        }
    }

    /* ═══════════════════════════════════════════════════════
       ✅ انتخاب گزینه
       ═══════════════════════════════════════════════════════ */
    selectSuggestion(dateStr: string): void {
        this.selectCallback(dateStr);
        this.close();
    }
}
