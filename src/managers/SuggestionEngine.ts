/* ════════════════════════════════════════════════════════════
   💡 SuggestionEngine — پیشنهادهای هوشمند (v0.4.0)
   ✅ ۴ نوع ساجست:
   │   ۱. from_notes: تسک‌های انجام‌نشده توی نوت‌ها
   │   ۲. from_pattern: الگوی تکرار (مثلاً «جلسه» هر هفته)
   │   ۳. from_old_task: تسک‌های قدیمی فراموش‌شده
   │   ۴. random_pick: تسک رندوم از تسک‌های اخیر
   ✅ حداکثر ۵ ساجست در هر بار
   ✅ بدون تکرار
   ════════════════════════════════════════════════════════════ */

import type { SmartSuggestion } from '../types';
import { TaskManager } from './TaskManager';
import { DesktopStore } from './DesktopStore';

/* ─── تنظیمات الگوریتم ─── */
const MAX_SUGGESTIONS = 5;
const MAX_FROM_NOTES = 2;
const MAX_FROM_PATTERN = 1;
const MAX_FROM_OLD = 1;
const MAX_RANDOM = 1;

/* ─── تسک قدیمی: چند روز نگاه نکرده ─── */
const OLD_TASK_DAYS = 14;

/* ─── pattern: حداقل تعداد تکرار توی ۳۰ روز ─── */
const PATTERN_MIN_OCCURRENCES = 3;
const PATTERN_WINDOW_DAYS = 30;

export class SuggestionEngine {
    constructor(
        private taskManager: TaskManager,
        private desktopStore: DesktopStore
    ) {}

    /* ═══════════════════════════════════════════════════════
       متد اصلی: تولید ساجست‌ها
       ═══════════════════════════════════════════════════════ */
    async generateSuggestions(): Promise<SmartSuggestion[]> {
        const suggestions: SmartSuggestion[] = [];
        const seenTitles = new Set<string>();

        /* ─── ۱. از نوت‌ها ─── */
        const fromNotes = this.getFromNotesSuggestions(seenTitles);
        for (const s of fromNotes) {
            if (suggestions.length >= MAX_SUGGESTIONS) break;
            suggestions.push(s);
        }

        /* ─── ۲. الگوهای تکراری ─── */
        const fromPattern = this.getFromPatternSuggestions(seenTitles);
        for (const s of fromPattern) {
            if (suggestions.length >= MAX_SUGGESTIONS) break;
            suggestions.push(s);
        }

        /* ─── ۳. تسک‌های قدیمی ─── */
        const fromOld = this.getFromOldTaskSuggestions(seenTitles);
        for (const s of fromOld) {
            if (suggestions.length >= MAX_SUGGESTIONS) break;
            suggestions.push(s);
        }

        /* ─── ۴. رندوم ─── */
        const random = this.getRandomPickSuggestions(seenTitles);
        for (const s of random) {
            if (suggestions.length >= MAX_SUGGESTIONS) break;
            suggestions.push(s);
        }

        return suggestions;
    }

    /* ═══════════════════════════════════════════════════════
       ۱️⃣ from_notes — تسک‌های جدید توی نوت‌ها
       ═══════════════════════════════════════════════════════ */
    private getFromNotesSuggestions(
        seen: Set<string>
    ): SmartSuggestion[] {
        const result: SmartSuggestion[] = [];

        try {
            const pendingTasks = this.taskManager.getPendingTasks();

            /* ─── فیلتر: تسک‌هایی که هنوز توی Desktop نیستن ─── */
            const desktopTitles = new Set<string>();
            for (const t of this.desktopStore.getAll()) {
                desktopTitles.add(t.title);
            }

            /* ─── مرتب‌سازی: جدیدترین اول ─── */
            const candidates = pendingTasks
                .filter(t => !desktopTitles.has(t.title))
                .sort((a, b) => b.created_ts - a.created_ts);

            let count = 0;
            for (const task of candidates) {
                if (count >= MAX_FROM_NOTES) break;
                if (seen.has(task.title)) continue;

                seen.add(task.title);
                result.push({
                    id: `notes-${task._id}`,
                    type: 'from_notes',
                    title: task.title,
                    description: task.description || '',
                    source_file: task._source_file,
                    source_line: task._source_line,
                    task_id: task._id,
                    category: task.category,
                });
                count++;
            }
        } catch (e) {
            console.warn('[First Task] from_notes failed:', e);
        }

        return result;
    }

