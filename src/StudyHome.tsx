import type { Catalog, Progress } from './types';
import { recommend } from './recommendations';
import { needsReview } from './learning-state';
export default function StudyHome({catalog,progress}:{catalog:Catalog;progress:Progress}) {
  const next=recommend(catalog,progress);
  const scope=(id:string)=>!progress.selected.length||progress.selected.includes(id)||id==='foundations';
  const basic=catalog.learningIndex.filter(i=>scope(i.subjectId)&&needsReview(i,progress)).length;
  const past=catalog.questions.filter(q=>scope(q.subjectId)&&progress.statuses[q.id]==='review').length;
  return <section className="study-home"><div className="learning-lanes"><a href="#/learn"><h2>基礎学習</h2><p>教材、例題、確認問題を開く。</p><b>基礎教材と診断へ →</b></a><a href="#/strategy"><h2>得点対策</h2><p>出題傾向と答案の条件を確認する。</p><b>得点対策と過去問へ →</b></a></div><div className="review-progress"><a href="#/review?tab=foundations">基礎の再確認：{basic}問</a><a href="#/review?tab=past">過去問の復習：{past}設問</a></div><div className="section-heading"><h2>次の学習</h2><a className="text-link" href="#/subjects">受験科目を設定 →</a></div>{next.length?<div className="recommendations">{next.map(r=><a href={r.href} key={r.subjectId}><span>{catalog.subjects.find(s=>s.subjectId===r.subjectId)?.name}</span><h3>{r.title}</h3><p>{r.reason}</p><b>学習へ →</b></a>)}</div>:<div className="paper"><p>受験科目を選ぶと、基礎診断と復習の記録から次の学習を提案します。科目選びの前でも、教材は利用できます。</p></div>}</section>;
}
