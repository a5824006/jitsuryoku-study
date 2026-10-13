export function crcSteps(data: string, generator: string) {
  if (!/^[01]{1,32}$/.test(data) || !/^1[01]{1,14}1$/.test(generator)) throw new Error('データは1〜32ビット、生成多項式は先頭と末尾が1の3〜16ビットで入力してください。');
  const degree=generator.length-1;
  const work=(data+'0'.repeat(degree)).split('').map(Number);
  const frames=[{ index: -1, bits: work.join(''), explanation: `${degree}ビットの0を付加し、多項式除算を始める。` }];
  for(let i=0;i<data.length;i++) {
    const active=work[i]===1;
    if(active)for(let j=0;j<generator.length;j++)work[i+j]^=Number(generator[j]);
    frames.push({index:i,bits:work.join(''),explanation:active?`${i+1}桁目から${generator}をXORする。繰り下がりは使わない。`:`${i+1}桁目は0なので、そのまま次の桁へ進む。`});
  }
  return {frames,remainder:work.slice(-degree).join(''),codeword:data+work.slice(-degree).join('')};
}
export function transformPoint(x:number,y:number,angle:number,tx:number,ty:number) {
  const r=angle*Math.PI/180,c=Math.cos(r),s=Math.sin(r);
  return {rotated:{x:c*x-s*y,y:s*x+c*y},transformed:{x:c*x-s*y+tx,y:s*x+c*y+ty},matrix:[[c,-s,tx],[s,c,ty],[0,0,1]]};
}
export interface Edge { from: string; to: string; weight: number }
export function dijkstraSteps(nodes:string[],edges:Edge[],start:string) {
  if(!nodes.includes(start)||edges.some(e=>!nodes.includes(e.from)||!nodes.includes(e.to)||!Number.isFinite(e.weight)||e.weight<0))throw new Error('始点と辺を確認してください。重みは0以上にしてください。');
  const distances:Record<string,number>=Object.fromEntries(nodes.map(n=>[n,Infinity]));distances[start]=0;
  const parents:Record<string,string>={};const settled:string[]=[];
  const frames=[{distances:{...distances},parents:{...parents},settled:[...settled],current:'',explanation:`始点${start}の距離を0、それ以外を∞にする。`}];
  while(settled.length<nodes.length) {
    const next=nodes.filter(n=>!settled.includes(n)).sort((a,b)=>distances[a]-distances[b]||a.localeCompare(b))[0];
    if(!Number.isFinite(distances[next]))break;
    settled.push(next);
    for(const e of edges){const other=e.from===next?e.to:e.to===next?e.from:null;if(other&&!settled.includes(other)&&distances[next]+e.weight<distances[other]){distances[other]=distances[next]+e.weight;parents[other]=next;}}
    frames.push({distances:{...distances},parents:{...parents},settled:[...settled],current:next,explanation:`暫定距離が最小の${next}を確定し、隣接頂点への距離を更新する。`});
  }
  return frames;
}
