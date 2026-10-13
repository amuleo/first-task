/* ════════════════════════════════════════════════════════════
   🌐 i18n — انگلیسی + فارسی (v0.1.2)
   ════════════════════════════════════════════════════════════ */

import type { Language } from '../types';

/* ═══════════════════════════════════════════════════════
   🇬🇧 English
   ═══════════════════════════════════════════════════════ */
const en = {
    plugin_name: 'First Task',

    /* ─── Tabs ─── */
    tab_pending: 'Tasks',
    tab_completed: 'Completed',

    /* ─── Panel ─── */
    panel_title: 'Tasks',
    panel_title_completed: 'Completed tasks',
    panel_empty: 'All tasks are done!',
    panel_empty_hint: 'Write a task in any note using - [ ] and it will show up here',
    panel_empty_completed: 'No completed tasks yet',
    panel_new_task: 'New task',
    panel_reload: 'Rescan vault',
    panel_reloading: 'Rescanning vault...',
    panel_show_more: 'Show more',
    panel_no_category: 'No category',
    panel_all_categories: 'All categories',

    /* ─── Stats ─── */
    stats_today: 'Today',
    stats_yesterday: 'Yesterday',
    stats_this_week: 'This week',
    stats_last_month: 'Last month',
    stats_this_year: 'This year',
    stats_total: 'Total',

    /* ─── Task ─── */
    task_pending: 'Pending',
    task_done: 'Done',
    pinned_badge: 'Pinned',

    /* ─── Dynamic categories ─── */
    category_today: 'Today',
    category_tomorrow: 'Tomorrow',
    category_this_week: 'This week',
    category_this_month: 'This month',
    category_this_year: 'This year',

    /* ─── Planner ─── */
    planner_title: 'Planner',
    planner_no_tasks: 'No tasks here',
    planner_stat_past: 'Past due',
    planner_stat_today: 'Today',
    planner_stat_tomorrow: 'Tomorrow',
    planner_stat_this_week: 'This week',
    planner_stat_this_month: 'This month',
    planner_stat_this_year: 'This year',
    planner_stat_no_date: 'No date',
    planner_stat_all: 'All',
    planner_tasks_in: 'Tasks in',

    /* ─── Create Modal ─── */
    create_title: 'New task',
    field_title: 'Title',
    field_title_placeholder: 'What to do?',
    field_description: 'Description (optional)',
    field_description_placeholder: 'Add details...',
    field_due_date: 'Due date (optional)',
    field_category: 'Category (optional)',
    field_source_file: 'Add to note',
    field_source_file_hint: 'The task will be added to this note as markdown',

    /* ─── Details Modal ─── */
    details_title: 'Task details',
    details_source: 'From note',
    details_status: 'Status',
    details_category: 'Category',
    details_due_date: 'Due date',
    details_created: 'Created',
    details_completed: 'Completed',
    details_description: 'Description',
    details_no_description: 'No description',
    details_dynamic_categories: 'Time categories',

    /* ─── Edit Modal ─── */
    edit_title: 'Edit task',

    /* ─── Buttons ─── */
    btn_cancel: 'Cancel',
    btn_create: 'Create',
    btn_edit: 'Edit',
    btn_save: 'Save',
    btn_delete: 'Delete',
    btn_mark_done: 'Mark as done',
    btn_mark_pending: 'Restore',
    btn_pin: 'Pin',
    btn_unpin: 'Unpin',

    /* ─── Confirm ─── */
    confirm_delete_body: 'Delete this task? The line will be removed from the note.',

    /* ─── Settings ─── */
    settings_title: 'First Task Settings',
    settings_general: 'General',
    settings_language: 'Language',
    settings_language_desc: 'Plugin interface language',
    settings_jalali: 'Jalali (Persian) date',
    settings_jalali_desc: 'Show dates in Persian calendar',

    settings_week_start: 'Week starts on',
    settings_week_start_desc: 'Which day should a week begin?',
    week_saturday: 'Saturday',
    week_sunday: 'Sunday',
    week_monday: 'Monday',

    settings_display: 'Display',
    settings_tasks_per_page: 'Tasks per page',
    settings_tasks_per_page_desc: 'How many tasks to load at once',

    settings_show_task_badges: 'Show time badges on tasks',
    settings_show_task_badges_desc: 'Display Today, Tomorrow, etc. badges on task cards',

    settings_auto_fill_created: 'Auto-fill creation date',
    settings_auto_fill_created_desc: 'Set current time as creation date for tasks without one',

    settings_folders: 'Folders',
    settings_include_folders: 'Include folders',
    settings_include_folders_desc: 'Only scan these folders (leave empty for all)',
    settings_exclude_folders: 'Exclude folders',
    settings_exclude_folders_desc: 'Skip these folders when scanning',
    settings_only_markdown: 'Markdown files only',
    settings_only_markdown_desc: 'Skip non-markdown files',

    settings_categories: 'Categories',
    settings_enable_categories: 'Enable categories',
    settings_enable_categories_desc: 'Let tasks be assigned to categories',

    settings_planner_cards: 'Planner cards',
    settings_planner_cards_desc: 'Choose which time-based cards to show in Planner',
    settings_planner_cards_past: 'Past due',
    settings_planner_cards_today: 'Today',
    settings_planner_cards_tomorrow: 'Tomorrow',
    settings_planner_cards_this_week: 'This week',
    settings_planner_cards_this_month: 'This month',
    settings_planner_cards_this_year: 'This year',

    /* ─── Bulk operations ─── */
    bulk_select: 'Select',
    bulk_cancel: 'Cancel',
    bulk_selected_count: '{count} selected',
    bulk_delete: 'Delete',
    bulk_edit: 'Edit',
    bulk_delete_confirm: 'Delete {count} tasks?',
    bulk_edit_title: 'Bulk edit',
    bulk_apply: 'Apply',
    bulk_select_all: 'Select all',
    bulk_clear_selection: 'Clear',

    bulk_field_category: 'Change category',
    bulk_field_date: 'Change due date',
    bulk_field_pin: 'Change pin status',
    bulk_field_note: 'Move to another note',
    bulk_pin_value: 'Pin status',
    bulk_pin_on: 'Pin',
    bulk_pin_off: 'Unpin',
    bulk_field_note_hint: 'Selected tasks will be moved to this note',

    notice_bulk_deleted: 'Tasks deleted',
    notice_bulk_updated: 'Tasks updated',

    /* ─── Notices ─── */
    notice_task_created: 'Task created',
    notice_task_updated: 'Task updated',
    notice_task_completed: 'Task marked as done',
    notice_task_restored: 'Task restored',
    notice_task_deleted: 'Task deleted',
    notice_task_pinned: 'Task pinned',
    notice_task_unpinned: 'Task unpinned',
    notice_no_title: 'Title is required',
    notice_no_file: 'Please select a note',
    notice_rescan_ok: 'Vault rescanned',
    notice_rescan_failed: 'Rescan failed: {error}',
    notice_invalid_date: 'Invalid date format',

    unspecified: 'Unspecified',
};

