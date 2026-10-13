import type { Progress, Status } from './types.ts';
export const STORAGE_KEY = 'jitsuryoku-note:v1';
export const emptyProgress = (): Progress => ({ version: 1, selected: [], statuses: {}, favorites: [], drafts: {} });
const statuses: Status[] = ['unstarted', 'review', 'understood'];
export function validateProgress(input: unknown, subjects: Set<string>, questions: Set<string>): Progress {
  if (!input || typeof input !== 'object') throw new Error('バックアップの形式が正しくありません。');
  const p = input as Record<string, unknown>;
  if (p.version !== 1) throw new Error('対応していないバックアップのバージョンです。');
  if (!Array.isArray(p.selected) || p.selected.length > 4 || !p.selected.every(id => typeof id === 'string' && subjects.has(id)) || new Set(p.selected).size !== p.selected.length) throw new Error('選択科目が正しくありません。');
  if (!Array.isArray(p.favorites) || !p.favorites.every(id => typeof id === 'string' && questions.has(id))) throw new Error('お気に入りの問題IDが正しくありません。');
  if (!p.statuses || typeof p.statuses !== 'object' || Array.isArray(p.statuses) || !p.drafts || typeof p.drafts !== 'object' || Array.isArray(p.drafts)) throw new Error('学習記録の形式が正しくありません。');
  for (const [id, status] of Object.entries(p.statuses)) if (!questions.has(id) || !statuses.includes(status as Status)) throw new Error('復習状況が正しくありません。');
  for (const [id, draft] of Object.entries(p.drafts)) if (!questions.has(id) || typeof draft !== 'string' || draft.length > 10000) throw new Error('メモの形式が正しくありません。');
  return { version: 1, selected: [...p.selected] as string[], statuses: { ...p.statuses } as Record<string, Status>, favorites: [...new Set(p.favorites)] as string[], drafts: { ...p.drafts } as Record<string, string> };
}
export function toggleSubject(progress: Progress, id: string): Progress {
  if (progress.selected.includes(id)) return { ...progress, selected: progress.selected.filter(x => x !== id) };
  if (progress.selected.length === 4) throw new Error('4科目を選択済みです。入れ替える科目の選択を外してください。');
  return { ...progress, selected: [...progress.selected, id] };
}
export function characterCount(text: string): number { return [...text.replace(/\s/g, '')].length; }
