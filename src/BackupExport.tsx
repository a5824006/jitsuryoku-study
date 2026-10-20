import { useEffect, useRef, useState } from 'react';
export default function BackupExport({data,close}:{data:string;close:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const text=useRef<HTMLTextAreaElement>(null);
  const [href,setHref]=useState('');
  useEffect(()=>{const uri=URL.createObjectURL(new Blob([data],{type:'application/json;charset=utf-8'}));setHref(uri);dialog.current?.showModal();return()=>URL.revokeObjectURL(uri);},[data]);
  return <dialog className="reading-dialog" ref={dialog} onCancel={close}><div className="dialog-bar"><h2>学習記録の書き出し</h2><button className="button secondary" autoFocus onClick={close}>閉じる</button></div><p>JSONファイルとして保存できます。ファイル保存が使えない場合は、下の内容をコピーしてUTF-8のJSONファイルに保存してください。</p><div className="lane-actions"><a className="button" href={href} download="実力試験ノート-backup-v3.json">JSONファイルを保存</a><button className="button secondary" onClick={()=>{text.current?.focus();text.current?.select();}}>JSONを選択する</button></div><label className="draft-label">バックアップJSON<textarea className="backup-json" ref={text} readOnly value={data} spellCheck={false}/></label><p className="footnote">選択後はCtrl+C（Macは⌘C）でコピーできます。読み込み時には科目、設問、テスト、記録の形式を検査します。</p></dialog>;
}
