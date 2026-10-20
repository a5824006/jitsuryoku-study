import type { Catalog, Progress } from './types';
import { Heading, Loading, QuizCard, useLearning } from './learning-ui';
import type { SetProgress } from './learning-ui';
export default function Diagnose({ catalog, progress, setProgress, id }: { catalog: Catalog; progress: Progress; setProgress: SetProgress; id?: string }) {
  const subject = catalog.subjects.find(s => s.subjectId === id);
  const { data, error } = useLearning(subject?.subjectId);
  if (!subject) return <div className="empty">科目を選んで診断を始めましょう。<a href="#/learn">基礎教材へ</a></div>;
  if (!data) return <Loading error={error}/>;
  const completed = data.lessons.filter(l => progress.quizAttempts[l.diagnostic.id]);
  const correct = completed.filter(l => progress.quizAttempts[l.diagnostic.id].correct);
  return <><Heading title={`${subject.name}の基礎診断`} description="各テーマから1問。忘れている内容を見つけるための任意のテストです。"/><div className="diagnostic-summary paper"><h2>基礎チェックの結果</h2><p>{correct.length} / {completed.length}問を確認できました（全{data.lessons.length}問）。</p><div className="diagnostic-list">{data.lessons.map(l => { const a=progress.quizAttempts[l.diagnostic.id];return <a key={l.topicId} href={`#/learn/${l.topicId}`}><span className={a?.correct === false ? 'weak' : ''}>{a ? a.correct ? '✓ 確認できた基礎' : '↻ 再確認する基礎' : '○ 未診断'}</span><b>{l.title}</b></a>; })}</div><p className="footnote">各テーマの1問の結果です。過去問の得点や科目全体の習熟度を示すものではありません。</p></div>{data.lessons.map(l => <div key={l.topicId}><h2 className="diagnostic-title">{l.title}</h2><QuizCard quiz={l.diagnostic} progress={progress} setProgress={setProgress}/></div>)}<a className="button" href={`#/learn/${subject.subjectId}`}>確認した基礎を学び直す →</a></>;
}
