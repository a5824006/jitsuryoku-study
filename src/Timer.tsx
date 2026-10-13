import { useEffect, useRef, useState } from 'react';
export const formatSeconds = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
export default function Timer({ onFinish, onSave, onTick }: { onFinish: () => void; onSave: (seconds: number) => void; onTick?: (seconds: number) => void }) {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState(0);
  const clock = useRef({ accumulated: 0, startedAt: 0 });
  const callbacks = useRef({ onFinish, onSave, onTick });
  callbacks.current = { onFinish, onSave, onTick };
  const current = () => Math.min(604800, clock.current.accumulated + (clock.current.startedAt ? (Date.now() - clock.current.startedAt) / 1000 : 0));
  const finish = () => {
    const value = current(); clock.current = { accumulated: value, startedAt: 0 }; setSeconds(value); setRunning(false); setDone(true);
    callbacks.current.onTick?.(value); callbacks.current.onSave(value); callbacks.current.onFinish();
  };
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => { const n=current(); setSeconds(n); callbacks.current.onTick?.(n); if (Number(minutes) > 0 && n >= Number(minutes) * 60) finish(); }, 250);
    return () => clearInterval(timer);
  }, [running, minutes]);
  useEffect(() => () => { if (clock.current.accumulated || clock.current.startedAt) callbacks.current.onSave(current()); }, []);
  return <section className="practice-timer" aria-label="演習の時間計測"><div><span className="eyebrow">所要時間</span><strong>{formatSeconds(seconds)}</strong>{minutes && <small> / {minutes}分</small>}</div><label>制限時間（任意、分）<input type="number" min="1" max="1440" disabled={running || seconds > 0 || done} value={minutes} placeholder="制限なし" onChange={e => setMinutes(e.target.value === '' ? '' : String(Math.max(1,Math.min(1440,Number(e.target.value)))))} /></label><div className="timer-actions"><button className="button secondary" disabled={done} onClick={() => { if (running) { clock.current.accumulated=current(); clock.current.startedAt=0; setSeconds(clock.current.accumulated); setRunning(false); } else { clock.current.startedAt=Date.now(); setRunning(true); } }}>{running ? '一時停止' : seconds ? '再開' : '計測開始'}</button><button className="button" disabled={done} onClick={finish}>{done ? '演習終了' : '演習を終了して確認'}</button></div><p className="footnote">この練習の時間です。今年の試験時間は設定されていません。</p></section>;
}
