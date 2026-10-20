import type { Catalog, Progress, Question } from './types';
import { Loading, RichText, useLearning } from './learning-ui';
import { formatSeconds } from './Timer';
import { reviewAnswer } from './session-review';

function SubjectReview({ name, questions, progress, durations, open }: {
  name: string; questions: Question[]; progress: Progress; durations: Record<string, number>; open: (id: string) => void;
}) {
  const { data, error } = useLearning(questions[0].subjectId);
  if (!data) return <Loading error={error}/>;
  const rows = questions.map(q => {
    const solution = data.solutions.find(s => s.questionId === q.id);
    return { q, review: solution && reviewAnswer(q, solution, progress.drafts[q.id] ?? '', progress.checks[q.id] ?? []) };
  });
  const answered = rows.filter(row => row.review?.answered).length;
  const automatic = rows.filter(row => row.review?.automatic !== null && row.review?.automatic !== undefined);
  return <section className="paper learning-paper session-review"><h2>{name}・{questions[0].year}年度</h2>
    <p>答案入力あり {answered}/{questions.length}設問{automatic.length > 0 && ` ／ 最終結果の一致 ${automatic.filter(row => row.review?.automatic).length}/${automatic.length}設問`}</p>
    <p className="footnote">文字数と指定語句は入力した答案を確認します。途中式、図、説明の妥当性は各設問の確認項目で自己評価してください。</p>
    <ol className="session-review-list">{rows.map(({ q, review }) => <li key={q.id}>
      <button className="text-link" onClick={() => open(q.id)}>{q.number}：{q.title} →</button>
      <div className="session-review-meta"><span>{review?.answered ? '答案入力あり' : '答案未入力'}</span><span>今回の計測：{durations[q.id] === undefined ? '未計測' : formatSeconds(durations[q.id])}</span>
        {review?.answered && <span>{review.automatic === null ? '答案例で自己評価' : review.automatic ? '最終結果が一致' : '最終結果を再確認'}</span>}</div>
      {!review ? <p role="alert">解説が見つかりませんでした。</p> : <>
        {review.missingRequirements.length > 0 && <ul className="weak">{review.missingRequirements.map(text => <li key={text}>{text}</li>)}</ul>}
        <details><summary>未確認の答案要素：{review.unchecked.length}項目</summary>
          {review.unchecked.length ? <ul>{review.unchecked.map((text, i) => <li key={i}><RichText>{text}</RichText></li>)}</ul> : <p>すべての項目を自己確認しました。</p>}
        </details>
      </>}
    </li>)}</ol>
  </section>;
}

export default function SessionReview({ catalog, questions, progress, durations, open }: {
  catalog: Catalog; questions: Question[]; progress: Progress; durations: Record<string, number>; open: (id: string) => void;
}) {
  const subjects = [...new Set(questions.map(q => q.subjectId))];
  return <>{subjects.map(id => <SubjectReview key={id} name={catalog.subjects.find(s => s.subjectId === id)!.name}
    questions={questions.filter(q => q.subjectId === id)} progress={progress} durations={durations} open={open}/>)}</>;
}
