import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import type { LearningSubject, Progress, Quiz } from './types';
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
export function Heading({ label, title, description }: { label: string; title: string; description: string }) {
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
  return <section className="quiz-card">{stored&&<p className="footnote">前回の確認：{stored.correct?'確認できた':'再確認する'}（答えは隠しています）</p>}<RichText>{quiz.prompt}</RichText>{isChoice ? <fieldset className="quiz-options"><legend className="sr-only">回答を選択</legend>{quiz.options?.map(o => <label key={o.id}><input type={quiz.kind === 'multiple-choice' ? 'checkbox' : 'radio'} name={quiz.id} value={o.id} checked={Array.isArray(answer) ? answer.includes(o.id) : answer === o.id} onChange={() => edit(quiz.kind === 'multiple-choice' ? (Array.isArray(answer) && answer.includes(o.id) ? answer.filter(x => x !== o.id) : [...(Array.isArray(answer) ? answer : []), o.id]) : o.id)}/><RichText zoomable={false}>{o.label}</RichText></label>)}</fieldset> : <label className="quiz-input">回答<input value={typeof answer === 'string' ? answer : ''} maxLength={10000} inputMode={quiz.kind === 'number' ? 'decimal' : 'text'} onChange={e => edit(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && (typeof answer === 'string' && answer.trim())) submit(); }} placeholder={quiz.kind === 'bits' ? '先頭の0も含めて入力' : quiz.kind === 'number' ? '単位を除いた数値' : '思い出して入力'}/></label>}<button className="button" disabled={Array.isArray(answer) ? !answer.length : !answer.trim()} onClick={submit}>回答を確認</button>{result !== null && <div className={`quiz-feedback ${result ? 'correct' : 'incorrect'}`} role="status"><strong>{result ? '✓ 確認できました' : 'もう一度、基礎を確認しましょう'}</strong><p>確認用の答え</p><RichText>{correctAnswer ?? ''}</RichText><RichText>{quiz.explanation}</RichText><p className="pitfall">間違えやすい点：{quiz.pitfall}</p><button className="text-link" onClick={() => { setResult(null); setAnswer(quiz.kind === 'multiple-choice' ? [] : ''); }}>答えを隠してもう一度</button></div>}</section>;
}
export function Loading({ error }: { error?: string }) { return <div className="empty" role={error ? 'alert' : 'status'}>{error || '教材を読み込んでいます…'}{error && <button className="button secondary" onClick={() => location.reload()}>再読込</button>}</div>; }
