import type { Catalog, Progress, Topic } from './types.ts';
export interface Recommendation { subjectId: string; title: string; reason: string; href: string }
export function recommend(catalog: Catalog, progress: Progress): Recommendation[] {
  return progress.selected.map(id => {
    const subject = catalog.subjects.find(s => s.subjectId === id)!;
    const latest = Math.max(...subject.availableYears);
    const compare = (a: Topic, b: Topic) => Number(b.prerequisite) - Number(a.prerequisite) || b.appearanceYears / b.availableYears - a.appearanceYears / a.availableYears || Number(b.years.includes(latest)) - Number(a.years.includes(latest)) || a.id.localeCompare(b.id);
    const topics = [...subject.topics].sort(compare);
    const weak = topics.find(t => progress.quizAttempts[`${t.id}-c1`]?.correct === false);
    if (weak) return { subjectId: id, title: weak.name, reason: '基礎診断で再確認が必要。要点と例題を確認して再テストへ。', href: `#/learn/${weak.id}` };
    for (const status of ['review', 'unstarted']) for (const t of topics) {
      const q = catalog.questions.filter(q => q.subjectId === id && q.topics.includes(t.id) && (progress.statuses[q.id] ?? 'unstarted') === status).sort((a,b) => b.year-a.year || a.id.localeCompare(b.id))[0];
      if (q) return { subjectId: id, title: q.title, reason: `${status === 'review' ? '復習の記録があります' : '未着手の設問です'}。関連テーマは${t.appearanceYears}/${t.availableYears}年で出題${t.prerequisite ? 'し、基礎にもつながります' : 'しています'}。`, href: `#/practice/${q.id}` };
    }
    return { subjectId: id, title: '条件を変えて再確認', reason: '全設問に理解の記録があります。基礎の再テストで応用を確認しましょう。', href: `#/learn/${topics[0].id}` };
  });
}
