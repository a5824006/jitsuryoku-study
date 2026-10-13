"""Read-only verification for multimedia, robotics and network learning data.

Run: python scripts/verify_signals.py
Requires the project's npm dependencies for the final strict KaTeX check.
No PDF extraction answers are used. Calculations derive from visible conditions.
"""
from pathlib import Path
from fractions import Fraction
import ipaddress
import json
import math
import subprocess

ROOT = Path(__file__).resolve().parents[1]
SUBJECTS = ('multimedia', 'robotics', 'networks')
data = {s: json.loads((ROOT / 'data/learning' / (s+'.json')).read_text(encoding='utf-8')) for s in SUBJECTS}
solutions = {q['questionId']: q for d in data.values() for q in d['solutions']}

for subject, learning in data.items():
    original = json.loads((ROOT / 'data/analysis/subjects' / (subject+'.json')).read_text(encoding='utf-8'))
    expected = {q['id'] for p in original['papers'] for q in p['questions']}
    assert expected == {q['questionId'] for q in learning['solutions']}
    assert {t['id'] for t in original['topics']} == {t['topicId'] for t in learning['lessons']}
    for q in learning['solutions']:
        assert q['checklist'] and q['pitfalls']
        if q['status'] == 'conditional':
            assert q['assumptions']
        if 'autoCheck' in q:
            assert q['status'] == 'verified'
        if 'diagram' in q:
            assert (ROOT / 'public' / q['diagram']['src']).is_file()

def remainder_integer(bits, polynomial=0b1011):
    dividend = int(bits, 2)
    while dividend.bit_length() >= polynomial.bit_length():
        dividend ^= polynomial << (dividend.bit_length() - polynomial.bit_length())
    return dividend

def remainder_stream(bits):
    register = 0
    for bit in bits:
        register = (register << 1) | int(bit)
        if register & 8:
            register ^= 0b1011
    return register

for year, message in [(2024, '10101111'), (2025, '11111111')]:
    r = remainder_integer(message+'000')
    assert r == remainder_stream(message+'000')
    crc = format(r, '03b')
    assert solutions[f'networks-{year}-q8']['autoCheck']['acceptedAnswers'] == [crc]
    assert remainder_integer(message+crc) == remainder_stream(message+crc) == 0
    print('CRC', year, message, crc, 'codeword remainder 000')

for year, prefix in [(2024, 25), (2025, 26)]:
    network = ipaddress.ip_network(f'133.2.205.128/{prefix}')
    first = network.network_address + 1
    last = network.broadcast_address - 1
    assert int(str(last).split('.')[-1]) == solutions[f'networks-{year}-q3']['autoCheck']['numericAnswer']
    assert f'{first}' in solutions[f'networks-{year}-q3']['answer'] and f'{last}' in solutions[f'networks-{year}-q3']['answer']
    print('IPv4 hosts', year, str(first), str(last))

for year, bits, low, high, voltage, code_voltage in [
    (2022, 3, Fraction(0), Fraction(5), Fraction('3.2'), Fraction('3.2')),
    (2023, 4, Fraction(0), Fraction(3), Fraction('2.35'), Fraction(2)),
    (2025, 4, Fraction(1), Fraction(4), Fraction('2.45'), Fraction('2.45')),
]:
    levels = 2**bits
    delta = (high-low)/(levels-1)
    k = round((voltage-low)/delta)
    code_k = round((code_voltage-low)/delta)
    xq = low+k*delta
    eq = xq-voltage
    assert solutions[f'multimedia-{year}-q7-1']['autoCheck']['numericAnswer'] == levels
    assert f'{float(delta):g}' in solutions[f'multimedia-{year}-q7-2']['answer']
    assert f'{float(xq):g}' in solutions[f'multimedia-{year}-q7-3']['answer']
    assert format(code_k, f'0{bits}b') in solutions[f'multimedia-{year}-q7-4']['answer']
    if year == 2022:
        assert f'{float(eq):g}' in solutions[f'multimedia-{year}-q7-5']['answer']
    print('Endpoint-inclusive quantizer', year, 'L', levels, 'delta', delta, 'xq', xq, 'code', format(code_k, f'0{bits}b'), 'eq=xq-x', eq)

