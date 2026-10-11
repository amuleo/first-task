/* ════════════════════════════════════════════════════════════
   📦 تایپ‌های اصلی First Task
   ════════════════════════════════════════════════════════════ */

/* ───── تسک استخراج‌شده از markdown ───── */
export interface ExtractedTask {
    /* ─── از markdown ─── */
    title: string;
    completed: boolean;

    /* ─── از ایندکس (همیشه string، خالی اگه نداشت) ─── */
    description: string;      // "" اگه نداشت
    due_date_iso: string;     // "2026-10-15" اگه داشت، "" اگه نداشت
    category: string;         // "" اگه نداشت
    pinned: boolean;          // false اگه نداشت

    /* ─── متادیتای داخلی ─── */
    _id: string;              // شناسه یکتا
    _source_file: string;     // مسیر فایل مبدأ
    _source_line: number;     // شماره خط
}

/* ───── ورودی ایندکس (توضیحات، تاریخ، دسته، پین) ───── */
export interface TaskIndexEntry {
    description: string;
    due_date_iso: string;
    category: string;
    pinned: boolean;
}

/* ───── فایل index.json ───── */
export interface TaskIndexFile {
    version: number;
    last_updated: number;
    tasks: Record<string, TaskIndexEntry>;
}

/* ───── کش فایل‌ها (mtime + hash برای سرعت) ───── */
export interface FileCacheEntry {
    mtime: number;
    size: number;
    hash: string;
}

export interface FileCacheFile {
    version: number;
    files: Record<string, FileCacheEntry>;
}

/* ───── دسته‌بندی‌های داینامیک زمانی ───── */
export interface DynamicCategorySettings {
    tomorrow: boolean;
    this_week: boolean;
    this_month: boolean;
    this_year: boolean;
}

/* ───── تنظیمات پلاگین ───── */
export type Language = 'en' | 'fa';
export type TabType = 'pending' | 'completed';

export interface FirstTaskSettings {
    /* ─── عمومی ─── */
    language: Language;
    useJalaliDate: boolean;
    tasksPerPage: number;

    /* ─── نمایش ─── */
    groupByNote: boolean;
    showNoteInModal: boolean;

    /* ─── فایل‌ها ─── */
    includeFolders: string[];
    excludeFolders: string[];
    onlyMarkdown: boolean;

    /* ─── دسته‌بندی ─── */
    enableCategories: boolean;
    dynamicCategories: DynamicCategorySettings;

    /* ─── حالت پنل ─── */
    currentTab: TabType;
}

export const DEFAULT_SETTINGS: FirstTaskSettings = {
    language: 'en',
    useJalaliDate: false,
    tasksPerPage: 20,

    groupByNote: false,
    showNoteInModal: true,

    includeFolders: [],
    excludeFolders: ['.obsidian', 'FirstTask', '.trash'],
    onlyMarkdown: true,

    enableCategories: true,
    dynamicCategories: {
        tomorrow: true,
        this_week: true,
        this_month: true,
        this_year: true,
    },

    currentTab: 'pending',
};

/* ───── آمار ───── */
export interface CompletedStats {
    today: number;
    yesterday: number;
    this_week: number;
    last_month: number;
    this_year: number;
    total: number;
}

/* ───── گروه (برای گروه‌بندی اختیاری) ───── */
export interface TaskGroup {
    key: string;
    title: string;
    tasks: ExtractedTask[];
}
