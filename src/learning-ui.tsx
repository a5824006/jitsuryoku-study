import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import type { Exercise, LearningSubject, Progress, Quiz, SelfCheck, WorkedExample } from './types';
import { gradeQuiz } from './grading';

export type SetProgress = Dispatch<SetStateAction<Progress>>;
const cache = new Map<string, LearningSubject>();
export function useLearning(subjectId: string | undefined) {
  const [data, setData] = useState<LearningSubject | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setData(null); setError('');
    if (!subjectId) return;
    if (cache.has(subjectId)) { setData(cache.get(subjectId)!); return; }
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}data/learning/${subjectId}.json`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error('教材を読み込めませんでした。再読込してください。'); return r.json(); })
      .then((d: LearningSubject) => { cache.set(subjectId, d); setData(d); })
      .catch(e => { if (e.name !== 'AbortError') setError(e.message); });
    return () => controller.abort();
  }, [subjectId]);
  return { data, error };
}
export function Heading({ title, description }: { title: string; description: string }) {
  return <div className="page-heading"><h1>{title}</h1><p>{description}</p></div>;
}
export function Dialog({ children, close, title }: { children: React.ReactNode; close: () => void; title: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog className="reading-dialog" ref={ref} onCancel={close}><div className="dialog-bar"><h2>{title}</h2><button className="button secondary" autoFocus onClick={close}>閉じる</button></div>{children}</dialog>;
}
export function RichText({ children, zoomable = true }: { children: string; zoomable?: boolean }) {
  const [zoom, setZoom] = useState(false);
  return <div className="learning-text"><Markdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[[rehypeKatex, { strict: false, trust: false }]]}>{children}</Markdown>{zoomable && children.includes('$') && <button className="text-link math-zoom" onClick={() => setZoom(true)}>数式を拡大して読む ↗</button>}{zoom && <Dialog title="数式と説明" close={() => setZoom(false)}><div className="zoom-text"><RichText zoomable={false}>{children}</RichText></div></Dialog>}</div>;
}
export function Diagram({ src, alt }: { src: string; alt: string }) {
  const [zoom, setZoom] = useState(false);
  const source = `${import.meta.env.BASE_URL}${src.replace(/^\//, '')}`;
  return <figure className="learning-diagram"><img src={source} alt={alt}/><figcaption>{alt}</figcaption><button className="text-link" onClick={() => setZoom(true)}>図を拡大する ↗</button>{zoom && <Dialog title="図の拡大" close={() => setZoom(false)}><img src={source} alt={alt}/></Dialog>}</figure>;
}
export function QuizCard({ quiz, progress, setProgress }: { quiz: Quiz; progress: Progress; setProgress: SetProgress }) {
  const stored = progress.quizAttempts[quiz.id];
  const [answer, setAnswer] = useState<string | string[]>(quiz.kind === 'multiple-choice' ? [] : '');
  const [result, setResult] = useState<boolean | null>(null);
  const isChoice = quiz.kind === 'choice' || quiz.kind === 'multiple-choice';
  const edit = (value: string | string[]) => { setAnswer(value); setResult(null); };
  const submit = () => {
    const correct = gradeQuiz(quiz, answer); setResult(correct);
    setProgress(p => ({ ...p, quizAttempts: { ...p.quizAttempts, [quiz.id]: { answer, correct, attemptedAt: new Date().toISOString() } } }));
  };
  const correctAnswer = isChoice ? quiz.options?.filter(o => quiz.correctOptions?.includes(o.id)).map(o => o.label).join(' / ') : quiz.kind === 'number' ? String(quiz.numericAnswer) : quiz.acceptedAnswers?.join(' / ');
  return <section className="quiz-card">{stored&&<p className="footnote">保存した結果：{stored.correct?'確認できた':'再確認する'}（答えは隠しています）</p>}<RichText>{quiz.prompt}</RichText>{isChoice ? <fieldset className="quiz-options"><legend className="sr-only">回答を選択</legend>{quiz.options?.map(o => <label key={o.id}><input type={quiz.kind === 'multiple-choice' ? 'checkbox' : 'radio'} name={quiz.id} value={o.id} checked={Array.isArray(answer) ? answer.includes(o.id) : answer === o.id} onChange={() => edit(quiz.kind === 'multiple-choice' ? (Array.isArray(answer) && answer.includes(o.id) ? answer.filter(x => x !== o.id) : [...(Array.isArray(answer) ? answer : []), o.id]) : o.id)}/><RichText zoomable={false}>{o.label}</RichText></label>)}</fieldset> : <label className="quiz-input">回答<input value={typeof answer === 'string' ? answer : ''} maxLength={10000} inputMode={quiz.kind === 'number' ? 'decimal' : 'text'} onChange={e => edit(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && (typeof answer === 'string' && answer.trim())) submit(); }} placeholder={quiz.kind === 'bits' ? '先頭の0も含めて入力' : quiz.kind === 'number' ? '単位を除いた数値' : '思い出して入力'}/></label>}<button className="button" disabled={Array.isArray(answer) ? !answer.length : !answer.trim()} onClick={submit}>回答を確認</button>{result !== null && <div className={`quiz-feedback ${result ? 'correct' : 'incorrect'}`} role="status"><strong>{result ? '✓ 確認できました' : 'もう一度、基礎を確認しましょう'}</strong><p>確認用の答え</p><RichText>{correctAnswer ?? ''}</RichText><RichText>{quiz.explanation}</RichText><p className="pitfall">間違えやすい点：{quiz.pitfall}</p><button className="text-link" onClick={() => { setResult(null); setAnswer(quiz.kind === 'multiple-choice' ? [] : ''); }}>答えを隠してもう一度</button></div>}</section>;
}
export function Loading({ error }: { error?: string }) { return <div className="empty" role={error ? 'alert' : 'status'}>{error || '教材を読み込んでいます…'}{error && <button className="button secondary" onClick={() => location.reload()}>再読込</button>}</div>; }

