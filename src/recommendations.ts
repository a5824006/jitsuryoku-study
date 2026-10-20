import type { Catalog, Progress, Topic } from './types.ts';
import { needsReview } from './learning-state.ts';
export interface Recommendation { subjectId: string; title: string; reason: string; href: string }
export function recommend(catalog: Catalog, progress: Progress): Recommendation[] {
  const proposed=new Set<string>();
  return progress.selected.map(id => {
    const subject = catalog.subjects.find(s => s.subjectId === id)!;
    const latest = Math.max(...subject.availableYears);
    const compare = (a: Topic, b: Topic) => Number(b.prerequisite) - Number(a.prerequisite) || b.appearanceYears / b.availableYears - a.appearanceYears / a.availableYears || Number(b.years.includes(latest)) - Number(a.years.includes(latest)) || a.id.localeCompare(b.id);
    const topics = [...subject.topics].sort(compare);
    const relatedFoundation=(topicId:string)=>(catalog.foundations??[]).find(f=>f.id===topicId)?.topicIds.some(t=>subject.topics.some(s=>s.id===t));
    const candidates=(catalog.learningIndex??[]).filter(i=>(i.subjectId===id||i.subjectId==='foundations'&&relatedFoundation(i.topicId))&&!proposed.has(i.id)&&needsReview(i,progress));
    const rankTopic=(topicId:string)=>subject.topics.find(t=>t.id===topicId)??topics.find(t=>(catalog.foundations??[]).find(f=>f.id===topicId)?.topicIds.includes(t.id))!;
    candidates.sort((a,b)=>Number(b.role==='diagnostic')-Number(a.role==='diagnostic')||Number(b.subjectId==='foundations')-Number(a.subjectId==='foundations')||compare(rankTopic(a.topicId),rankTopic(b.topicId))||a.id.localeCompare(b.id));
    const weak=candidates[0];
    if(weak){proposed.add(weak.id);return {subjectId:id,title:weak.title,reason:weak.role==='diagnostic'?'基礎診断に誤答があります。教材を確認し、解き直せます。':weak.subjectId==='foundations'?'この科目の前提になる共通基礎に、再確認の記録があります。':'確認問題または再テストに再確認の記録があります。',href:`#/review?tab=foundations&subject=${weak.subjectId}&item=${weak.id}`};}
    for (const status of ['review', 'unstarted']) for (const t of topics) {
      const q = catalog.questions.filter(q => q.subjectId === id && q.topics.includes(t.id) && (progress.statuses[q.id] ?? 'unstarted') === status).sort((a,b) => b.year-a.year || a.id.localeCompare(b.id))[0];
      if (q) return { subjectId: id, title: q.title, reason: `${status === 'review' ? '復習の記録があります' : '未着手の設問です'}。関連テーマは${t.appearanceYears}/${t.availableYears}年で出題${t.prerequisite ? 'し、基礎にもつながります' : 'しています'}。`, href: `#/practice/${q.id}` };
    }
    return { subjectId: id, title: '条件を変えて再確認', reason: '全設問に理解の記録があります。基礎の再テストで応用を確認しましょう。', href: `#/learn/${topics[0].id}` };
  });
}
