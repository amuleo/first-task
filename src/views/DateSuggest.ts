/* ════════════════════════════════════════════════════════════
   📅 Suggest هوشمند تاریخ
   ✅ پیشنهاد ۷ روز آینده
   ✅ با تغییر ماه → تاریخ‌های کلیدی همون ماه
   ✅ سازگار با شمسی و میلادی
   ════════════════════════════════════════════════════════════ */

import { AbstractInputSuggest, App } from 'obsidian';
import type FirstTaskPlugin from '../main';
import { normalizeNumbers, toPersianDigits } from '../utils/numberUtils';
import {
    getJalaliDateShort,
    getGregorianDateShort,
    getJalaliMonthDays,
} from '../utils/jalaliDate';

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

    getSuggestions(query: string): string[] {
        const useJalali = this.plugin.settings.useJalaliDate;
        const cleanQuery = normalizeNumbers(query || '').trim();

        /* ─── حالت ۱: کاربر داره یه ماه خاص رو تایپ می‌کنه
           مثال: "1405/08" یا "1405/08/" یا "2026-11" ─── */
        const monthPattern = useJalali
            ? /^(\d{4})[\/\-](\d{1,2})[\/\-]?$/
            : /^(\d{4})[\/\-](\d{1,2})[\/\-]?$/;
        const monthMatch = cleanQuery.match(monthPattern);

        if (monthMatch) {
            const year = parseInt(monthMatch[1]);
            const month = parseInt(monthMatch[2]);
            if (month >= 1 && month <= 12) {
                return this.getSmartDatesOfMonth(year, month, useJalali);
            }
        }

        /* ─── حالت ۲: خالی یا تایپ کوتاه → ۷ روز آینده ─── */
        if (!cleanQuery || cleanQuery.length < 2) {
            return this.getNext7Days(useJalali);
        }

        /* ─── حالت ۳: فیلتر بر اساس ورودی کاربر ─── */
        const allDates = this.getNext7Days(useJalali);
        const filtered = allDates.filter(d => normalizeNumbers(d).startsWith(cleanQuery));
        return filtered.slice(0, 10);
    }

    /* ─── ۷ روز آینده ─── */
    private getNext7Days(useJalali: boolean): string[] {
        const dates: string[] = [];
        const today = new Date();
        for (let i = 0; i < 7; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() + i);
            dates.push(useJalali ? getJalaliDateShort(d) : getGregorianDateShort(d));
        }
        return dates;
    }

    /* ─── تاریخ‌های هوشمند یه ماه خاص ─── */
    private getSmartDatesOfMonth(year: number, month: number, useJalali: boolean): string[] {
        let maxDay: number;

        if (useJalali) {
            if (year < 1300 || year > 1500) return [];
            maxDay = getJalaliMonthDays(year, month);
        } else {
            if (year < 1900 || year > 2200) return [];
            maxDay = new Date(year, month, 0).getDate();
        }

        /* روزهای کلیدی */
        const smartDays = [1, 5, 10, 15, 20, 25, 30].filter(d => d <= maxDay);
        if (!smartDays.includes(maxDay)) smartDays.push(maxDay);

        /* حذف تکراری */
        const uniqueDays = Array.from(new Set(smartDays)).sort((a, b) => a - b);

        const pad = (n: number) => n < 10 ? `0${n}` : `${n}`;
        const padMonth = pad(month);

        return uniqueDays.map(d => {
            if (useJalali) return `${year}/${padMonth}/${pad(d)}`;
            return `${year}-${padMonth}-${pad(d)}`;
        });
    }

    /* ─── رندر هر گزینه ─── */
    renderSuggestion(dateStr: string, el: HTMLElement): void {
        const lang = this.plugin.settings.language;
        const display = lang === 'fa' ? toPersianDigits(dateStr) : dateStr;

        const container = el.createDiv({ cls: 'first-task-suggest-item' });
        container.createDiv({ cls: 'first-task-suggest-name', text: display });

        /* ─── اسم روز هفته ─── */
        const weekdayName = this.getWeekdayName(dateStr);
        if (weekdayName) {
            container.createDiv({ cls: 'first-task-suggest-path', text: weekdayName });
        }
    }

    /* ─── اسم روز هفته ─── */
    private getWeekdayName(dateStr: string): string {
        const useJalali = this.plugin.settings.useJalaliDate;
        const lang = this.plugin.settings.language;

        let date: Date | null = null;
        try {
            if (useJalali) {
                const [jy, jm, jd] = dateStr.split('/').map(Number);
                /* تبدیل به میلادی */
                const { toGregorian } = require('../utils/jalaliDate');
                const [gy, gm, gd] = toGregorian(jy, jm, jd);
                date = new Date(gy, gm - 1, gd);
            } else {
                const [gy, gm, gd] = dateStr.split('-').map(Number);
                date = new Date(gy, gm - 1, gd);
            }
        } catch {
            return '';
        }

        if (!date) return '';
        const dayIndex = date.getDay();
        const names: Record<string, string[]> = {
            fa: ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'],
            en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        };
        return names[lang][dayIndex];
    }

    selectSuggestion(dateStr: string): void {
        this.selectCallback(dateStr);
        this.close();
    }
}
