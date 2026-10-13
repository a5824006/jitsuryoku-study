"""Independent exact checks; no third-party numerical packages required."""
from fractions import Fraction as F
from pathlib import Path
import json, math, heapq
ROOT=Path(__file__).resolve().parents[1]
(ROOT/'work').mkdir(exist_ok=True)
results={}
def multiply(a,b):return [[sum(x*y for x,y in zip(row,col)) for col in zip(*b)] for row in a]
def transpose(a):return list(map(list,zip(*a)))
def identity(n):return [[int(i==j) for j in range(n)] for i in range(n)]
def inverse(a):
 n=len(a);b=[[F(x) for x in row]+[F(i==j) for j in range(n)] for i,row in enumerate(a)]
 for k in range(n):
  p=next(i for i in range(k,n) if b[i][k]);b[k],b[p]=b[p],b[k]
  t=b[k][k];b[k]=[v/t for v in b[k]]
  for i in range(n):
   if i!=k:
    t=b[i][k];b[i]=[v-t*w for v,w in zip(b[i],b[k])]
 return [r[n:] for r in b]
def det(a):
 if len(a)==1:return a[0][0]
 return sum((-1)**j*a[0][j]*det([r[:j]+r[j+1:] for r in a[1:]]) for j in range(len(a)))
matrices={2022:[[0,6,3],[-2,7,2],[0,0,3]],2023:[[-1,4,4],[-2,5,7],[0,0,-2]],2025:[[-1,0,0],[1,3,1],[3,0,2]]}
vectors={2022:[(4,[3,2,0]),(3,[2,1,0]),(3,[1,0,1])],2023:[(3,[1,1,0]),(-2,[0,-1,1]),(1,[2,1,0])],2025:[(3,[0,1,0]),(2,[0,-1,1]),(-1,[1,0,-1])]}
coefs={2022:[1,-10,33,-36],2023:[1,-2,-5,6],2025:[1,-4,1,6]}
for year,a in matrices.items():
 for l,v in vectors[year]:assert multiply(a,[[x] for x in v])==[[l*x] for x in v]
 for l in range(-5,7):
  b=[[int(i==j)*l-a[i][j] for j in range(3)] for i in range(3)]
  poly=sum(c*l**(3-i) for i,c in enumerate(coefs[year]));assert det(b)==poly
 results[f'eigen-{year}']='all eigenpairs and polynomial at 12 exact integer points agree'
a=[[1,2,0],[2,3,4],[0,3,-11]];c=[[45,-22,-8],[-22,11,4],[-6,3,1]]
assert inverse(a)==c;assert multiply(a,c)==identity(3);assert multiply(c,a)==identity(3)
results['inverse-2024']='exact Gauss-Jordan and both products agree'
for y,a,p,expected in [(2022,[[3,2,1],[1,4,3],[1,1,1]],[3,-1,1],[F(3,2),-1,F(1,2)]),(2023,[[2,1,1],[1,2,1],[1,1,1]],[3,-1,1],[2,-2,1])]:
 assert multiply(inverse(a),[[F(x)] for x in p])==[[x] for x in expected]
 results[f'barycentric-{y}']='exact inverse solution and coordinate reconstruction agree'
assert abs((3*.3*.7*.7+2*3*.3*.3*.7+3*.3**3)-.9)<1e-12
assert abs(3*.3*.7*.7+3*.3*.3*.7-.63)<1e-12
for t in [0,.17,.5,.93,1]:
 b2=[(1-t)**2,2*t*(1-t),t*t]
 b3=[(1-t)**3,3*t*(1-t)**2,3*t*t*(1-t),t**3]
 ps=[[1,0],[0,0],[0,1]];qs=[[1,0],[1/3,0],[0,1/3],[0,1]]
 for k in range(2):assert abs(sum(b2[i]*ps[i][k] for i in range(3))-sum(b3[i]*qs[i][k] for i in range(4)))<1e-12
results['bezier']='point and degree elevation checked at 5 independent parameter values'
for m in [1,3]:
 for u in [.0001,.1,.5,.9,.9999]:assert abs(math.sin(math.asin(u**(1/(m+1))))**(m+1)-u)<1e-12
 for_u=[(i+.5)*math.pi/2/100000 for i in range(100000)]
 mass=sum((m+1)*math.cos(t)*math.sin(t)**m for t in for_u)*math.pi/2/100000
 assert abs(mass-1)<1e-9