samples = [1, 2, 3, 7, 8, 0, 4, 9]
averages = [Fraction(sum(samples[i:i+3]), 3) for i in range(6)]
medians = [sorted(samples[i:i+3])[1] for i in range(6)]
assert averages == list(map(Fraction, [2, 4, 6, 5, 4])) + [Fraction(13, 3)]
assert medians == [2, 3, 7, 7, 4, 4]
assert '13/3' in solutions['multimedia-2023-q11-a']['answer']
print('Moving average', list(map(str, averages)), 'median', medians)

v = [2/math.sqrt(3), -4/3, -7/3]
J = [[math.sqrt(3)/2, -.5, -1], [0, 1, -1], [-math.sqrt(3)/2, -.5, -1]]
assert all(abs(sum(a*b for a,b in zip(row,v))-wheel) < 1e-12 for row,wheel in zip(J,[4,1,2]))
print('Three-wheel constraint substitution returns [4,1,2]')

def multiply(a,b):
    return [[sum(a[i][k]*b[k][j] for k in range(4)) for j in range(4)] for i in range(4)]

def rz(theta):
    c,s=math.cos(theta),math.sin(theta)
    return [[c,-s,0,0],[s,c,0,0],[0,0,1,0],[0,0,0,1]]

def rx(theta):
    c,s=math.cos(theta),math.sin(theta)
    return [[1,0,0,0],[0,c,-s,0],[0,s,c,0],[0,0,0,1]]

def translation(x,y,z):
    return [[1,0,0,x],[0,1,0,y],[0,0,1,z],[0,0,0,1]]

# Check the modified DH expression against independent elementary transforms.
a,alpha,theta,d = 1.3,.7,-.4,.8
c,s,ca,sa=math.cos(theta),math.sin(theta),math.cos(alpha),math.sin(alpha)
dh=multiply(multiply(multiply(translation(a,0,0),rx(alpha)),rz(theta)),translation(0,0,d))
expected=[[c,-s,0,a],[s*ca,c*ca,-sa,-d*sa],[s*sa,c*sa,ca,d*ca],[0,0,0,1]]
assert all(abs(dh[i][j]-expected[i][j])<1e-12 for i in range(4) for j in range(4))
print('Modified DH elementary product matches the stated matrix')

# SCARA pose check, including the downward z3/z4 and local theta4 direction.
theta1,theta2,theta4,La,Lb,d3=.4,-.8,.3,2,3,.7
A1=rz(theta1)
A2=multiply(translation(La,0,0),rz(theta2))
A3=multiply(multiply(translation(Lb,0,0),rx(math.pi)),translation(0,0,d3))
T=multiply(multiply(multiply(A1,A2),A3),rz(theta4))
psi=theta1+theta2-theta4
p=[La*math.cos(theta1)+Lb*math.cos(theta1+theta2),La*math.sin(theta1)+Lb*math.sin(theta1+theta2),-d3]
assert all(abs(T[i][3]-p[i])<1e-12 for i in range(3))
assert abs(T[0][0]-math.cos(psi))<1e-12 and abs(T[1][0]-math.sin(psi))<1e-12
assert abs(T[2][2]+1)<1e-12
print('SCARA product matches planar position, downward z and psi=theta1+theta2-theta4')

# The regex rejects doubled command prefixes while permitting matrix row breaks.
js = r'''
import fs from 'node:fs';
import katex from 'katex';
let count=0;
function visit(value){
  if(typeof value==='string'){
    for(const m of value.matchAll(/\$\$([\s\S]*?)\$\$|\$([^$\n]+)\$/g)){
      const formula=m[1]??m[2];
      if(/(?<!\\)\\\\(?:sin|cos|tan|omega|phi|theta|begin|end|sqrt|frac|mu|sigma|Delta|sum|pi|operatorname)\b/.test(formula))
        throw new Error('Doubled TeX command prefix: '+formula);
      katex.renderToString(formula,{throwOnError:true,strict:'error',displayMode:!!m[1]});
      count++;
    }
  }else if(Array.isArray(value))value.forEach(visit);
  else if(value&&typeof value==='object')Object.values(value).forEach(visit);
}
for(const subject of ['multimedia','robotics','networks'])
  visit(JSON.parse(fs.readFileSync(`data/learning/${subject}.json`,'utf8')));
console.log(`Strict KaTeX and semantic command-prefix check: ${count} formulas.`);
'''
subprocess.run(['node', '--input-type=module', '-e', js], cwd=ROOT, check=True)
print('All 86 assigned solutions and 23 lessons passed the read-only checks.')
