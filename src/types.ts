/* ════════════════════════════════════════════════════════════
   📦 تایپ‌های First Task v0.2.1
   ✅ Desktop + Import + Recurring + Suggestions + Archive
   ✅ 🆕 دسته‌بندی «میز من»
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

/* 🆕 دسته‌ی «میز من» بین سلامتی و مهم */
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
        { id: 'desktop',   name: 'Desktop',   name_fa: 'میز من' },
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

/* ═══════════════════════════════════════════════════════════
   🖥️ Desktop
   ═══════════════════════════════════════════════════════════ */

export interface DesktopTask {
    id: string;
    title: string;
    description: string;
    category: string;
    pinned: boolean;
    completed: boolean;
    due_date_jalali: string;
    due_date_gregorian: string;
    due_date_ts: number;
    created_jalali: string;
    created_gregorian: string;
    created_ts: number;
    completed_jalali: string;
    completed_gregorian: string;
    completed_ts: number;
    modified_ts: number;
    from_recurring?: string;
}

export const DEFAULT_DESKTOP_TASK: DesktopTask = {
    id: '',
    title: '',
    description: '',
    category: '',
    pinned: false,
    completed: false,
    due_date_jalali: '',
    due_date_gregorian: '',
    due_date_ts: 0,
    created_jalali: '',
    created_gregorian: '',
    created_ts: 0,
    completed_jalali: '',
    completed_gregorian: '',
    completed_ts: 0,
    modified_ts: 0,
    from_recurring: undefined,
};

export interface DesktopStoreFile {
    version: number;
    last_updated: number;
    tasks: Record<string, DesktopTask>;
}

export const DEFAULT_DESKTOP_STORE: DesktopStoreFile = {
    version: 1,
    last_updated: 0,
    tasks: {},
};

export interface DesktopSettings {
    enabled: boolean;
    showInTasks: boolean;
    showInPlanner: boolean;
    defaultImportMode: 'copy' | 'move';
    recurringEnabled: boolean;
    suggestionsEnabled: boolean;
    autoArchiveEnabled: boolean;
    autoArchiveCount: number;
    autoArchiveDays: 30 | 60 | 90 | 180 | 365;
    autoArchiveMode: 'threshold' | 'always';
}

export const DEFAULT_DESKTOP_SETTINGS: DesktopSettings = {
    enabled: true,
    showInTasks: false,
    showInPlanner: false,
    defaultImportMode: 'move',
    recurringEnabled: true,
    suggestionsEnabled: true,
    autoArchiveEnabled: false,
    autoArchiveCount: 500,
    autoArchiveDays: 90,
    autoArchiveMode: 'threshold',
};

export interface DesktopStats {
    today: number;
    this_week: number;
    this_month: number;
    this_year: number;
    total: number;
}

/* ═══════════════════════════════════════════════════════════
   📥 Import
   ═══════════════════════════════════════════════════════════ */

export interface DiscoveredTask {
    task_id: string;
    title: string;
    completed: boolean;
    source_file: string;
    source_line: number;
    file_display_name: string;
    already_imported: boolean;
}

export interface ImportOptions {
    deleteFromNote: boolean;
    assignCategory: string;
}

export interface ImportResult {
    imported: number;
    removedFromNotes: number;
    errors: string[];
}

/* ═══════════════════════════════════════════════════════════
   🔄 Recurring
   ═══════════════════════════════════════════════════════════ */

export type RecurrenceType = 'daily' | 'weekly' | 'monthly';

/* 🆕 برای هفتگی چندتایی */
export type WeeklyMode = 'single' | 'multiple' | 'every-day';

export interface RecurringTemplate {
    id: string;
    title: string;
    description: string;
    category: string;
    recurrence: RecurrenceType;
    /* 🆕 weekDay قدیمی (single) — برای backward compat */
    weekDay?: number;
    /* 🆕 آرایه‌ی روزهای هفته */
    weekDays?: number[];
    /* 🆕 حالت هفتگی */
    weeklyMode?: WeeklyMode;
    /* ماهانه */
    monthDay?: number;
    /* تاریخ شروع */
    start_date_jalali: string;
    start_date_gregorian: string;
    start_date_ts: number;
    active: boolean;
    created_ts: number;
    modified_ts: number;
}

export const DEFAULT_RECURRING_TEMPLATE: RecurringTemplate = {
    id: '',
    title: '',
    description: '',
    category: '',
    recurrence: 'daily',
    weekDay: undefined,
    weekDays: undefined,
    weeklyMode: undefined,
    monthDay: undefined,
    start_date_jalali: '',
    start_date_gregorian: '',
    start_date_ts: 0,
    active: true,
    created_ts: 0,
    modified_ts: 0,
};

export interface RecurringStoreFile {
    version: number;
    last_updated: number;
    templates: Record<string, RecurringTemplate>;
}

export const DEFAULT_RECURRING_STORE: RecurringStoreFile = {
    version: 1,
    last_updated: 0,
    templates: {},
};

export interface RecurringSuggestion {
    template: RecurringTemplate;
    instance_date_jalali: string;
    instance_date_gregorian: string;
    instance_date_ts: number;
}

/* ═══════════════════════════════════════════════════════════
   💡 Smart Suggestions
   ═══════════════════════════════════════════════════════════ */

export type SuggestionType =
    | 'from_notes'
    | 'from_pattern'
    | 'from_old_task'
    | 'random_pick';

export interface SmartSuggestion {
    id: string;
    type: SuggestionType;
    title: string;
    description?: string;
    source_file?: string;
    source_line?: number;
    pattern_count?: number;
    task_id?: string;
    last_seen_ts?: number;
    category?: string;
}

/* ═══════════════════════════════════════════════════════════
   🗄️ Archive
   ═══════════════════════════════════════════════════════════ */

export interface DeadTask {
    id: string;
    title: string;
    description: string;
    category: string;
    pinned: boolean;
    completed: boolean;
    due_date_jalali: string;
    due_date_gregorian: string;
    due_date_ts: number;
    created_jalali: string;
    created_gregorian: string;
    created_ts: number;
    completed_jalali: string;
    completed_gregorian: string;
    completed_ts: number;
    modified_ts: number;
    from_recurring?: string;
    archived_at: number;
    archive_reason: 'auto' | 'manual';
}

export interface DeadStoreFile {
    version: number;
    last_updated: number;
    tasks: DeadTask[];
}

export const DEFAULT_DEAD_STORE: DeadStoreFile = {
    version: 1,
    last_updated: 0,
    tasks: [],
};

export interface MonthlyStats {
    completed: number;
    created: number;
}

export interface StatsFile {
    version: number;
    last_updated: number;
    total_completed: number;
    total_created: number;
    total_archived: number;
    monthly: Record<string, MonthlyStats>;
    last_archive_ts: number;
    last_archive_count: number;
}

export const DEFAULT_STATS_STORE: StatsFile = {
    version: 1,
    last_updated: 0,
    total_completed: 0,
    total_created: 0,
    total_archived: 0,
    monthly: {},
    last_archive_ts: 0,
    last_archive_count: 0,
};

/* ═══════════════════════════════════════════════════════════
   ⚙️ Settings
   ═══════════════════════════════════════════════════════════ */

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
    desktop: DesktopSettings;
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
    desktop: { ...DEFAULT_DESKTOP_SETTINGS },
};
