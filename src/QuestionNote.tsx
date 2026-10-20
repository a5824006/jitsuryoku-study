import type { Progress } from './types';
import type { SetProgress } from './learning-ui';
export default function QuestionNote({id,progress,setProgress}:{id:string;progress:Progress;setProgress:SetProgress}){
 const note=progress.notes[id]??'';
 return <details className="question-note"><summary>復習メモ</summary><label className="draft-label">次に確認したいこと<textarea value={note} maxLength={10000} onChange={e=>setProgress(p=>({...p,notes:{...p.notes,[id]:e.target.value}}))}/></label>{progress.drafts[id]&&<button className="text-link" disabled={Boolean(note)} onClick={()=>setProgress(p=>({...p,notes:{...p.notes,[id]:p.drafts[id]}}))}>保存済みの答案をメモへコピー</button>}</details>;
}
