import { useRef, useState } from 'react';
import type { Catalog, Progress, Question } from './types';
import { Heading, Loading, useLearning } from './learning-ui';
import type { SetProgress } from './learning-ui';
import Timer, { formatSeconds } from './Timer';
import { PracticeBody } from './Practice';
function SessionQuestion({q,progress,setProgress,revealed}:{q:Question;progress:Progress;setProgress:SetProgress;revealed:boolean}) {
  const {data,error}=useLearning(q.subjectId);
  if(!data)return <Loading error={error}/>;
  const solution=data.solutions.find(s=>s.questionId===q.id);
  return solution?<PracticeBody question={q} solution={solution} progress={progress} setProgress={setProgress} revealed={revealed}/>:<Loading error="解説が見つかりません"/>;
}
export default function Session({catalog,progress,setProgress,route}:{catalog:Catalog;progress:Progress;setProgress:SetProgress;route:string}) {
  const initial=new URLSearchParams(route.split('?')[1]).get('subject');
  const [selected,setSelected]=useState<string[]>(initial&&catalog.subjects.some(s=>s.subjectId===initial)?[initial]:progress.selected.length?progress.selected:[catalog.subjects[0].subjectId]);
  const [years,setYears]=useState<Record<string,number>>(() => Object.fromEntries(catalog.subjects.map(s=>[s.subjectId,Math.max(...s.availableYears)])));
  const [questions,setQuestions]=useState<Question[]>([]);
  const [index,setIndex]=useState(0);
  const [finished,setFinished]=useState(false);
  const elapsed=useRef(0);
  const switchedAt=useRef(0);
  const [total,setTotal]=useState(0);
  const saveCurrent=(seconds:number)=>{
    const q=questions[index]; if(!q)return;
    const duration=Math.max(0,seconds-switchedAt.current);
    if(duration>0)setProgress(p=>({...p,durations:{...p.durations,[q.id]:(visited.current[q.id]??0)+duration}}));
  };
  const visited=useRef<Record<string,number>>({});
  const move=(next:number)=>{const q=questions[index];const duration=Math.max(0,elapsed.current-switchedAt.current);if(!finished){visited.current[q.id]=(visited.current[q.id]??0)+duration;setProgress(p=>({...p,durations:{...p.durations,[q.id]:visited.current[q.id]}}));switchedAt.current=elapsed.current;}setIndex(next);window.scrollTo(0,0);};
  if(!questions.length)return <><Heading label="TIMED PRACTICE SET" title="練習セットの設定" description="1〜4科目を選び、原本のまとまりで答案づくりと時間配分を練習します。"/><section className="paper learning-paper"><h2>科目と収録年度</h2><div className="session-builder">{catalog.subjects.map(s=><div key={s.subjectId}><label><input type="checkbox" checked={selected.includes(s.subjectId)} disabled={!selected.includes(s.subjectId)&&selected.length>=4} onChange={()=>setSelected(x=>x.includes(s.subjectId)?x.filter(id=>id!==s.subjectId):[...x,s.subjectId])}/>{s.name}</label><label><span className="sr-only">{s.name}の収録年度</span><select disabled={!selected.includes(s.subjectId)} value={years[s.subjectId]} onChange={e=>setYears(y=>({...y,[s.subjectId]:Number(e.target.value)}))}>{s.availableYears.map(y=><option key={y} value={y}>{y}年度</option>)}</select></label></div>)}</div><p className="footnote">科目ごとに収録されている年度が異なります。年度混在のセットは練習用で、実際の1回の試験を再現するものではありません。</p><button className="button" disabled={!selected.length} onClick={()=>setQuestions(selected.flatMap(id=>catalog.questions.filter(q=>q.subjectId===id&&q.year===years[id])))}>選んだ条件で練習する →</button></section></>;
  const q=questions[index];
  return <><Heading label="PRACTICE SESSION" title={finished?'演習結果と解説':'年度別の過去問演習'} description={selected.map(id=>`${catalog.subjects.find(s=>s.subjectId===id)?.name} ${years[id]}年度`).join(' ／ ')}/>{!finished?<Timer onTick={n=>{elapsed.current=n;}} onSave={saveCurrent} onFinish={()=>{saveCurrent(elapsed.current);setTotal(elapsed.current);setFinished(true);}}/>:<div className="paper"><h2>練習終了：{formatSeconds(total)}</h2><p>{questions.length}設問の練習セットです。以下から各答案の解説と確認項目を見直せます。</p><p>最終結果の自動確認と答案の自己評価は別に記録します。判明していない配点を補って総得点を計算することはありません。</p></div>}<div className="session-navigation"><button className="button secondary" disabled={index===0} onClick={()=>move(index-1)}>前の設問</button><label>設問<select aria-label="練習セットの設問" value={index} onChange={e=>move(Number(e.target.value))}>{questions.map((q,i)=><option key={q.id} value={i}>{i+1}. {q.year} {q.number} {q.title}</option>)}</select></label><span>{index+1}/{questions.length}</span><button className="button secondary" disabled={index===questions.length-1} onClick={()=>move(index+1)}>次の設問</button></div><SessionQuestion key={q.id} q={q} progress={progress} setProgress={setProgress} revealed={finished}/>{finished&&<a className="button" href="#/review">復習ノートへ →</a>}</>;
}