export function ExampleCard({ example, index }: { example: WorkedExample; index: number }) {
  return <section className="paper learning-paper"><h2>例題 {index+1}</h2><RichText>{example.prompt}</RichText>
    <details><summary>解き方と解答を確認する</summary><ol>{example.steps.map((step,i)=><li key={i}><RichText>{step}</RichText></li>)}</ol><div className="answer-box"><RichText>{example.answer}</RichText></div>{example.diagram&&<Diagram {...example.diagram}/>}</details>
  </section>;
}

function SelfCheckCard({ exercise: q, progress, setProgress }: { exercise: SelfCheck; progress: Progress; setProgress: SetProgress }) {
  const previous=progress.selfAssessments[q.id];
  const [answer,setAnswer]=useState('');
  const [revealed,setRevealed]=useState(false);
  const [checks,setChecks]=useState<number[]>([]);
  const [saved,setSaved]=useState(false);
  const assess=(result:'review'|'understood')=>{setProgress(p=>({...p,selfAssessments:{...p.selfAssessments,[q.id]:{answer,checks,result,attemptedAt:new Date().toISOString()}}}));setSaved(true);};
  return <section className="quiz-card"><p className="footnote">独自の練習問題・自己評価{previous?` ／ 保存した自己評価：${previous.result==='understood'?'説明できた':'再確認する'}`:''}</p><RichText>{q.prompt}</RichText>
    <label className="draft-label">自分の説明と途中式（図は紙に描いて確認できます）<textarea value={answer} maxLength={10000} disabled={revealed} onChange={e=>setAnswer(e.target.value)}/></label>
    {!revealed?<><button className="button" onClick={()=>setRevealed(true)}>答案例と確認項目を開く</button>{previous?.answer&&<button className="text-link" onClick={()=>setAnswer(previous.answer)}>前回の自分の答案を使う</button>}</>:<div className="quiz-feedback"><h3>答案例</h3><RichText>{q.answer}</RichText>{q.englishAnswer&&<><h3>英語の答案例</h3><RichText>{q.englishAnswer}</RichText></>}<details><summary>関連する説明</summary><RichText>{q.explanation}</RichText></details><div className="answer-checklist">{q.checklist.map((text,i)=><label key={i}><input type="checkbox" checked={checks.includes(i)} onChange={()=>{setChecks(values=>values.includes(i)?values.filter(n=>n!==i):[...values,i]);setSaved(false);}}/><RichText>{text}</RichText></label>)}</div><p>{q.pitfall}</p>
      <div className="lane-actions"><button className="button secondary" onClick={()=>assess('review')}>再確認する</button><button className="button" disabled={checks.length!==q.checklist.length} onClick={()=>assess('understood')}>説明できた</button></div>{saved&&<p role="status">自己評価を記録しました。</p>}<button className="text-link" onClick={()=>{setRevealed(false);setAnswer('');setChecks([]);setSaved(false);}}>答案例を隠して解き直す</button>
    </div>}
  </section>;
}

export function ExerciseCard({ exercise, progress, setProgress }: { exercise: Exercise; progress: Progress; setProgress: SetProgress }) {
  return <div id={`exercise-${exercise.id}`} className="exercise-anchor">{exercise.kind==='self-check'?<SelfCheckCard key={exercise.id} exercise={exercise} progress={progress} setProgress={setProgress}/>:<QuizCard key={exercise.id} quiz={exercise} progress={progress} setProgress={setProgress}/>}</div>;
}
