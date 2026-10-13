/* ════════════════════════════════════════════════════════════
   📦 تایپ‌های First Task v0.1.3
   ✅ _title و _source_file برای بازیابی خودکار متادیتا
   ════════════════════════════════════════════════════════════ */

export interface ExtractedTask {
    title: string;
    completed: boolean;
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
    _id: string;
    _source_file: string;
    _source_line: number;
    _occurrence: number;
}

export interface TaskIndexEntry {
    _title: string;
    _source_file: string;
    _last_seen_ts?: number;
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
    _title: '',
    _source_file: '',
    _last_seen_ts: 0,
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

export interface CompletedStats {
    today: number;
    yesterday: number;
    this_week: number;
    last_month: number;
    this_year: number;
    total: number;
}

export interface CategoryStats {
    past: number;
    today: number;
    tomorrow: number;
    this_week: number;
    next_week: number;
    this_month: number;
    next_month: number;
    this_year: number;
    next_year: number;
    no_date: number;
    all: number;
}

export interface DynamicCategorySettings {
    tomorrow: boolean;
    this_week: boolean;
    this_month: boolean;
    this_year: boolean;
}

export type Language = 'en' | 'fa';
export type TabType = 'pending' | 'completed';

export type PlannerCard =
    | 'past'
    | 'today'
    | 'tomorrow'
    | 'this_week'
    | 'next_week'
    | 'this_month'
    | 'next_month'
    | 'this_year'
    | 'next_year'
    | 'no_date'
    | 'all';

export type WeekStartDay = 0 | 1 | 6;

export interface PlannerCardsVisibility {
    past: boolean;
    today: boolean;
    tomorrow: boolean;
    this_week: boolean;
    next_week: boolean;
    this_month: boolean;
    next_month: boolean;
    this_year: boolean;
    next_year: boolean;
}

export interface BulkUpdates {
    applyCompleted: boolean;
    completed: boolean;
    applyCategory: boolean;
    category: string;
    applyDate: boolean;
    dueDateJalali: string;
    dueDateGregorian: string;
    dueDateTs: number;
    applyPin: boolean;
    pinned: boolean;
    applyNote: boolean;
    targetFile: string;
}

export interface FirstTaskSettings {
    language: Language;
    useJalaliDate: boolean;
    tasksPerPage: number;
    weekStartDay: WeekStartDay;
    includeFolders: string[];
    excludeFolders: string[];
    onlyMarkdown: boolean;
    enableCategories: boolean;
    showTaskBadges: boolean;
    autoFillCreatedTime: boolean;
    dynamicCategories: DynamicCategorySettings;
    plannerCards: PlannerCardsVisibility;
    currentTab: TabType;
    panelCategory: string;
    plannerCategory: string;
    plannerCard: PlannerCard;
}

export const DEFAULT_SETTINGS: FirstTaskSettings = {
    language: 'en',
    useJalaliDate: false,
    tasksPerPage: 20,
    weekStartDay: 6,
    includeFolders: [],
    excludeFolders: ['.obsidian', 'FirstTask', '.trash'],
    onlyMarkdown: true,
    enableCategories: true,
    showTaskBadges: false,
    autoFillCreatedTime: true,
    dynamicCategories: {
        tomorrow: true,
        this_week: true,
        this_month: true,
        this_year: true,
    },
    plannerCards: {
        past: true,
        today: true,
        tomorrow: true,
        this_week: true,
        next_week: true,
        this_month: true,
        next_month: true,
        this_year: true,
        next_year: true,
    },
    currentTab: 'pending',
    panelCategory: '',
    plannerCategory: '',
    plannerCard: 'all',
};
