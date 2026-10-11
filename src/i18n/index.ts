/* ════════════════════════════════════════════════════════════
   🌐 i18n — انگلیسی + فارسی
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

    /* ─── Create Modal ─── */
    create_title: 'New task',
    field_title: 'Title',
    field_title_placeholder: 'What to do?',
    field_description: 'Description (optional)',
    field_description_placeholder: 'Add details...',
    field_due_date: 'Due date (optional)',
    field_due_date_placeholder: 'YYYY-MM-DD',
    field_category: 'Category (optional)',
    field_category_placeholder: 'Select or type...',
    field_source_file: 'Add to note',
    field_source_file_hint: 'The task will be added to this note as markdown',

    /* ─── Details Modal ─── */
    details_title: 'Task details',
    details_source: 'From note',
    details_status: 'Status',
    details_category: 'Category',
    details_due_date: 'Due date',
    details_description: 'Description',
    details_no_description: 'No description',

    /* ─── Buttons ─── */
    btn_cancel: 'Cancel',
    btn_create: 'Create',
    btn_mark_done: 'Mark as done',
    btn_mark_pending: 'Restore',
    btn_pin: 'Pin',
    btn_unpin: 'Unpin',
    btn_open_note: 'Open note',

    /* ─── Settings ─── */
    settings_title: 'First Task Settings',

    settings_general: 'General',
    settings_language: 'Language',
    settings_language_desc: 'Plugin interface language',
    settings_jalali: 'Jalali (Persian) date',
    settings_jalali_desc: 'Show due dates in Persian calendar',

    settings_display: 'Display',
    settings_tasks_per_page: 'Tasks per page',
    settings_tasks_per_page_desc: 'How many tasks to load at once',
    settings_group_by_note: 'Group tasks by note',
    settings_group_by_note_desc: 'Show tasks grouped by their source note',
    settings_show_note_in_modal: 'Show note name in details',
    settings_show_note_in_modal_desc: 'Display the source note in task details',

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
    settings_dynamic_categories: 'Dynamic time categories',
    settings_dynamic_categories_desc: 'Auto-categorize tasks by their due date',
    settings_dynamic_tomorrow: 'Tomorrow',
    settings_dynamic_this_week: 'This week',
    settings_dynamic_this_month: 'This month',
    settings_dynamic_this_year: 'This year',

    /* ─── Notices ─── */
    notice_task_created: 'Task created',
    notice_task_updated: 'Task updated',
    notice_task_completed: 'Task marked as done',
    notice_task_restored: 'Task restored',
    notice_task_pinned: 'Task pinned',
    notice_task_unpinned: 'Task unpinned',
    notice_no_title: 'Title is required',
    notice_no_file: 'Please select a note',
    notice_rescan_ok: 'Vault rescanned',
    notice_rescan_failed: 'Rescan failed: {error}',

    /* ─── Other ─── */
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

    /* ─── مودال ساخت ─── */
    create_title: 'تسک جدید',
    field_title: 'عنوان',
    field_title_placeholder: 'چی کار کنم؟',
    field_description: 'توضیحات (اختیاری)',
    field_description_placeholder: 'جزئیات رو بنویس...',
    field_due_date: 'تاریخ انجام (اختیاری)',
    field_due_date_placeholder: '۱۴۰۵/۰۷/۲۵',
    field_category: 'دسته‌بندی (اختیاری)',
    field_category_placeholder: 'انتخاب یا تایپ...',
    field_source_file: 'افزودن به نوت',
    field_source_file_hint: 'تسک به صورت markdown به این نوت اضافه می‌شه',

    /* ─── مودال جزئیات ─── */
    details_title: 'جزئیات تسک',
    details_source: 'از نوت',
    details_status: 'وضعیت',
    details_category: 'دسته‌بندی',
    details_due_date: 'تاریخ انجام',
    details_description: 'توضیحات',
    details_no_description: 'بدون توضیحات',

    /* ─── دکمه‌ها ─── */
    btn_cancel: 'لغو',
    btn_create: 'ایجاد',
    btn_mark_done: 'انجام شد',
    btn_mark_pending: 'برگرداندن',
    btn_pin: 'پین کردن',
    btn_unpin: 'برداشتن پین',
    btn_open_note: 'باز کردن نوت',

    /* ─── تنظیمات ─── */
    settings_title: 'تنظیمات تسک اول',

    settings_general: 'عمومی',
    settings_language: 'زبان',
    settings_language_desc: 'زبان رابط کاربری پلاگین',
    settings_jalali: 'تاریخ شمسی',
    settings_jalali_desc: 'نمایش تاریخ انجام به شمسی',

    settings_display: 'نمایش',
    settings_tasks_per_page: 'تعداد تسک در هر بار',
    settings_tasks_per_page_desc: 'هر بار چند تسک لود بشه',
    settings_group_by_note: 'گروه‌بندی بر اساس نوت',
    settings_group_by_note_desc: 'تسک‌ها بر اساس نوت مبدأ گروه‌بندی بشن',
    settings_show_note_in_modal: 'نمایش نام نوت در جزئیات',
    settings_show_note_in_modal_desc: 'نام نوت مبدأ توی مودال جزئیات نشون داده بشه',

    settings_folders: 'پوشه‌ها',
    settings_include_folders: 'پوشه‌های شامل',
    settings_include_folders_desc: 'فقط این پوشه‌ها اسکن بشن (خالی = همه)',
    settings_exclude_folders: 'پوشه‌های نادیده',
    settings_exclude_folders_desc: 'این پوشه‌ها موقع اسکن نادیده گرفته بشن',
    settings_only_markdown: 'فقط فایل‌های markdown',
    settings_only_markdown_desc: 'فایل‌های غیر markdown نادیده گرفته بشن',

    settings_categories: 'دسته‌بندی',
    settings_enable_categories: 'فعال‌سازی دسته‌بندی',
    settings_enable_categories_desc: 'اجازه بده تسک‌ها به دسته اختصاص داده بشن',
    settings_dynamic_categories: 'دسته‌بندی‌های زمانی خودکار',
    settings_dynamic_categories_desc: 'تسک‌ها بر اساس تاریخ انجام، خودکار دسته‌بندی بشن',
    settings_dynamic_tomorrow: 'فردا',
    settings_dynamic_this_week: 'این هفته',
    settings_dynamic_this_month: 'این ماه',
    settings_dynamic_this_year: 'امسال',

    /* ─── اعلان‌ها ─── */
    notice_task_created: 'تسک ساخته شد',
    notice_task_updated: 'تسک بروزرسانی شد',
    notice_task_completed: 'تسک انجام شد',
    notice_task_restored: 'تسک برگردونده شد',
    notice_task_pinned: 'تسک پین شد',
    notice_task_unpinned: 'پین تسک برداشته شد',
    notice_no_title: 'عنوان الزامیه',
    notice_no_file: 'اول یه نوت انتخاب کن',
    notice_rescan_ok: 'والت دوباره اسکن شد',
    notice_rescan_failed: 'اسکن ناموفق: {error}',

    /* ─── متفرقه ─── */
    unspecified: 'مشخص نشده',
};

/* ═══════════════════════════════════════════════════════
   🌐 توابع کمکی
   ═══════════════════════════════════════════════════════ */

const translations = { en, fa };

type TranslationKey = keyof typeof en;

/* ترجمه */
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

/* آیا RTL؟ */
export function isRTL(lang: Language): boolean {
    return lang === 'fa';
}

/* اعمال جهت روی یه عنصر */
export function applyDirection(el: HTMLElement, lang: Language): void {
    el.setAttribute('dir', isRTL(lang) ? 'rtl' : 'ltr');
    el.classList.toggle('first-task-rtl', isRTL(lang));
}
