/* ════════════════════════════════════════════════════════════
   🌐 i18n — انگلیسی + فارسی (v0.4.0)
   ✅ Desktop + Import + Recurring
   ✅ 🆕 Smart Suggestions + Archive + Global Stats
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
    stats_global_title: 'All-time stats',
    stats_global_total_completed: 'Total done',
    stats_global_total_archived: 'Archived',

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
    planner_stat_next_week: 'Next week',
    planner_stat_this_month: 'This month',
    planner_stat_next_month: 'Next month',
    planner_stat_this_year: 'This year',
    planner_stat_next_year: 'Next year',
    planner_stat_no_date: 'No date',
    planner_stat_all: 'All',
    planner_tasks_in: 'Tasks in',

    /* ─── Desktop ─── */
    desktop_title: 'My Desktop',
    desktop_create_title: 'New Desktop task',
    desktop_new_task: 'New task',
    desktop_empty: 'Your desktop is empty',
    desktop_empty_hint: 'Create a task here without a note',
    desktop_empty_completed: 'No completed tasks yet',
    desktop_badge: 'Desktop',
    desktop_stats_today: 'Today',
    desktop_stats_this_week: 'This week',
    desktop_stats_this_month: 'This month',
    desktop_stats_this_year: 'This year',
    desktop_stats_total: 'Total',
    desktop_disabled: 'Desktop is disabled in settings',

    /* ─── Import ─── */
    import_title: 'Import from notes',
    import_loading: 'Scanning notes...',
    import_no_tasks: 'No pending tasks found in your notes',
    import_no_match: 'No tasks match your filters',
    import_search: 'Search',
    import_search_ph: 'Search by title...',
    import_filter_file: 'Filter by file',
    import_all_files: 'All files',
    import_show_imported: 'Show already imported',
    import_select_all: 'Select all',
    import_select_none: 'Clear',
    import_already_done: 'Already imported',
    import_delete_from_note: 'Delete from note',
    import_delete_from_note_desc: 'Remove task lines from notes after import',
    import_assign_category: 'Assign category',
    import_assign_category_desc: 'Apply this category to all imported tasks',
    import_keep_category: 'Keep original',
    import_button: 'Import ({count})',
    import_success: 'Imported {count} task(s)',
    import_failed: 'Import failed',

    /* ─── Recurring ─── */
    recurring_title: 'Recurring suggestions',
    recurring_suggestion_from: 'Due',
    recurring_suggestion_overdue: 'Overdue',
    recurring_add_one: 'Add',
    recurring_add_all: 'Add all',
    recurring_added_one: 'Task added',
    recurring_added_many: 'Added {count} task(s)',

    recurring_create_title: 'New recurring task',
    recurring_edit_title: 'Edit recurring task',
    recurring_type: 'Recurrence',
    recurring_type_desc: 'How often should this task repeat?',
    recurring_type_daily: 'Daily',
    recurring_type_weekly: 'Weekly',
    recurring_type_monthly: 'Monthly',
    recurring_weekday: 'Day of week',
    recurring_weekday_desc: 'On which day should this repeat?',
    recurring_monthday: 'Day of month',
    recurring_monthday_desc: 'Day 1-31 (last day if month is shorter)',
    recurring_start_date: 'Start date',
    recurring_start_date_desc: 'When should this recurring task begin?',
    recurring_created: 'Recurring task created',
    recurring_updated: 'Recurring task updated',
    recurring_deleted: 'Recurring task deleted',
    recurring_delete_confirm: 'Delete "{title}"?',
    recurring_activate: 'Activate',
    recurring_deactivate: 'Pause',

    /* Weekdays */
    weekday_sunday: 'Sunday',
    weekday_monday: 'Monday',
    weekday_tuesday: 'Tuesday',
    weekday_wednesday: 'Wednesday',
    weekday_thursday: 'Thursday',
    weekday_friday: 'Friday',
    weekday_saturday: 'Saturday',

    /* ─── 🆕 Smart Suggestions ─── */
    smart_title: 'Suggestions',
    smart_type_from_notes: 'From notes',
    smart_type_from_pattern: 'Pattern detected',
    smart_type_from_old_task: 'Forgotten task',
    smart_type_random_pick: 'Pick for you',
    smart_pattern_count: 'Seen {count} times',
    smart_pattern_hint: 'Create a recurring task for this pattern in Settings',
    smart_action_move: 'Move to Desktop',
    smart_action_create_recurring: 'Make recurring',
    smart_action_dismiss: 'Dismiss',

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
    confirm_delete_body: 'Delete this task?',

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
    settings_planner_cards_next_week: 'Next week',
    settings_planner_cards_this_month: 'This month',
    settings_planner_cards_next_month: 'Next month',
    settings_planner_cards_this_year: 'This year',
    settings_planner_cards_next_year: 'Next year',

    /* ─── Desktop Settings ─── */
    settings_desktop: 'My Desktop',
    settings_desktop_enabled: 'Enable Desktop',
    settings_desktop_enabled_desc: 'Show the Desktop panel for tasks without notes',
    settings_desktop_show_in_tasks: 'Show Desktop tasks in Tasks panel',
    settings_desktop_show_in_tasks_desc: 'Also display Desktop tasks alongside note-based tasks',
    settings_desktop_show_in_planner: 'Show Desktop tasks in Planner',
    settings_desktop_show_in_planner_desc: 'Include Desktop tasks in the Planner view',
    settings_desktop_import_mode: 'Default import mode',
    settings_desktop_import_mode_desc: 'When moving tasks from notes to Desktop',
    settings_desktop_import_copy: 'Copy (keep in note)',
    settings_desktop_import_move: 'Move (remove from note)',

    /* ─── Recurring Settings ─── */
    settings_recurring: 'Recurring tasks',
    settings_recurring_enabled: 'Enable recurring tasks',
    settings_recurring_enabled_desc: 'Show suggestions for tasks that repeat on a schedule',
    recurring_empty: 'No recurring tasks yet',
    recurring_add: 'Add recurring task',

    /* ─── 🆕 Suggestions Settings ─── */
    settings_suggestions: 'Smart suggestions',
    settings_suggestions_enabled: 'Enable smart suggestions',
    settings_suggestions_enabled_desc: 'Get smart tips from your notes, patterns, and forgotten tasks',

    /* ─── 🆕 Archive Settings ─── */
    settings_archive: 'Auto-archive',
    settings_archive_enabled: 'Enable auto-archive',
    settings_archive_enabled_desc: 'Move old completed tasks to a separate archive file',
    settings_archive_count: 'Minimum count',
    settings_archive_count_desc: 'Only archive if there are at least this many eligible tasks',
    settings_archive_days: 'Age threshold',
    settings_archive_days_desc: 'Only archive tasks completed more than this many days ago',
    settings_archive_mode: 'Archive mode',
    settings_archive_mode_desc: 'How many tasks to archive each time',
    archive_mode_threshold: 'Only if count reached',
    archive_mode_always: 'Archive all eligible',
    archive_days_30: '30 days',
    archive_days_60: '60 days',
    archive_days_90: '90 days',
    archive_days_180: '180 days',
    archive_days_365: '365 days',
    archive_run_now: 'Run archive now',
    archive_last_run: 'Last run: {date}',
    archive_never_run: 'Never run yet',

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
    bulk_move_to_desktop: 'To Desktop',
    bulk_move_to_desktop_confirm: 'Move {count} task(s) to Desktop? They will be removed from notes.',

    bulk_field_completed: 'Change status',
    bulk_completed_value: 'Status',
    bulk_completed_on: 'Mark as done',
    bulk_completed_off: 'Restore',
    bulk_completed_mixed_hint: 'Selected tasks have mixed states — choose an action',
    bulk_completed_pending_hint: 'All selected tasks will be marked as done',
    bulk_completed_done_hint: 'All selected tasks will be restored',

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
    notice_bulk_moved: 'Moved {count} task(s) to Desktop',

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

    /* ─── 🆕 Archive Notices ─── */
    notice_archive_success: 'Archived {count} task(s)',
    notice_archive_skipped: 'Not enough tasks to archive',
    notice_archive_none: 'No eligible tasks for archiving',

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
    stats_global_title: 'آمار کلی',
    stats_global_total_completed: 'کل انجام‌شده',
    stats_global_total_archived: 'آرشیو شده',

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
    planner_stat_next_week: 'هفته آینده',
    planner_stat_this_month: 'این ماه',
    planner_stat_next_month: 'ماه آینده',
    planner_stat_this_year: 'امسال',
    planner_stat_next_year: 'سال آینده',
    planner_stat_no_date: 'بدون تاریخ',
    planner_stat_all: 'همه',
    planner_tasks_in: 'تسک‌های',

    /* ─── میز من ─── */
    desktop_title: 'میز من',
    desktop_create_title: 'تسک جدید روی میز',
    desktop_new_task: 'تسک جدید',
    desktop_empty: 'میزت خالیه',
    desktop_empty_hint: 'اینجا می‌تونی بدون نوت تسک بسازی',
    desktop_empty_completed: 'هنوز تسکی انجام نشده',
    desktop_badge: 'میز من',
    desktop_stats_today: 'امروز',
    desktop_stats_this_week: 'این هفته',
    desktop_stats_this_month: 'این ماه',
    desktop_stats_this_year: 'امسال',
    desktop_stats_total: 'کل',
    desktop_disabled: 'میز من توی تنظیمات غیرفعاله',

    /* ─── Import ─── */
    import_title: 'افزودن از نوت‌ها',
    import_loading: 'در حال اسکن نوت‌ها...',
    import_no_tasks: 'تسک انجام‌نشده‌ای توی نوت‌ها پیدا نشد',
    import_no_match: 'تسکی با فیلترهای فعلی پیدا نشد',
    import_search: 'جستجو',
    import_search_ph: 'جستجو بر اساس عنوان...',
    import_filter_file: 'فیلتر فایل',
    import_all_files: 'همه فایل‌ها',
    import_show_imported: 'نمایش import‌شده‌ها',
    import_select_all: 'انتخاب همه',
    import_select_none: 'پاک کردن',
    import_already_done: 'قبلاً اضافه شده',
    import_delete_from_note: 'حذف از نوت',
    import_delete_from_note_desc: 'بعد از import، خط تسک از نوت پاک بشه',
    import_assign_category: 'دسته‌بندی',
    import_assign_category_desc: 'این دسته به همه‌ی تسک‌های import‌شده داده بشه',
    import_keep_category: 'دسته اصلی',
    import_button: 'افزودن ({count})',
    import_success: '{count} تسک اضافه شد',
    import_failed: 'افزودن ناموفق',

    /* ─── تسک‌های تکرارشونده ─── */
    recurring_title: 'تسک‌های تکرارشونده',
    recurring_suggestion_from: 'موعد',
    recurring_suggestion_overdue: 'عقب‌افتاده',
    recurring_add_one: 'افزودن',
    recurring_add_all: 'افزودن همه',
    recurring_added_one: 'تسک اضافه شد',
    recurring_added_many: '{count} تسک اضافه شد',

    recurring_create_title: 'تسک تکرارشونده جدید',
    recurring_edit_title: 'ویرایش تسک تکرارشونده',
    recurring_type: 'تکرار',
    recurring_type_desc: 'هر چند وقت یه بار تکرار بشه؟',
    recurring_type_daily: 'روزانه',
    recurring_type_weekly: 'هفتگی',
    recurring_type_monthly: 'ماهانه',
    recurring_weekday: 'روز هفته',
    recurring_weekday_desc: 'کدوم روز هفته تکرار بشه؟',
    recurring_monthday: 'روز ماه',
    recurring_monthday_desc: 'از ۱ تا ۳۱ (اگه ماه کوتاه‌تر باشه، آخرین روز)',
    recurring_start_date: 'تاریخ شروع',
    recurring_start_date_desc: 'از چه تاریخی شروع بشه؟',
    recurring_created: 'تسک تکرارشونده ساخته شد',
    recurring_updated: 'تسک تکرارشونده بروزرسانی شد',
    recurring_deleted: 'تسک تکرارشونده حذف شد',
    recurring_delete_confirm: '«{title}» حذف بشه؟',
    recurring_activate: 'فعال کردن',
    recurring_deactivate: 'غیرفعال کردن',

    /* روزهای هفته */
    weekday_sunday: 'یکشنبه',
    weekday_monday: 'دوشنبه',
    weekday_tuesday: 'سه‌شنبه',
    weekday_wednesday: 'چهارشنبه',
    weekday_thursday: 'پنجشنبه',
    weekday_friday: 'جمعه',
    weekday_saturday: 'شنبه',

    /* ─── 🆕 پیشنهادهای هوشمند ─── */
    smart_title: 'پیشنهادها',
    smart_type_from_notes: 'از نوت‌ها',
    smart_type_from_pattern: 'الگو شناسایی شد',
    smart_type_from_old_task: 'تسک فراموش‌شده',
    smart_type_random_pick: 'یه پیشنهاد',
    smart_pattern_count: '{count} بار تکرار شده',
    smart_pattern_hint: 'از تنظیمات براش یه تسک تکرارشونده بساز',
    smart_action_move: 'انتقال به میز',
    smart_action_create_recurring: 'تکرارشونده کن',
    smart_action_dismiss: 'رد کن',

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
    confirm_delete_body: 'این تسک حذف بشه؟',

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
    settings_planner_cards_next_week: 'هفته آینده',
    settings_planner_cards_this_month: 'این ماه',
    settings_planner_cards_next_month: 'ماه آینده',
    settings_planner_cards_this_year: 'امسال',
    settings_planner_cards_next_year: 'سال آینده',

    /* ─── تنظیمات میز من ─── */
    settings_desktop: 'میز من',
    settings_desktop_enabled: 'فعال‌سازی میز من',
    settings_desktop_enabled_desc: 'نمایش پنل میز برای تسک‌های بدون نوت',
    settings_desktop_show_in_tasks: 'نمایش تسک‌های میز در پنل تسک‌ها',
    settings_desktop_show_in_tasks_desc: 'تسک‌های میز کنار تسک‌های نوت‌ها هم نمایش داده بشن',
    settings_desktop_show_in_planner: 'نمایش تسک‌های میز در پلنر',
    settings_desktop_show_in_planner_desc: 'تسک‌های میز توی نمای پلنر هم بیان',
    settings_desktop_import_mode: 'حالت انتقال پیش‌فرض',
    settings_desktop_import_mode_desc: 'وقتی تسکی از نوت به میز منتقل می‌شه',
    settings_desktop_import_copy: 'کپی (توی نوت بمونه)',
    settings_desktop_import_move: 'انتقال (از نوت حذف بشه)',

    /* ─── تنظیمات تکرارشونده ─── */
    settings_recurring: 'تسک‌های تکرارشونده',
    settings_recurring_enabled: 'فعال‌سازی تسک‌های تکرارشونده',
    settings_recurring_enabled_desc: 'نمایش پیشنهادها برای تسک‌هایی که طبق برنامه تکرار می‌شن',
    recurring_empty: 'هنوز تسک تکرارشونده‌ای نساختی',
    recurring_add: 'افزودن تسک تکرارشونده',

    /* ─── 🆕 تنظیمات پیشنهادها ─── */
    settings_suggestions: 'پیشنهادهای هوشمند',
    settings_suggestions_enabled: 'فعال‌سازی پیشنهادهای هوشمند',
    settings_suggestions_enabled_desc: 'پیشنهادهای هوشمند بر اساس نوت‌ها، الگوها و تسک‌های فراموش‌شده',

    /* ─── 🆕 تنظیمات آرشیو ─── */
    settings_archive: 'آرشیو خودکار',
    settings_archive_enabled: 'فعال‌سازی آرشیو خودکار',
    settings_archive_enabled_desc: 'تسک‌های قدیمی انجام‌شده به یه فایل جدا منتقل بشن',
    settings_archive_count: 'حداقل تعداد',
    settings_archive_count_desc: 'فقط اگه حداقل این تعداد تسک واجد شرط باشه، آرشیو کن',
    settings_archive_days: 'بازه‌ی زمانی',
    settings_archive_days_desc: 'فقط تسک‌هایی که بیشتر از این مدت از انجامشون گذشته',
    settings_archive_mode: 'حالت آرشیو',
    settings_archive_mode_desc: 'هر بار چند تسک آرشیو بشه',
    archive_mode_threshold: 'فقط اگه به حد رسید',
    archive_mode_always: 'همه‌ی واجدین شرط',
    archive_days_30: '۳۰ روز',
    archive_days_60: '۶۰ روز',
    archive_days_90: '۹۰ روز',
    archive_days_180: '۱۸۰ روز',
    archive_days_365: '۳۶۵ روز',
    archive_run_now: 'آرشیو کن (الان)',
    archive_last_run: 'آخرین اجرا: {date}',
    archive_never_run: 'هنوز اجرا نشده',

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
    bulk_move_to_desktop: 'به میز من',
    bulk_move_to_desktop_confirm: '{count} تسک به میز من منتقل بشن؟ از نوت‌ها حذف می‌شن.',

    bulk_field_completed: 'تغییر وضعیت',
    bulk_completed_value: 'وضعیت',
    bulk_completed_on: 'انجام شد',
    bulk_completed_off: 'برگرداندن',
    bulk_completed_mixed_hint: 'تسک‌های انتخاب‌شده وضعیت متفاوت دارن — یه عملیات انتخاب کن',
    bulk_completed_pending_hint: 'همه‌ی تسک‌های انتخاب‌شده انجام‌شده می‌شن',
    bulk_completed_done_hint: 'همه‌ی تسک‌های انتخاب‌شده برمی‌گردن',

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
    notice_bulk_moved: '{count} تسک به میز من منتقل شد',

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

    /* ─── 🆕 اعلان‌های آرشیو ─── */
    notice_archive_success: '{count} تسک آرشیو شد',
    notice_archive_skipped: 'به تعداد لازم نرسیده',
    notice_archive_none: 'تسک واجد شرطی برای آرشیو نیست',

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
    const dict = (translations as any)[lang] || translations.en;
    let text = dict[key] ?? (translations.en as any)[key] ?? key;

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