/* ═══════════════════════════════════════════════════════
   🇮🇷 فارسی
   ═══════════════════════════════════════════════════════ */
const fa: typeof en = {
    plugin_name: 'تسک اول',

    /* ─── تب‌ها ─── */
    tab_pending: 'تسک ها',
    tab_completed: 'انجام شده',

    /* ─── پنل ─── */
    panel_title: 'تسک ها',
    panel_title_completed: 'تسک های انجام شده',
    panel_empty: 'همه‌ی تسک‌ها انجام شدن!',
    panel_empty_hint: 'توی هر نوت با - [ ] یه تسک بنویس، خودش اینجا میاد',
    panel_empty_completed: 'هنوز تسکی انجام نشده',
    panel_new_task: 'تسک جدید',
    panel_reload: 'اسکن مجدد',
    panel_reloading: 'در حال اسکن مجدد...',
    panel_show_more: 'نمایش بیشتر',
    panel_no_category: 'بدون دسته',
    panel_all_categories: 'همه دسته‌ها',

    /* ─── آمار ─── */
    stats_today: 'امروز',
    stats_yesterday: 'دیروز',
    stats_this_week: 'این هفته',
    stats_last_month: 'ماه گذشته',
    stats_this_year: 'امسال',
    stats_total: 'کل',

    /* ─── تسک ─── */
    task_pending: 'در انتظار',
    task_done: 'انجام شده',
    pinned_badge: 'پین شده',

    /* ─── دسته‌بندی داینامیک ─── */
    category_today: 'امروز',
    category_tomorrow: 'فردا',
    category_this_week: 'این هفته',
    category_this_month: 'این ماه',
    category_this_year: 'امسال',

    /* ─── پلنر ─── */
    planner_title: 'پلنر',
    planner_no_tasks: 'تسکی اینجا نیست',
    planner_stat_past: 'گذشته',
    planner_stat_today: 'امروز',
    planner_stat_tomorrow: 'فردا',
    planner_stat_this_week: 'این هفته',
    planner_stat_this_month: 'این ماه',
    planner_stat_this_year: 'امسال',
    planner_stat_no_date: 'بدون تاریخ',
    planner_stat_all: 'همه',
    planner_tasks_in: 'تسک‌های',

    /* ─── مودال ساخت ─── */
    create_title: 'تسک جدید',
    field_title: 'عنوان',
    field_title_placeholder: 'چی کار کنم؟',
    field_description: 'توضیحات (اختیاری)',
    field_description_placeholder: 'جزئیات رو بنویس...',
    field_due_date: 'تاریخ انجام (اختیاری)',
    field_category: 'دسته‌بندی (اختیاری)',
    field_source_file: 'افزودن به نوت',
    field_source_file_hint: 'تسک به صورت مارک‌داون به این نوت اضافه می‌شه',

    /* ─── مودال جزئیات ─── */
    details_title: 'جزئیات تسک',
    details_source: 'از نوت',
    details_status: 'وضعیت',
    details_category: 'دسته‌بندی',
    details_due_date: 'تاریخ انجام',
    details_created: 'تاریخ ساخت',
    details_completed: 'تاریخ انجام',
    details_description: 'توضیحات',
    details_no_description: 'بدون توضیحات',
    details_dynamic_categories: 'دسته‌های زمانی',

    /* ─── مودال ویرایش ─── */
    edit_title: 'ویرایش تسک',

    /* ─── دکمه‌ها ─── */
    btn_cancel: 'لغو',
    btn_create: 'ایجاد',
    btn_edit: 'ویرایش',
    btn_save: 'ذخیره',
    btn_delete: 'حذف',
    btn_mark_done: 'انجام شد',
    btn_mark_pending: 'برگرداندن',
    btn_pin: 'پین کردن',
    btn_unpin: 'برداشتن پین',

    /* ─── تأیید ─── */
    confirm_delete_body: 'این تسک حذف بشه؟ خط از نوت پاک می‌شه.',

    /* ─── تنظیمات ─── */
    settings_title: 'تنظیمات تسک اول',
    settings_general: 'عمومی',
    settings_language: 'زبان',
    settings_language_desc: 'زبان رابط کاربری افزونه',
    settings_jalali: 'تاریخ شمسی',
    settings_jalali_desc: 'نمایش تاریخ‌ها به شمسی',

    settings_week_start: 'شروع هفته',
    settings_week_start_desc: 'هفته از چه روزی شروع می‌شه؟',
    week_saturday: 'شنبه',
    week_sunday: 'یکشنبه',
    week_monday: 'دوشنبه',

    settings_display: 'نمایش',
    settings_tasks_per_page: 'تعداد تسک در هر بار',
    settings_tasks_per_page_desc: 'هر بار چند تسک لود بشه',

    settings_show_task_badges: 'نمایش برچسب‌های زمانی روی تسک‌ها',
    settings_show_task_badges_desc: 'نمایش برچسب‌های «امروز»، «فردا» و... روی کارت تسک‌ها',

    settings_auto_fill_created: 'پر کردن خودکار تاریخ ساخت',
    settings_auto_fill_created_desc: 'برای تسک‌های بدون تاریخ، زمان فعلی رو به عنوان تاریخ ساخت بذار',

    settings_folders: 'پوشه‌ها',
    settings_include_folders: 'پوشه‌های شامل',
    settings_include_folders_desc: 'فقط این پوشه‌ها اسکن بشن (خالی = همه)',
    settings_exclude_folders: 'پوشه‌های نادیده',
    settings_exclude_folders_desc: 'این پوشه‌ها موقع اسکن نادیده گرفته بشن',
    settings_only_markdown: 'فقط فایل‌های مارک‌داون',
    settings_only_markdown_desc: 'فایل‌های غیر مارک‌داون نادیده گرفته بشن',

    settings_categories: 'دسته‌بندی',
    settings_enable_categories: 'فعال‌سازی دسته‌بندی',
    settings_enable_categories_desc: 'اجازه بده تسک‌ها به دسته اختصاص داده بشن',

    settings_planner_cards: 'کارت‌های پلنر',
    settings_planner_cards_desc: 'انتخاب کن کدوم کارت‌های زمانی توی پلنر نمایش داده بشن',
    settings_planner_cards_past: 'گذشته',
    settings_planner_cards_today: 'امروز',
    settings_planner_cards_tomorrow: 'فردا',
    settings_planner_cards_this_week: 'این هفته',
    settings_planner_cards_this_month: 'این ماه',
    settings_planner_cards_this_year: 'امسال',

    /* ─── عملیات گروهی ─── */
    bulk_select: 'انتخاب',
    bulk_cancel: 'انصراف',
    bulk_selected_count: '{count} تسک انتخاب شده',
    bulk_delete: 'حذف',
    bulk_edit: 'ویرایش',
    bulk_delete_confirm: '{count} تسک حذف بشن؟',
    bulk_edit_title: 'ویرایش گروهی',
    bulk_apply: 'اعمال',
    bulk_select_all: 'انتخاب همه',
    bulk_clear_selection: 'پاک کردن',

    bulk_field_category: 'تغییر دسته‌بندی',
    bulk_field_date: 'تغییر تاریخ انجام',
    bulk_field_pin: 'تغییر وضعیت پین',
    bulk_field_note: 'انتقال به نوت دیگر',
    bulk_pin_value: 'وضعیت پین',
    bulk_pin_on: 'پین',
    bulk_pin_off: 'برداشتن پین',
    bulk_field_note_hint: 'تسک‌های انتخاب‌شده به این نوت منتقل می‌شن',

    notice_bulk_deleted: 'تسک‌ها حذف شدن',
    notice_bulk_updated: 'تسک‌ها بروزرسانی شدن',

    /* ─── اعلان‌ها ─── */
    notice_task_created: 'تسک ساخته شد',
    notice_task_updated: 'تسک بروزرسانی شد',
    notice_task_completed: 'تسک انجام شد',
    notice_task_restored: 'تسک برگردونده شد',
    notice_task_deleted: 'تسک حذف شد',
    notice_task_pinned: 'تسک پین شد',
    notice_task_unpinned: 'پین تسک برداشته شد',
    notice_no_title: 'عنوان الزامیه',
    notice_no_file: 'اول یه نوت انتخاب کن',
    notice_rescan_ok: 'والت دوباره اسکن شد',
    notice_rescan_failed: 'اسکن ناموفق: {error}',
    notice_invalid_date: 'قالب تاریخ اشتباهه',

    unspecified: 'مشخص نشده',
};

/* ═══════════════════════════════════════════════════════════
   توابع کمکی
   ═══════════════════════════════════════════════════════════ */

const translations = { en, fa };
type TranslationKey = keyof typeof en;

export function t(
    lang: Language,
    key: TranslationKey,
    params?: Record<string, string>
): string {
    let text = translations[lang][key] ?? translations.en[key] ?? key;
    if (params) {
        for (const [k, v] of Object.entries(params)) {
            text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
        }
    }
    return text;
}

export function isRTL(lang: Language): boolean {
    return lang === 'fa';
}

export function applyDirection(el: HTMLElement, lang: Language): void {
    el.setAttribute('dir', isRTL(lang) ? 'rtl' : 'ltr');
    el.classList.toggle('first-task-rtl', isRTL(lang));
}
