import type { Progress, Status } from './types.ts';
export const LEGACY_STORAGE_KEY = 'jitsuryoku-note:v1';
export const PREVIOUS_STORAGE_KEY = 'jitsuryoku-note:v2';
export const STORAGE_KEY = 'jitsuryoku-note:v3';
export const emptyProgress = (): Progress => ({ version: 3, selected: [], statuses: {}, favorites: [], drafts: {}, notes: {}, quizAttempts: {}, selfAssessments: {}, checks: {}, durations: {} });
const statuses: Status[] = ['unstarted', 'review', 'understood'];
export function validateProgress(input: unknown, subjects: Set<string>, questions: Set<string>, quizIds?: Set<string>, selfCheckIds?: Set<string>): Progress {
  if (!input || typeof input !== 'object') throw new Error('バックアップの形式が正しくありません。');
  const p = input as Record<string, unknown>;
  if (p.version !== 1 && p.version !== 2 && p.version !== 3) throw new Error('対応していないバックアップのバージョンです。');
  if (!Array.isArray(p.selected) || p.selected.length > 4 || !p.selected.every(id => typeof id === 'string' && subjects.has(id)) || new Set(p.selected).size !== p.selected.length) throw new Error('選択科目が正しくありません。');
  if (!Array.isArray(p.favorites) || !p.favorites.every(id => typeof id === 'string' && questions.has(id))) throw new Error('お気に入りの問題IDが正しくありません。');
  if (!p.statuses || typeof p.statuses !== 'object' || Array.isArray(p.statuses) || !p.drafts || typeof p.drafts !== 'object' || Array.isArray(p.drafts)) throw new Error('学習記録の形式が正しくありません。');
  for (const [id, status] of Object.entries(p.statuses)) if (!questions.has(id) || !statuses.includes(status as Status)) throw new Error('復習状況が正しくありません。');
  for (const [id, draft] of Object.entries(p.drafts)) if (!questions.has(id) || typeof draft !== 'string' || draft.length > 10000) throw new Error('メモの形式が正しくありません。');
  const result: Progress = { ...emptyProgress(), selected: [...p.selected] as string[], statuses: { ...p.statuses } as Record<string, Status>, favorites: [...new Set(p.favorites)] as string[], drafts: { ...p.drafts } as Record<string, string> };
  if (p.version === 1) return result;
  const isRecord = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
  if (!isRecord(p.quizAttempts) || !isRecord(p.checks) || !isRecord(p.durations)) throw new Error('追加の学習記録が正しくありません。');
  for (const [id, a] of Object.entries(p.quizAttempts)) {
    if ((quizIds && !quizIds.has(id)) || !isRecord(a) || typeof a.correct !== 'boolean' || typeof a.attemptedAt !== 'string' || !Number.isFinite(Date.parse(a.attemptedAt)) || !(typeof a.answer === 'string' && a.answer.length <= 10000 || Array.isArray(a.answer) && a.answer.length <= 100 && a.answer.every(x => typeof x === 'string' && x.length <= 1000))) throw new Error('テストの記録が正しくありません。');
    result.quizAttempts[id] = { answer: a.answer as string | string[], correct: a.correct, attemptedAt: a.attemptedAt };
  }
  for (const [id, checks] of Object.entries(p.checks)) {
    if (!questions.has(id) || !Array.isArray(checks) || checks.length > 100 || !checks.every(n => Number.isInteger(n) && n >= 0 && n < 100)) throw new Error('答案の確認項目が正しくありません。');
    result.checks[id] = [...new Set(checks)] as number[];
  }
  for (const [id, seconds] of Object.entries(p.durations)) {
    if (!questions.has(id) || typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0 || seconds > 604800) throw new Error('所要時間が正しくありません。');
    result.durations[id] = seconds;
  }
  if (p.version === 3) {
    if (!isRecord(p.notes) || !isRecord(p.selfAssessments)) throw new Error('メモまたは自己評価の形式が正しくありません。');
    for (const [id, note] of Object.entries(p.notes)) {
      if (!questions.has(id) || typeof note !== 'string' || note.length > 10000) throw new Error('復習メモが正しくありません。');
      result.notes[id] = note;
    }
    for (const [id, value] of Object.entries(p.selfAssessments)) {
      if ((selfCheckIds && !selfCheckIds.has(id)) || !isRecord(value) || typeof value.answer !== 'string' || value.answer.length > 10000 || !Array.isArray(value.checks) || value.checks.length > 100 || !value.checks.every(n => Number.isInteger(n) && n >= 0 && n < 100) || !['review','understood'].includes(String(value.result)) || typeof value.attemptedAt !== 'string' || !Number.isFinite(Date.parse(value.attemptedAt))) throw new Error('自己評価の記録が正しくありません。');
      result.selfAssessments[id] = { answer: value.answer, checks: [...new Set(value.checks)] as number[], result: value.result as 'review'|'understood', attemptedAt: value.attemptedAt };
    }
  }
  return result;
}
export function toggleSubject(progress: Progress, id: string): Progress {
  if (progress.selected.includes(id)) return { ...progress, selected: progress.selected.filter(x => x !== id) };
  if (progress.selected.length === 4) throw new Error('4科目を選択済みです。入れ替える科目の選択を外してください。');
  return { ...progress, selected: [...progress.selected, id] };
}
export function characterCount(text: string): number { return [...text.replace(/\s/g, '')].length; }
