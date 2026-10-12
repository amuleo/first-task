/* ════════════════════════════════════════════════════════════
   📦 تایپ‌های First Task v0.2.0
   ════════════════════════════════════════════════════════════ */

/* ───── تسک استخراج‌شده ───── */
export interface ExtractedTask {
    /* ─── از markdown ─── */
    title: string;
    completed: boolean;

    /* ─── از ایندکس (همه string، خالی اگه نداشت) ─── */
    description: string;
    category: string;
    pinned: boolean;

    /* ─── تاریخ انجام (دو فرمت) ─── */
    due_date_jalali: string;      // "1405/07/25" یا ""
    due_date_gregorian: string;   // "2026-10-15" یا ""
    due_date_ts: number;          // 0 اگه نداشت

    /* ─── زمان ساخت ─── */
    created_jalali: string;       // "1405/07/18 - 14:30"
    created_gregorian: string;    // "2026-10-10 14:30"
    created_ts: number;

    /* ─── زمان انجام ─── */
    completed_jalali: string;
    completed_gregorian: string;
    completed_ts: number;

    /* ─── متادیتای داخلی ─── */
    _id: string;
    _source_file: string;
    _source_line: number;
}

/* ───── ورودی ایندکس ───── */
export interface TaskIndexEntry {
    description: string;
    category: string;
    pinned: boolean;

    due_date_jalali: string;
    due_date_gregorian: string;
    due_date_ts: number;

    created_jalali: string;
    created_gregorian: string;
    created_ts: number;

    completed_jalali: string;
    completed_gregorian: string;
    completed_ts: number;
}

export const DEFAULT_ENTRY: TaskIndexEntry = {
    description: '',
    category: '',
    pinned: false,
    due_date_jalali: '',
    due_date_gregorian: '',
    due_date_ts: 0,
    created_jalali: '',
    created_gregorian: '',
    created_ts: 0,
    completed_jalali: '',
    completed_gregorian: '',
    completed_ts: 0,
};

/* ───── فایل‌های کش ───── */
export interface TaskIndexFile {
    version: number;
    last_updated: number;
    tasks: Record<string, TaskIndexEntry>;
}

export interface FileCacheEntry {
    mtime: number;
    size: number;
    hash: string;
}

export interface FileCacheFile {
    version: number;
    files: Record<string, FileCacheEntry>;
}

/* ───── دسته‌بندی ───── */
export interface CategoryDef {
    id: string;
    name: string;
    name_fa: string;
}

export interface CategoriesFile {
    version: number;
    categories: CategoryDef[];
}

export const DEFAULT_CATEGORIES: CategoriesFile = {
    version: 1,
    categories: [
        { id: 'work',      name: 'Work',      name_fa: 'کاری' },
        { id: 'study',     name: 'Study',     name_fa: 'درسی' },
        { id: 'daily',     name: 'Daily',     name_fa: 'روزمره' },
        { id: 'personal',  name: 'Personal',  name_fa: 'شخصی' },
        { id: 'shopping',  name: 'Shopping',  name_fa: 'خرید' },
        { id: 'finance',   name: 'Finance',   name_fa: 'مالی' },
        { id: 'health',    name: 'Health',    name_fa: 'سلامتی' },
        { id: 'important', name: 'Important', name_fa: 'مهم' },
        { id: 'other',     name: 'Other',     name_fa: 'سایر' },
    ],
};

/* ───── تنظیمات ───── */
export interface DynamicCategorySettings {
    tomorrow: boolean;
    this_week: boolean;
    this_month: boolean;
    this_year: boolean;
}

export type Language = 'en' | 'fa';
export type TabType = 'pending' | 'completed';

export interface FirstTaskSettings {
    language: Language;
    useJalaliDate: boolean;
    tasksPerPage: number;
    groupByNote: boolean;
    showNoteInModal: boolean;
    includeFolders: string[];
    excludeFolders: string[];
    onlyMarkdown: boolean;
    enableCategories: boolean;
    dynamicCategories: DynamicCategorySettings;
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
