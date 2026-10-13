/* ════════════════════════════════════════════════════════════
   🔍 استخراج‌کننده تسک — v0.1.2
   ✅ پشتیبانی از عنوان تکراری (occurrence)
   ✅ ID یکتا برای هر تسک
   ════════════════════════════════════════════════════════════ */

import type { ExtractedTask } from '../types';
import { generateTaskId } from '../utils/hash';

const TASK_REGEX = /^\s*[-*+]\s+\[([ xX])\]\s+(.+?)\s*$/;

export class TaskExtractor {
    /* ═══════════════════════════════════════════════════════
       استخراج تسک‌ها (با شمارش occurrence)
       ═══════════════════════════════════════════════════════ */
    extractFromContent(content: string, sourceFile: string): ExtractedTask[] {
        if (!content) return [];

        const tasks: ExtractedTask[] = [];
        const lines = content.split('\n');
        const occurrenceMap = new Map<string, number>();

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.indexOf('[') === -1) continue;

            const match = TASK_REGEX.exec(line);
            if (!match) continue;

            const completed = match[1].toLowerCase() === 'x';
            const title = match[2].trim();
            if (!title) continue;

            /* 🆕 شماره تکرار این عنوان توی فایل */
            const occurrence = occurrenceMap.get(title) || 0;
            occurrenceMap.set(title, occurrence + 1);

            const id = generateTaskId(sourceFile, title, occurrence);

            tasks.push({
                title,
                completed,
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
                _id: id,
                _source_file: sourceFile,
                _source_line: i,
                _occurrence: occurrence,
            });
        }

        return tasks;
    }

    /* ═══════════════════════════════════════════════════════
       پیدا کردن شماره خط بر اساس ID (با occurrence)
       ═══════════════════════════════════════════════════════ */
    findTaskLine(content: string, sourceFile: string, targetId: string): number {
        const lines = content.split('\n');
        const occurrenceMap = new Map<string, number>();

        for (let i = 0; i < lines.length; i++) {
            const match = TASK_REGEX.exec(lines[i]);
            if (!match) continue;
            const title = match[2].trim();
            const occurrence = occurrenceMap.get(title) || 0;
            occurrenceMap.set(title, occurrence + 1);

            const id = generateTaskId(sourceFile, title, occurrence);
            if (id === targetId) return i;
        }
        return -1;
    }

    /* ═══════════════════════════════════════════════════════
       تغییر وضعیت انجام
       ═══════════════════════════════════════════════════════ */
    toggleTaskInContent(
        content: string,
        sourceFile: string,
        targetId: string
    ): string | null {
        const lineIndex = this.findTaskLine(content, sourceFile, targetId);
        if (lineIndex === -1) return null;

        const lines = content.split('\n');
        const line = lines[lineIndex];
        const match = TASK_REGEX.exec(line);
        if (!match) return null;

        const currentlyCompleted = match[1].toLowerCase() === 'x';
        const newMark = currentlyCompleted ? ' ' : 'x';

        lines[lineIndex] = line.replace(/\[([ xX])\]/, `[${newMark}]`);
        return lines.join('\n');
    }

    /* ═══════════════════════════════════════════════════════
       افزودن تسک جدید
       ═══════════════════════════════════════════════════════ */
    addTaskToContent(content: string, title: string): { content: string; line: number } {
        const lines = content.split('\n');
        const newTask = `- [ ] ${title}`;

        if (lines.length === 1 && lines[0].trim() === '') {
            return { content: newTask + '\n', line: 0 };
        }

        if (lines[lines.length - 1].trim() === '') {
            lines.splice(lines.length - 1, 0, newTask);
            return { content: lines.join('\n'), line: lines.length - 2 };
        }

        lines.push(newTask);
        return { content: lines.join('\n'), line: lines.length - 1 };
    }

    /* ═══════════════════════════════════════════════════════
       حذف تسک
       ═══════════════════════════════════════════════════════ */
    removeTaskFromContent(
        content: string,
        sourceFile: string,
        targetId: string
    ): string | null {
        const lineIndex = this.findTaskLine(content, sourceFile, targetId);
        if (lineIndex === -1) return null;

        const lines = content.split('\n');
        lines.splice(lineIndex, 1);
        return lines.join('\n');
    }
}