    /* ═══════════════════════════════════════════════════════
       ۲️⃣ from_pattern — الگوی تکراری
       ═══════════════════════════════════════════════════════ */
    private getFromPatternSuggestions(
        seen: Set<string>
    ): SmartSuggestion[] {
        const result: SmartSuggestion[] = [];

        try {
            /* ─── تسک‌های completed توی ۳۰ روز اخیر ─── */
            const cutoff = Date.now() - PATTERN_WINDOW_DAYS * 24 * 60 * 60 * 1000;

            const recentCompleted = this.desktopStore
                .getAll()
                .filter(t => {
                    if (!t.completed) return false;
                    const ts = t.completed_ts || t.created_ts;
                    return ts >= cutoff;
                });

            /* ─── شمارش عنوان‌ها ─── */
            const titleCount = new Map<string, { count: number; task: typeof recentCompleted[0] }>();
            for (const t of recentCompleted) {
                const existing = titleCount.get(t.title);
                if (existing) {
                    existing.count++;
                } else {
                    titleCount.set(t.title, { count: 1, task: t });
                }
            }

            /* ─── فیلتر: عنوان‌هایی که ≥ ۳ بار اومدن ─── */
            const patterns = Array.from(titleCount.entries())
                .filter(([_, data]) => data.count >= PATTERN_MIN_OCCURRENCES)
                .sort((a, b) => b[1].count - a[1].count);

            for (const [title, data] of patterns) {
                if (seen.has(title)) continue;

                /* ─── چک: الان توی pending هست؟ اگه هست، ساجست نده ─── */
                const alreadyPending = this.desktopStore
                    .getPending()
                    .some(t => t.title === title);
                if (alreadyPending) continue;

                seen.add(title);
                result.push({
                    id: `pattern-${title}`,
                    type: 'from_pattern',
                    title,
                    description: '',
                    pattern_count: data.count,
                    category: data.task.category,
                });
                break; /* فقط یکی */
            }
        } catch (e) {
            console.warn('[First Task] from_pattern failed:', e);
        }

        return result;
    }

    /* ═══════════════════════════════════════════════════════
       ۳️⃣ from_old_task — تسک قدیمی فراموش‌شده
       ═══════════════════════════════════════════════════════ */
    private getFromOldTaskSuggestions(
        seen: Set<string>
    ): SmartSuggestion[] {
        const result: SmartSuggestion[] = [];

        try {
            const cutoff = Date.now() - OLD_TASK_DAYS * 24 * 60 * 60 * 1000;

            /* ─── تسک‌های pending قدیمی ─── */
            const oldPending = this.desktopStore
                .getPending()
                .filter(t => {
                    const ts = t.created_ts || t.modified_ts;
                    return ts > 0 && ts <= cutoff;
                })
                .sort((a, b) => {
                    const ta = a.created_ts || 0;
                    const tb = b.created_ts || 0;
                    return ta - tb; /* قدیمی‌ترین اول */
                });

            for (const task of oldPending) {
                if (seen.has(task.title)) continue;

                seen.add(task.title);
                result.push({
                    id: `old-${task.id}`,
                    type: 'from_old_task',
                    title: task.title,
                    description: task.description || '',
                    task_id: task.id,
                    last_seen_ts: task.created_ts,
                    category: task.category,
                });
                break; /* فقط یکی */
            }
        } catch (e) {
            console.warn('[First Task] from_old_task failed:', e);
        }

        return result;
    }

    /* ═══════════════════════════════════════════════════════
       ۴️⃣ random_pick — تسک رندوم
       ═══════════════════════════════════════════════════════ */
    private getRandomPickSuggestions(
        seen: Set<string>
    ): SmartSuggestion[] {
        const result: SmartSuggestion[] = [];

        try {
            /* ─── تسک‌های pending بدون تاریخ انجام ─── */
            const candidates = this.desktopStore
                .getPending()
                .filter(t => !t.due_date_ts && t.title.length > 0);

            /* ─── فیلتر: عنوان تکراری ─── */
            const unique = candidates.filter(t => !seen.has(t.title));
            if (unique.length === 0) return result;

            /* ─── یه تسک رندوم ─── */
            const pick = unique[Math.floor(Math.random() * unique.length)];

            seen.add(pick.title);
            result.push({
                id: `random-${pick.id}`,
                type: 'random_pick',
                title: pick.title,
                description: pick.description || '',
                task_id: pick.id,
                category: pick.category,
            });
        } catch (e) {
            console.warn('[First Task] random_pick failed:', e);
        }

        return result;
    }
}
