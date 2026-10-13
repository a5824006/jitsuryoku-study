import type { Catalog, Progress } from './types';
import { recommend } from './recommendations';
export default function StudyHome({catalog,progress}:{catalog:Catalog;progress:Progress}) {
  const next=recommend(catalog,progress);
  return <section className="study-home"><div className="learning-lanes"><a href="#/learn"><h2>基礎を思い出す</h2><p>要点と例題で学び直し、確認テストで知識を使う。</p><b>基礎教材と診断へ →</b></a><a href="#/strategy"><h2>得点対策をする</h2><p>頻出の型を解き、要求に合う答案と時間配分を練習。</p><b>得点対策と過去問へ →</b></a></div><div className="section-heading"><h2>次の学習</h2><a className="text-link" href="#/subjects">受験科目を設定 →</a></div>{next.length?<div className="recommendations">{next.map(r=><a href={r.href} key={r.subjectId}><span>{catalog.subjects.find(s=>s.subjectId===r.subjectId)?.name}</span><h3>{r.title}</h3><p>{r.reason}</p><b>学習へ →</b></a>)}</div>:<div className="paper"><p>受験科目を選ぶと、基礎診断と復習の記録から次の学習を提案します。科目選びの前でも、教材は利用できます。</p></div>}<div className="lane-actions"><a className="text-link" href="#/visualize/coordinates">座標変換を動かして学ぶ →</a><a className="text-link" href="#/visualize/crc">CRCの手順を見る →</a><a className="text-link" href="#/visualize/dijkstra">最短経路を追う →</a></div></section>;
}
