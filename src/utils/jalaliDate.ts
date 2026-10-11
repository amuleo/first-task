/* ════════════════════════════════════════════════════════════
   📅 تبدیل تاریخ + محاسبات (DST-safe) + تبدیل ISO
   ════════════════════════════════════════════════════════════ */

/* ───── تبدیل میلادی → شمسی ───── */
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
        80 +
        gd +
        gDM[gm - 1];
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
    let days =
        -355668 +
        365 * jy +
        Math.floor(jy / 33) * 8 +
        Math.floor(((jy % 33) + 3) / 4) +
        jd +
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

/* ───── پد کردن عدد ───── */
function pad(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
}

/* ═══════════════════════════════════════════════════════════
   🔄 تبدیل ISO ↔ Jalali (برای ذخیره و نمایش)
   ═══════════════════════════════════════════════════════════ */

/* ISO میلادی → شمسی: "2026-10-15" → "1405/07/25" */
export function isoToJalali(iso: string): string {
    if (!iso || !iso.includes('-')) return '';
    const parts = iso.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return '';
    const [gy, gm, gd] = parts;
    const [jy, jm, jd] = toJalali(gy, gm, gd);
    return `${jy}/${pad(jm)}/${pad(jd)}`;
}

/* شمسی → ISO میلادی: "1405/07/25" → "2026-10-15" */
export function jalaliToIso(jalali: string): string {
    if (!jalali || !jalali.includes('/')) return '';
    const parts = jalali.split('/').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return '';
    const [jy, jm, jd] = parts;
    const [gy, gm, gd] = toGregorian(jy, jm, jd);
    return `${gy}-${pad(gm)}-${pad(gd)}`;
}

/* ═══════════════════════════════════════════════════════════
   🎨 نمایش تاریخ بر اساس زبان
   ═══════════════════════════════════════════════════════════ */

/* نمایش ISO بر اساس زبان کاربر */
export function formatIso(iso: string, useJalali: boolean): string {
    if (!iso) return '';
    return useJalali ? isoToJalali(iso) : iso;
}

/* گرفتن ISO از ورودی کاربر (بر اساس زبان) */
export function parseIsoInput(input: string, useJalali: boolean): string {
    const trimmed = (input || '').trim();
    if (!trimmed) return '';
    if (useJalali) {
        return jalaliToIso(trimmed);
    }
    return trimmed;
}

/* اعتبارسنجی ورودی تاریخ */
export function isValidDateInput(input: string, useJalali: boolean): boolean {
    const trimmed = (input || '').trim();
    if (!trimmed) return true;  /* خالی مجازه */
    if (useJalali) {
        return /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(trimmed);
    }
    return /^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed);
}

/* ═══════════════════════════════════════════════════════════
   ⏱️ محاسبات بازه‌های زمانی (DST-safe)
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

/* شروع سال شمسی فعلی (اول فروردین) */
export function getJalaliYearStart(ts: number): number {
    const d = new Date(ts);
    const [jy] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const [gy, gm, gd] = toGregorian(jy, 1, 1);
    return new Date(gy, gm - 1, gd, 0, 0, 0, 0).getTime();
}

/* شروع ماه شمسی قبلی */
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

/* شروع سال میلادی */
export function getGregorianYearStart(ts: number): number {
    const d = new Date(ts);
    d.setMonth(0, 1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

/* شروع ماه میلادی قبلی */
export function getGregorianPrevMonthStart(ts: number): number {
    const d = new Date(ts);
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

/* ═══════════════════════════════════════════════════════════
   🎯 محاسبات برای دسته‌بندی‌های داینامیک
   ═══════════════════════════════════════════════════════════ */

/* آیا ISO داده‌شده، امروز هست؟ */
export function isToday(iso: string): boolean {
    if (!iso) return false;
    const [y, m, d] = iso.split('-').map(Number);
    const now = new Date();
    return y === now.getFullYear() && m === now.getMonth() + 1 && d === now.getDate();
}

/* آیا فردا؟ */
export function isTomorrow(iso: string): boolean {
    if (!iso) return false;
    const [y, m, d] = iso.split('-').map(Number);
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return y === t.getFullYear() && m === t.getMonth() + 1 && d === t.getDate();
}

/* آیا تا ۷ روز آینده؟ */
export function isWithinNextWeek(iso: string): boolean {
    if (!iso) return false;
    const [y, m, d] = iso.split('-').map(Number);
    const target = new Date(y, m - 1, d).getTime();
    const now = Date.now();
    const weekLater = startOfDaysAgo(now, -6);  /* ۶ روز بعد */
    return target >= startOfDay(now) && target < weekLater;
}

/* آیا توی ماه جاری؟ */
export function isThisMonth(iso: string): boolean {
    if (!iso) return false;
    const [y, m] = iso.split('-').map(Number);
    const now = new Date();
    return y === now.getFullYear() && m === now.getMonth() + 1;
}

/* آیا توی سال جاری؟ */
export function isThisYear(iso: string): boolean {
    if (!iso) return false;
    const [y] = iso.split('-').map(Number);
    return y === new Date().getFullYear();
}

/* آیا گذشته؟ */
export function isOverdue(iso: string): boolean {
    if (!iso) return false;
    const [y, m, d] = iso.split('-').map(Number);
    const target = new Date(y, m - 1, d).getTime();
    return target < startOfDay(Date.now());
}
