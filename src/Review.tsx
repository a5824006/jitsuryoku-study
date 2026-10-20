import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Catalog, Exercise, Foundation, LearningIndexItem, Progress } from './types';
import { ExerciseCard, Heading, Loading, useLearning } from './learning-ui';
import type { SetProgress } from './learning-ui';
import { needsReview } from './learning-state';
const roles={diagnostic:'基礎診断',check:'確認問題',retest:'再テスト'};

function ReviewExercise({item,progress,setProgress}:{item:LearningIndexItem;progress:Progress;setProgress:SetProgress}){
  const {data,error}=useLearning(item.subjectId==='foundations'?undefined:item.subjectId);
  const [foundations,setFoundations]=useState<Foundation[]>([]),[foundationError,setFoundationError]=useState('');
  useEffect(()=>{
    if(item.subjectId!=='foundations')return;
    const controller=new AbortController();
    fetch(import.meta.env.BASE_URL+'data/learning/foundations.json',{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error('補助教材を読み込めませんでした。');return r.json();}).then(d=>setFoundations(d.foundations)).catch(e=>{if(e.name!=='AbortError')setFoundationError(e.message);});
    return()=>controller.abort();
  },[item.subjectId]);
  const lesson=data?.lessons.find(l=>l.topicId===item.topicId);
  const foundation=foundations.find(f=>f.id===item.topicId);
  const exercises:Exercise[]=lesson?[...lesson.quizzes,...lesson.retests,lesson.diagnostic]:foundation?[...foundation.quizzes,...foundation.retests]:[];
  const q=exercises.find(q=>q.id===item.id);
  if(!q)return <Loading error={error||foundationError}/>;
  return <><h2>{item.title}：{roles[item.role]}</h2><ExerciseCard key={q.id} exercise={q} progress={progress} setProgress={setProgress}/><div className="lane-actions"><a className="button secondary" href={`#/learn/${item.topicId}`}>教材を確認する</a><a className="text-link" href={`#/learn/${item.topicId}?exercise=${(lesson?.retests??foundation?.retests)?.find(e=>e.id!==item.id)?.id??''}`}>別条件の再テストへ →</a></div></>;
}

export default function Review({catalog,progress,setProgress,route,past}:{catalog:Catalog;progress:Progress;setProgress:SetProgress;route:string;past:ReactNode}){
  const params=new URLSearchParams(route.split('?')[1]);
  const tab=params.get('tab')??(params.size?'past':'foundations');
  const subject=params.get('subject')??'all',topic=params.get('topic')??'all';
  const update=(key:string,value:string)=>{const p=new URLSearchParams(params);p.set('tab','foundations');if(value==='all')p.delete(key);else p.set(key,value);if(key==='subject')p.delete('topic');p.delete('item');location.hash='/review?'+p.toString();};
  const queue=catalog.learningIndex.filter(i=>needsReview(i,progress)&&(subject==='all'||i.subjectId===subject)&&(topic==='all'||i.topicId===topic));
  const [heldId,setHeldId]=useState<string|null>(params.get('item'));
  useEffect(()=>{setHeldId(params.get('item')??queue[0]?.id??null);},[route]);
  useEffect(()=>{if(!heldId&&queue[0])setHeldId(queue[0].id);},[heldId,queue[0]?.id]);
  const chosen=catalog.learningIndex.find(i=>i.id===heldId&&(subject==='all'||i.subjectId===subject)&&(topic==='all'||i.topicId===topic))??queue[0];
  const topics=[...new Map(catalog.learningIndex.filter(i=>subject==='all'||i.subjectId===subject).map(i=>[i.topicId,i.title])).entries()];
  const choose=(id:string)=>{const p=new URLSearchParams(params);p.set('tab','foundations');p.set('item',id);location.hash='/review?'+p.toString();};
  return <><div className="report-tabs"><a href="#/review?tab=foundations" className={tab==='foundations'?'active':''}>基礎の復習</a><a href="#/review?tab=past" className={tab==='past'?'active':''}>過去問の復習</a></div>{tab==='past'?past:<><Heading title="基礎の復習" description="最新の誤答と、自己評価で再確認すると記録した問題です。"/><section className="paper"><div className="filter-grid"><label>科目<select value={subject} onChange={e=>update('subject',e.target.value)}><option value="all">すべて</option>{catalog.subjects.map(s=><option value={s.subjectId} key={s.subjectId}>{s.name}</option>)}<option value="foundations">共通の基礎</option></select></label><label>テーマ<select value={topic} onChange={e=>update('topic',e.target.value)}><option value="all">すべて</option>{topics.map(([id,title])=><option value={id} key={id}>{title}</option>)}</select></label></div><p>{queue.length}問が再確認待ち</p><div className="review-queue">{queue.map(i=><button key={i.id} className="text-link" aria-pressed={chosen?.id===i.id} onClick={()=>choose(i.id)}>{i.title}／{roles[i.role]}{i.kind==='self-check'?'（自己評価）':''}</button>)}</div>{!queue.length&&<p>この条件で再確認する問題はありません。<a href="#/learn">基礎教材へ</a></p>}</section>{chosen&&<><ReviewExercise key={chosen.id} item={chosen} progress={progress} setProgress={setProgress}/>{queue.some(i=>i.id!==chosen.id)&&<button className="button" onClick={()=>choose(queue.find(i=>i.id!==chosen.id)!.id)}>次の復習問題へ →</button>}</>}</>}</>;
}