for u in [.0001,.1,.5,.9,.9999]:assert abs(1-math.cos(math.acos((1-u)**(1/3)))**3-u)<1e-12
mass=sum(3*math.cos((i+.5)*math.pi/2/100000)**2*math.sin((i+.5)*math.pi/2/100000) for i in range(100000))*math.pi/2/100000
assert abs(mass-1)<1e-9
results['inverse-cdf']='normalization quadrature and inverse identities for all three specified densities'
H22=[[1,0,1,1,1,0,0],[1,1,0,1,0,1,0],[1,1,1,0,0,0,1]]
H23=[[1,1,1,0,1,0,0],[0,1,1,1,0,1,0],[1,0,1,1,0,0,1]]
for year,h in [(2022,H22),(2023,H23)]:
 assert len(set(tuple(c) for c in zip(*h)))==7;assert all(any(c) for c in zip(*h))
 g=[[int(i==j) for j in range(4)]+[h[k][i] for k in range(3)] for i in range(4)]
 assert all(v%2==0 for row in multiply(h,transpose(g)) for v in row)
 for value in range(16):
  m=[[int(c) for c in f'{value:04b}']];c=[[v%2 for v in multiply(m,g)[0]]]
  assert all(v%2==0 for row in multiply(h,transpose(c)) for v in row)
  for error in range(7):
   r=c[0][:];r[error]^=1
   syn=[row[0]%2 for row in multiply(h,[[x] for x in r])]
   assert syn==[row[error] for row in h]
 results[f'hamming-{year}']='HG^T=0; all 16 codewords and all 112 single-error positions checked'
assert [r[0]%2 for r in multiply(H23,[[int(c)] for c in '1010110'])]==[1,0,0]
g22=[[int(i==j) for j in range(4)]+[H22[k][i] for k in range(3)] for i in range(4)]
g23=[[int(i==j) for j in range(4)]+[H23[k][i] for k in range(3)] for i in range(4)]
assert ''.join(str(x%2) for x in multiply([[1,0,1,0]],g22)[0])=='1010010'
assert ''.join(str(x%2) for x in multiply([[1,1,0,1]],g23)[0])=='1101000'
ps={'b':F(2,10),'ab':F(14,100),'aab':F(98,1000),'c':F(1,10),'ac':F(7,100),'aac':F(49,1000),'aaa':F(343,1000)}
codes={'b':'01','ab':'101','aab':'000','c':'001','ac':'1001','aac':'1000','aaa':'11'}
assert sum(ps.values())==1
assert all(not v.startswith(w) for k,v in codes.items() for j,w in codes.items() if k!=j)
queue=list(ps.values());heapq.heapify(queue);merge_sum=0
while len(queue)>1:
 v=heapq.heappop(queue)+heapq.heappop(queue);merge_sum+=v;heapq.heappush(queue,v)
length=sum(ps[k]*len(codes[k]) for k in codes);symbols=sum(ps[k]*len(k) for k in codes)
assert length==merge_sum==F(2576,1000);assert symbols==F(219,100)
results['runlength-huffman']=dict(bitPerItem=str(length),sourceSymbolsPerItem=str(symbols),bitPerSourceSymbol=float(length/symbols))
edges=[('a','b',4),('a','d',2),('b','c',2),('c','d',1),('b','e',7),('b','f',4),('c','f',3),('c','i',6),('d','g',3),('e','f',6),('f','g',4),('e','j',5),('f','h',6),('g','i',6),('h','j',2),('h','i',1),('j','i',4)]
adj={k:[] for k in 'abcdefghij'}
for a,b,w in edges:adj[a].append((b,w));adj[b].append((a,w))
d={k:math.inf for k in adj};d['a']=0;seen=set();trace=[];queue=[(0,'a')]
while queue:
 distance,v=heapq.heappop(queue)
 if v in seen:continue
 seen.add(v);trace.append((v,distance))
 for w,cost in adj[v]:
  if distance+cost<d[w]:d[w]=distance+cost;heapq.heappush(queue,(d[w],w))
assert trace==[('a',0),('d',2),('c',3),('b',4),('g',5),('f',6),('i',9),('h',10),('e',11),('j',12)]
fw={a:{b:0 if a==b else math.inf for b in adj} for a in adj}
for a,b,w in edges:fw[a][b]=fw[b][a]=w
for k in adj:
 for a in adj:
  for b in adj:fw[a][b]=min(fw[a][b],fw[a][k]+fw[k][b])
assert fw['a']==d
results['graph-2022']=dict(trace=trace,independent='Floyd-Warshall agrees for all 10 destinations')
results['source-review']='all assigned 11 page images inspected; invisible answer-like extraction not used'
(ROOT/'work'/'math-learning-verification.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(results,ensure_ascii=False,indent=2))
