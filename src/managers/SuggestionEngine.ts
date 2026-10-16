/* ════════════════════════════════════════════════════════════
   💡 SuggestionEngine — پیشنهادهای هوشمند (v0.2.1)
   ✅ ۴ نوع ساجست
   ✅ 🆕 skip تسک‌های تازه اضافه‌شده (با created_ts یا modified_ts)
   ✅ 🆕 random_pick رو فقط بعد از ۷ روز پیشنهاد می‌ده
   ════════════════════════════════════════════════════════════ */

import type { SmartSuggestion } from '../types';
import { TaskManager } from './TaskManager';
import { DesktopStore } from './DesktopStore';

const MAX_SUGGESTIONS = 5;
const MAX_FROM_NOTES = 2;
const MAX_FROM_PATTERN = 1;
const MAX_FROM_OLD = 1;
const MAX_RANDOM = 1;

const OLD_TASK_DAYS = 14;
const PATTERN_MIN_OCCURRENCES = 3;
const PATTERN_WINDOW_DAYS = 30;

/* 🆕 تسک‌هایی که کمتر از این مدت از آخرین تغییرشون گذشته، پیشنهاد نشمن */
const SKIP_RECENT_DAYS = 7;

export class SuggestionEngine {
    constructor(
        private taskManager: TaskManager,
        private desktopStore: DesktopStore
    ) {}

    /* ═══════════════════════════════════════════════════════
       متد اصلی
       ═══════════════════════════════════════════════════════ */
    async generateSuggestions(): Promise<SmartSuggestion[]> {
        const suggestions: SmartSuggestion[] = [];
        const seenTitles = new Set<string>();

        const fromNotes = this.getFromNotesSuggestions(seenTitles);
        for (const s of fromNotes) {
            if (suggestions.length >= MAX_SUGGESTIONS) break;
            suggestions.push(s);
        }

        const fromPattern = this.getFromPatternSuggestions(seenTitles);
        for (const s of fromPattern) {
            if (suggestions.length >= MAX_SUGGESTIONS) break;
            suggestions.push(s);
        }

        const fromOld = this.getFromOldTaskSuggestions(seenTitles);
        for (const s of fromOld) {
            if (suggestions.length >= MAX_SUGGESTIONS) break;
            suggestions.push(s);
        }

        const random = this.getRandomPickSuggestions(seenTitles);
        for (const s of random) {
            if (suggestions.length >= MAX_SUGGESTIONS) break;
            suggestions.push(s);
        }

        return suggestions;
    }

    /* ═══════════════════════════════════════════════════════
       ۱️⃣ from_notes — تسک‌های نوت که هنوز به Desktop نیومدن
       ═══════════════════════════════════════════════════════ */
    private getFromNotesSuggestions(seen: Set<string>): SmartSuggestion[] {
        const result: SmartSuggestion[] = [];

        try {
            const pendingTasks = this.taskManager.getPendingTasks();

            /* ─── چک: تسک توی Desktop هست یا نه؟ ─── */
            const desktopTitles = new Set<string>();
            for (const t of this.desktopStore.getAll()) {
                desktopTitles.add(t.title);
            }

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
    private getFromPatternSuggestions(seen: Set<string>): SmartSuggestion[] {
        const result: SmartSuggestion[] = [];

        try {
            const cutoff = Date.now() - PATTERN_WINDOW_DAYS * 24 * 60 * 60 * 1000;

            const recentCompleted = this.desktopStore
                .getAll()
                .filter(t => {
                    if (!t.completed) return false;
                    const ts = t.completed_ts || t.created_ts;
                    return ts >= cutoff;
                });

            const titleCount = new Map<string, { count: number; task: typeof recentCompleted[0] }>();
            for (const t of recentCompleted) {
                const existing = titleCount.get(t.title);
                if (existing) {
                    existing.count++;
                } else {
                    titleCount.set(t.title, { count: 1, task: t });
                }
            }

            const patterns = Array.from(titleCount.entries())
                .filter(([_, data]) => data.count >= PATTERN_MIN_OCCURRENCES)
                .sort((a, b) => b[1].count - a[1].count);

            for (const [title, data] of patterns) {
                if (seen.has(title)) continue;

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
                break;
            }
        } catch (e) {
            console.warn('[First Task] from_pattern failed:', e);
        }

        return result;
    }

    /* ═══════════════════════════════════════════════════════
       ۳️⃣ from_old_task — تسک قدیمی (۷+ روزه)
       ═══════════════════════════════════════════════════════ */
    private getFromOldTaskSuggestions(seen: Set<string>): SmartSuggestion[] {
        const result: SmartSuggestion[] = [];

        try {
            /* ─── باید ۱۴+ روز از آخرین تغییرش گذشته باشه ─── */
            const oldCutoff = Date.now() - OLD_TASK_DAYS * 24 * 60 * 60 * 1000;

            const oldPending = this.desktopStore
                .getPending()
                .filter(t => {
                    /* 🆕 زمان مؤثر = جدیدترین زمان (created یا modified) */
                    const effectiveTs = Math.max(
                        t.created_ts || 0,
                        t.modified_ts || 0
                    );
                    /* باید قدیمی‌تر از ۱۴ روز باشه */
                    return effectiveTs > 0 && effectiveTs <= oldCutoff;
                })
                .sort((a, b) => {
                    const ta = Math.max(a.created_ts || 0, a.modified_ts || 0);
                    const tb = Math.max(b.created_ts || 0, b.modified_ts || 0);
                    return ta - tb;
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
                break;
            }
        } catch (e) {
            console.warn('[First Task] from_old_task failed:', e);
        }

        return result;
    }

    /* ═══════════════════════════════════════════════════════
       ۴️⃣ random_pick — 🆕 fix باگ
       فقط تسک‌هایی که حداقل ۷ روز از آخرین تغییرشون گذشته
       ═══════════════════════════════════════════════════════ */
    private getRandomPickSuggestions(seen: Set<string>): SmartSuggestion[] {
        const result: SmartSuggestion[] = [];

        try {
            /* 🆕 cut-off: ۷ روز پیش */
            const recentCutoff = Date.now() - SKIP_RECENT_DAYS * 24 * 60 * 60 * 1000;

            const candidates = this.desktopStore
                .getPending()
                .filter(t => {
                    /* بدون تاریخ انجام */
                    if (t.due_date_ts) return false;
                    /* عنوان داشته باشه */
                    if (t.title.length === 0) return false;

                    /* 🆕 مهم‌ترین چک: آخرین تغییر باید ۷+ روز پیش باشه */
                    const effectiveTs = Math.max(
                        t.created_ts || 0,
                        t.modified_ts || 0
                    );
                    if (effectiveTs === 0) return false;
                    if (effectiveTs > recentCutoff) return false;

                    return true;
                });

            /* ─── فیلتر تکراری‌ها ─── */
            const unique = candidates.filter(t => !seen.has(t.title));
            if (unique.length === 0) return result;

            /* ─── انتخاب deterministic بر اساس روز ─── */
            const daySeed = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
            const pick = unique[daySeed % unique.length];

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
