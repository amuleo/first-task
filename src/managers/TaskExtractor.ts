/* ════════════════════════════════════════════════════════════
   🔍 استخراج‌کننده تسک از markdown
   ✅ پشتیبانی از -، *، + به عنوان بولت
   ✅ پشتیبانی از [ ]، [x]، [X]
   ✅ فقط عنوان + وضعیت انجام (باقی از ایندکس)
   ════════════════════════════════════════════════════════════ */

import type { ExtractedTask } from '../types';
import { generateTaskId } from '../utils/hash';

/* الگوی استخراج تسک */
const TASK_REGEX = /^\s*[-*+]\s+\[([ xX])\]\s+(.+?)\s*$/;

export class TaskExtractor {
    /* ═══════════════════════════════════════════════════════
       📥 استخراج تسک‌ها از محتوای یه فایل
       ═══════════════════════════════════════════════════════ */
    extractFromContent(content: string, sourceFile: string): ExtractedTask[] {
        if (!content) return [];

        const tasks: ExtractedTask[] = [];
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            /* ─── فیلتر سریع: خط باید `[ ]` یا `[x]` داشته باشه ─── */
            if (line.indexOf('[') === -1) continue;

            const match = TASK_REGEX.exec(line);
            if (!match) continue;

            const completed = match[1].toLowerCase() === 'x';
            const title = match[2].trim();

            /* ─── رد کردن تسک‌های خالی ─── */
            if (!title) continue;

            const id = generateTaskId(sourceFile, title);

            tasks.push({
                title,
                completed,
                /* ─── اینا بعداً از ایندکس پر می‌شن ─── */
                description: '',
                due_date_iso: '',
                category: '',
                pinned: false,
                /* ─── متادیتا ─── */
                _id: id,
                _source_file: sourceFile,
                _source_line: i,
            });
        }

        return tasks;
    }

    /* ═══════════════════════════════════════════════════════
       🎯 پیدا کردن عنوان تسک توی یه خط خاص
       (برای تغییر وضعیت انجام/انجام نشده)
       ═══════════════════════════════════════════════════════ */
    extractFromLine(line: string): { title: string; completed: boolean } | null {
        const match = TASK_REGEX.exec(line);
        if (!match) return null;

        const completed = match[1].toLowerCase() === 'x';
        const title = match[2].trim();

        if (!title) return null;

        return { title, completed };
    }

    /* ═══════════════════════════════════════════════════════
       🆔 پیدا کردن شماره خط تسک با شناسه
       (وقتی کاربر یه تسک رو توی پنل انجام‌شده/نشده می‌کنه)
       ═══════════════════════════════════════════════════════ */
    findTaskLine(content: string, sourceFile: string, targetId: string): number {
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const result = this.extractFromLine(lines[i]);
            if (!result) continue;

            const id = generateTaskId(sourceFile, result.title);
            if (id === targetId) {
                return i;
            }
        }
        return -1;
    }

    /* ═══════════════════════════════════════════════════════
       ✏️ تغییر وضعیت تسک توی محتوای فایل
       → محتوای جدید رو برمی‌گردونه
       ═══════════════════════════════════════════════════════ */
    toggleTaskInContent(
        content: string,
        sourceFile: string,
        targetId: string
    ): string | null {
        const lines = content.split('\n');
        const lineIndex = this.findTaskLine(content, sourceFile, targetId);

        if (lineIndex === -1) return null;

        const line = lines[lineIndex];
        const match = TASK_REGEX.exec(line);
        if (!match) return null;

        const currentlyCompleted = match[1].toLowerCase() === 'x';
        const newMark = currentlyCompleted ? ' ' : 'x';

        /* ─── جایگزینی فقط `[ ]` → `[x]` یا برعکس ─── */
        lines[lineIndex] = line.replace(
            /\[([ xX])\]/,
            `[${newMark}]`
        );

        return lines.join('\n');
    }

    /* ═══════════════════════════════════════════════════════
       📝 افزودن تسک جدید به محتوا
       → محتوای جدید + شماره خط رو برمی‌گردونه
       ═══════════════════════════════════════════════════════ */
    addTaskToContent(
        content: string,
        title: string
    ): { content: string; line: number } {
        const lines = content.split('\n');
        const newTask = `- [ ] ${title}`;

        /* ─── اگه فایل خالیه ─── */
        if (lines.length === 1 && lines[0].trim() === '') {
            return { content: newTask + '\n', line: 0 };
        }

        /* ─── اگه خط آخر خالیه، قبلش اضافه کن ─── */
        if (lines[lines.length - 1].trim() === '') {
            lines.splice(lines.length - 1, 0, newTask);
            return { content: lines.join('\n'), line: lines.length - 2 };
        }

        /* ─── وگرنه آخر اضافه کن ─── */
        lines.push(newTask);
        return { content: lines.join('\n'), line: lines.length - 1 };
    }
}
