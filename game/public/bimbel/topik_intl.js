/* Extra Math topics for the Cambridge and Singapore curricula (Primary 1–6), in English.
   Topic coverage follows the KooBits curriculum list; every question is generated here at random.
   Loaded BEFORE the main script of index.html; uses its helpers (R, pick, D, LV, F, SVG, strChoices ...)
   only when a question is generated. */
(() => {
const fE=n=>n.toLocaleString('en-US');
const NM=['Amy','Ben','Chloe','Dev','Ella','Farid','Grace','Hari','Ivy','Jun','Kai','Lily'],IT=['apples','marbles','pencils','stickers','sweets','books','cards','balloons'];
const nmE=()=>pick(NM),itE=()=>pick(IT);
const PL=['ones','tens','hundreds','thousands','ten thousands','hundred thousands','millions'];
const ONES=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const TENS=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
function words(n){if(n<20)return ONES[n];if(n<100)return TENS[Math.floor(n/10)]+(n%10?'-'+ONES[n%10]:'');
  if(n<1000)return ONES[Math.floor(n/100)]+' hundred'+(n%100?' and '+words(n%100):'');
  if(n<1e6)return words(Math.floor(n/1000))+' thousand'+(n%1000?(n%1000<100?' and ':' ')+words(n%1000):'');
  return words(Math.floor(n/1e6))+' million'+(n%1e6?(n%1e6<100?' and ':' ')+words(n%1e6):'')}
const ord=n=>n+((n%100>=11&&n%100<=13)?'th':(['th','st','nd','rd'][n%10]||'th'));
const fm2=x=>String(x).padStart(2,'0');
const ST='fill="#FFE6D3" stroke="#F2701D" stroke-width="4" stroke-linejoin="round"';
const usd=c=>`$${(c/100).toFixed(2)}`;
const v3=(a,b,c)=>pick(D(a,b,c));
const tl=(x,y,t,a='middle')=>`<text x="${x}" y="${y}" font-size="11" font-weight="800" text-anchor="${a}" fill="#1F2A2E">${t}</text>`;
function colAdd(a,b){const st=[`Line up the digits: ${fE(a)} + ${fE(b)}.`];let A=a,B=b,c=0,i=0;
  while(A>0||B>0||c>0){const da=A%10,db=B%10,s=da+db+c;st.push(`${cap(PL[i])}: ${da} + ${db}${c?' + 1 (carried)':''} = ${s}${s>=10?`, write ${s%10} and carry 1`:''}.`);
    c=s>=10?1:0;A=Math.floor(A/10);B=Math.floor(B/10);i++}
  st.push(`So the answer is <b>${fE(a+b)}</b>.`);return st}
function colSub(a,b){const st=[`Line up the digits: ${fE(a)} − ${fE(b)}.`];let A=a,B=b,p=0,i=0;
  while(A>0){let da=A%10-p,db=B%10,t='';p=0;if(da<db){da+=10;p=1;t=` (regroup 1 from the ${PL[i+1]}, making ${da})`}
    if(A>=10||da-db>0||i===0)st.push(`${cap(PL[i])}: ${da} − ${db} = ${da-db}${t}.`);A=Math.floor(A/10);B=Math.floor(B/10);i++}
  st.push(`So the answer is <b>${fE(a-b)}</b>.`);return st}
function simpE(n,d,st){const g=gcd(n,d);if(g>1)st.push(n%d===0?`${F(n,d)} is equal to <b>${n/d}</b>.`:`Simplify (divide top and bottom by ${g}): <b>${F(n/g,d/g)}</b>.`);
  else st.push(`The answer is <b>${F(n,d)}</b>.`);if(n>d&&n%d)st.push(`It is greater than 1, so it can also be written as a mixed number.`);return st}
function angleSVG(deg){const r=Math.PI/180,x=60+52*Math.cos(deg*r),y=70-52*Math.sin(deg*r);
  const mark=deg===90?`<path d="M60 58 H72 V70" fill="none" stroke="#F2701D" stroke-width="3"/>`
    :`<path d="M76 70 A16 16 0 0 0 ${(60+16*Math.cos(deg*r)).toFixed(1)} ${(70-16*Math.sin(deg*r)).toFixed(1)}" fill="none" stroke="#F2701D" stroke-width="3"/>`;
  return SVG(`<line x1="60" y1="70" x2="112" y2="70" stroke="#1F2A2E" stroke-width="4" stroke-linecap="round"/><line x1="60" y1="70" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#1F2A2E" stroke-width="4" stroke-linecap="round"/>${mark}`,'0 0 120 80',170)}
function barSVG(labels,vals,step,top){const H=120,W=40+labels.length*50,y=v=>10+H-(v/top)*H;let s='';
  for(let v=0;v<=top;v+=step)s+=`<line x1="34" y1="${y(v)}" x2="${W}" y2="${y(v)}" stroke="#E3D9CC" stroke-width="1"/><text x="30" y="${y(v)+4}" font-size="10" text-anchor="end">${v}</text>`;
  labels.forEach((l,i)=>{const x=44+i*50;s+=`<rect x="${x}" y="${y(vals[i])}" width="30" height="${(vals[i]/top)*H}" fill="#2BA59B"/>${tl(x+15,H+26,l)}`});
  s+=`<line x1="34" y1="10" x2="34" y2="${H+10}" stroke="#1F2A2E" stroke-width="2"/><line x1="34" y1="${H+10}" x2="${W}" y2="${H+10}" stroke="#1F2A2E" stroke-width="2"/>`;
  return SVG(s,`0 0 ${W+6} ${H+32}`,Math.min(360,Math.round(W*1.5)))}
function gridSVG(lo,hi,pts){const c=22,o=22,N=hi-lo,X=v=>o+(v-lo)*c,Y=v=>o+(hi-v)*c;let s='';
  for(let v=lo;v<=hi;v++)s+=`<line x1="${X(v)}" y1="${o}" x2="${X(v)}" y2="${o+N*c}" stroke="#E3D9CC"/><line x1="${o}" y1="${Y(v)}" x2="${o+N*c}" y2="${Y(v)}" stroke="#E3D9CC"/>`;
  const ax=lo<0?0:lo;s+=`<line x1="${o}" y1="${Y(ax)}" x2="${o+N*c}" y2="${Y(ax)}" stroke="#1F2A2E" stroke-width="2"/><line x1="${X(ax)}" y1="${o}" x2="${X(ax)}" y2="${o+N*c}" stroke="#1F2A2E" stroke-width="2"/>`;
  for(let v=lo;v<=hi;v++){s+=`<text x="${X(v)}" y="${Y(ax)+13}" font-size="9" text-anchor="middle">${v}</text>`;if(v!==ax)s+=`<text x="${X(ax)-4}" y="${Y(v)+3}" font-size="9" text-anchor="end">${v}</text>`}
  for(const [x,y,l] of pts)s+=`<circle cx="${X(x)}" cy="${Y(y)}" r="5" fill="#F2701D"/><text x="${X(x)+7}" y="${Y(y)-6}" font-size="12" font-weight="800">${l}</text>`;
  return SVG(s,`0 0 ${o*2+N*c} ${o*2+N*c}`,260)}
const EM=[{e:'🍎',n:'apples'},{e:'⭐',n:'stars'},{e:'🐟',n:'fish'},{e:'🌸',n:'flowers'},{e:'⚽',n:'balls'},{e:'🐤',n:'chicks'},{e:'🚗',n:'cars'}];
const rowE=(e,n)=>{let s='';for(let i=0;i<n;i++)s+=e+(i%5===4?'&nbsp;&nbsp;':'');return `<div style="font-size:28px;line-height:1.5;margin:8px 0">${s}</div>`};
const SH=[{n:'Circle',s:`<circle cx="60" cy="45" r="38" ${ST}/>`,k:0},{n:'Triangle',s:`<polygon points="60,6 112,84 8,84" ${ST}/>`,k:3},
  {n:'Square',s:`<rect x="22" y="7" width="76" height="76" ${ST}/>`,k:4},{n:'Rectangle',s:`<rect x="6" y="18" width="108" height="54" ${ST}/>`,k:4},
  {n:'Pentagon',s:`<polygon points="60,6 106,38 88,86 32,86 14,38" ${ST}/>`,k:5},{n:'Hexagon',s:`<polygon points="38,8 82,8 106,45 82,82 38,82 14,45" ${ST}/>`,k:6},
  {n:'Octagon',s:`<polygon points="42,6 78,6 106,32 106,62 78,88 42,88 14,62 14,32" ${ST}/>`,k:8}];
const SOL=[{n:'Cube',f:6,e:12,v:8,d:'6 square faces that are all the same size',x:'a dice'},{n:'Cuboid',f:6,e:12,v:8,d:'6 rectangular faces',x:'a shoebox'},
  {n:'Triangular prism',f:5,e:9,v:6,d:'2 triangular faces and 3 rectangular faces',x:'a tent'},{n:'Square-based pyramid',f:5,e:8,v:5,d:'a square base and 4 triangular faces meeting at a point',x:'a pyramid'},
  {n:'Cylinder',d:'2 flat circular faces and 1 curved surface',x:'a tin can'},{n:'Cone',d:'1 circular base, 1 curved surface and 1 apex',x:'an ice cream cone'},{n:'Sphere',d:'1 curved surface and no edges',x:'a football'}];
const ANG=d=>d<90?'Acute':d===90?'Right angle':d<180?'Obtuse':'Straight';
const DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday'];

const G_INTL={
  eCount(p){const a=pick(EM);
    if(LV===3&&Math.random()<.6){const b=pick(EM.filter(x=>x!==a)),x=R(5,Math.min(12,p)),y=R(2,x-1);
      return {q:`How many more ${a.n} than ${b.n} are there?${rowE(a.e,x)}${rowE(b.e,y)}`,ans:x-y,kind:'int',steps:[`Count the ${a.n}: ${x}.`,`Count the ${b.n}: ${y}.`,`${x} − ${y} = <b>${x-y}</b>.`]}}
    const n=R(D(2,4,6),p),k=Math.floor(n/5),s=n%5;
    return {q:`How many ${a.n} are there?${rowE(a.e,n)}`,ans:n,kind:'int',steps:n<5?[`Count one by one: ${[...Array(n)].map((_,i)=>i+1).join(', ')}.`,`There are <b>${n}</b>.`]
      :[`Count in fives: ${k} group${k>1?'s':''} of 5${s?` and ${s} more`:''}.`,`${Array(k).fill(5).join(' + ')}${s?` + ${s}`:''} = <b>${n}</b>.`]}},
  eCompare(p){let a=R(0,p),b=Math.random()<.15?a:R(0,p),left=fE(a);
    if(LV===3&&Math.random()<.5){const x=R(1,Math.floor(p/2)),y=R(0,Math.floor(p/2));a=x+y;left=`${fE(x)} + ${fE(y)}`;b=Math.max(0,a+R(-3,3))}
    const sym=a>b?'>':a<b?'<':'=';
    return {q:`Choose the correct sign:<br>${left} &nbsp;☐&nbsp; ${fE(b)}`,ans:sym,kind:'str',choices:['<','=','>'],
      steps:[...(left.includes('+')?[`Work out ${left} = ${fE(a)} first.`]:[]),`${fE(a)} is ${a>b?'greater than':a<b?'less than':'equal to'} ${fE(b)}.`,`So the sign is <b>${sym}</b>.`]}},
  eAddSub(p){const plus=Math.random()<.5,o=nmE(),x=itE();let a,b;
    if(plus){a=R(Math.max(1,Math.ceil(p/10)),p-1);b=R(1,p-a)}else{a=R(Math.max(2,Math.ceil(p/5)),p);b=R(1,a-1)}
    const c=plus?a+b:a-b,q=story()?(plus?`${o} has <b>${fE(a)}</b> ${x}. ${o} gets <b>${fE(b)}</b> more. How many ${x} does ${o} have now?`:`${o} has <b>${fE(a)}</b> ${x} and gives away <b>${fE(b)}</b>. How many ${x} are left?`):`${fE(a)} ${plus?'+':'−'} ${fE(b)} = ?`;
    const steps=p<=20&&b<=10?(()=>{const seq=[];for(let i=1;i<=b;i++)seq.push(plus?a+i:a-i);return [`Start at ${a}.`,`Count ${plus?'on':'back'} ${b}: ${seq.join(', ')}.`,`So the answer is <b>${c}</b>.`]})():(plus?colAdd(a,b):colSub(a,b));
    return {q,ans:c,kind:'int',steps}},
  eOrdinal(){const A=[{e:'🐶',n:'dog'},{e:'🐱',n:'cat'},{e:'🐰',n:'rabbit'},{e:'🐸',n:'frog'},{e:'🐵',n:'monkey'},{e:'🐼',n:'panda'},{e:'🦊',n:'fox'},{e:'🐷',n:'pig'},{e:'🐮',n:'cow'},{e:'🐔',n:'chicken'}];
    const row=shuffle(A.slice()).slice(0,D(5,7,10)),line=`<div style="font-size:30px;letter-spacing:6px;margin:8px 0">${row.map(a=>a.e).join('')}</div>`;
    const i=R(0,row.length-1),right=LV===3&&Math.random()<.5,pos=right?row.length-i:i+1,side=right?'right':'left';
    if(LV>1&&Math.random()<.5){const ans=ord(pos);return {q:`${line}In which position is the ${row[i].n}, counting from the ${side}?`,ans,kind:'str',
      choices:strChoices(ans,[ord(pos+1),ord(pos+2),ord(row.length-pos+1),ord(Math.max(1,pos-1))]),steps:[`Count from the ${side}, starting at 1st.`,`The ${row[i].n} is <b>${ans}</b>.`]}}
    const nm=cap(row[i].n);return {q:`${line}Which animal is ${ord(pos)} from the ${side}?`,ans:nm,kind:'str',choices:strChoices(nm,row.map(a=>cap(a.n))),
      steps:[`Count from the ${side} up to ${pos}.`,`The ${ord(pos)} animal is the <b>${row[i].n}</b>.`]}},
  eShape2D(){const pool=D(SH.slice(0,4),SH.slice(0,6),SH),s=pick(pool);
    if(s.k&&Math.random()<D(.2,.4,.6)){const w=pick(['sides','corners']);return {q:`How many ${w} does this shape have?${SVG(s.s,'0 0 120 94')}`,ans:s.k,kind:'int',
      steps:[`This shape is a ${s.n.toLowerCase()}.`,`Count the ${w} one by one: <b>${s.k}</b>.`]}}
    return {q:`What is the name of this shape?${SVG(s.s,'0 0 120 94')}`,ans:s.n,kind:'str',choices:strChoices(s.n,SH.map(x=>x.n)),
      steps:[s.k?`It has ${s.k} straight sides${s.n==='Square'?' that are all the same length':s.n==='Rectangle'?', with 2 long sides and 2 short sides':''}.`:`It is round with no corners.`,`It is a <b>${s.n.toLowerCase()}</b>.`]}},
  ePicGraph(p){const C=shuffle([{e:'🍎',n:'Apple'},{e:'🍊',n:'Orange'},{e:'🍌',n:'Banana'},{e:'🥭',n:'Mango'},{e:'🍇',n:'Grapes'}]).slice(0,D(3,4,4));
    const sc=p===2&&LV===3?2:1;let vals;do{vals=C.map(()=>R(1,D(5,7,8)))}while(new Set(vals).size<vals.length);const real=vals.map(v=>v*sc);
    const tb=`<table style="border-collapse:collapse;margin:10px 0;font-size:16px">${C.map((c,i)=>`<tr><td style="padding:4px 10px;font-weight:800;border:2px solid #E3D9CC">${c.n}</td><td style="padding:4px 10px;border:2px solid #E3D9CC;font-size:22px">${c.e.repeat(vals[i])}</td></tr>`).join('')}</table>${sc>1?`<div style="font-weight:700">Each picture stands for ${sc} children.</div>`:''}`;
    const head=`The pictogram shows the favourite fruit of a class:${tb}`,v=v3([0,1],[0,1,2],[0,1,2,3]);
    if(v===0){const i=R(0,C.length-1);return {q:`${head}How many children chose ${C[i].n.toLowerCase()}?`,ans:real[i],kind:'int',
      steps:[`Count the pictures for ${C[i].n.toLowerCase()}: ${vals[i]}.`,...(sc>1?[`Each picture = ${sc}, so ${vals[i]} × ${sc} = ${real[i]}.`]:[]),`The answer is <b>${real[i]}</b>.`]}}
    if(v===1){const most=Math.random()<.5,t=most?Math.max(...vals):Math.min(...vals),i=vals.indexOf(t);
      return {q:`${head}Which fruit is the ${most?'most':'least'} popular?`,ans:C[i].n,kind:'str',choices:C.map(c=>c.n),steps:[`Compare the lengths of the rows.`,`The ${C[i].n.toLowerCase()} row is the ${most?'longest':'shortest'}, so the answer is <b>${C[i].n}</b>.`]}}
    const [i,j]=shuffle([...C.keys()]).slice(0,2);
    if(v===2){const [a,b]=real[i]>real[j]?[i,j]:[j,i];return {q:`${head}How many more children chose ${C[a].n.toLowerCase()} than ${C[b].n.toLowerCase()}?`,ans:real[a]-real[b],kind:'int',
      steps:[`${C[a].n}: ${real[a]}, ${C[b].n.toLowerCase()}: ${real[b]}.`,`${real[a]} − ${real[b]} = <b>${real[a]-real[b]}</b>.`]}}
    const tot=real.reduce((a,b)=>a+b,0);return {q:`${head}How many children are there in the class?`,ans:tot,kind:'int',steps:[`Add all the rows: ${real.join(' + ')}.`,`Total = <b>${tot}</b>.`]}},
  eBarGraph(p){const step=p===1?D(1,2,2):D(5,10,10),top=step*10,n=D(4,5,5);let vals;do{vals=[...Array(n)].map(()=>R(1,10)*step)}while(new Set(vals).size<n);
    const head=`The bar graph shows the number of books borrowed from a library:${barSVG(DAYS.slice(0,n).map(d=>d.slice(0,3)),vals,step,top)}`,v=v3([0,1],[0,1,2],[1,2,3]);
    if(v===0){const i=R(0,n-1);return {q:`${head}How many books were borrowed on ${DAYS[i]}?`,ans:vals[i],kind:'int',steps:[`Find the top of the ${DAYS[i]} bar and read across to the scale.`,`It reaches <b>${vals[i]}</b>.`]}}
    if(v===1){const most=Math.random()<.5,t=most?Math.max(...vals):Math.min(...vals),i=vals.indexOf(t);
      return {q:`${head}On which day were the ${most?'most':'fewest'} books borrowed?`,ans:DAYS[i],kind:'str',choices:DAYS.slice(0,n),steps:[`Look for the ${most?'tallest':'shortest'} bar.`,`It is <b>${DAYS[i]}</b> (${t} books).`]}}
    const [i,j]=shuffle([...vals.keys()]).slice(0,2);
    if(v===2){const [a,b]=vals[i]>vals[j]?[i,j]:[j,i];return {q:`${head}How many more books were borrowed on ${DAYS[a]} than on ${DAYS[b]}?`,ans:vals[a]-vals[b],kind:'int',
      steps:[`${DAYS[a]}: ${vals[a]}, ${DAYS[b]}: ${vals[b]}.`,`${vals[a]} − ${vals[b]} = <b>${vals[a]-vals[b]}</b>.`]}}
    const tot=vals.reduce((a,b)=>a+b,0);return {q:`${head}How many books were borrowed altogether?`,ans:tot,kind:'int',steps:[`Add all the bars: ${vals.join(' + ')}.`,`Total = <b>${tot}</b>.`]}},
  eLength(p){
    if(p===1){const L=['A','B','C'],col=['#F2701D','#2BA59B','#6C63FF'];
      if(LV===3&&Math.random()<.5){const n=R(3,9);let s='';for(let i=0;i<n;i++)s+=`<rect x="${4+i*22}" y="34" width="22" height="22" fill="#fff" stroke="#1F2A2E" stroke-width="2"/>`;
        s+=`<rect x="4" y="10" width="${n*22}" height="16" rx="8" fill="#F2701D"/>`;
        return {q:`How many units long is the pencil?${SVG(s,`0 0 ${n*22+8} 60`,Math.min(320,n*32))}`,ans:n,kind:'int',steps:[`Count the squares under the pencil from end to end.`,`It is <b>${n}</b> units long.`]}}
      const k=LV===1?2:3,lens=shuffle([3,4,5,6,7,8,9]).slice(0,k),long=Math.random()<.5,t=long?Math.max(...lens):Math.min(...lens),ti=lens.indexOf(t);
      let s='';lens.forEach((l,i)=>{s+=`<text x="2" y="${23+i*28}" font-size="14" font-weight="800">${L[i]}</text><rect x="20" y="${10+i*28}" width="${l*20}" height="16" rx="8" fill="${col[i]}"/>`});
      return {q:`Which ribbon is the ${long?'longest':'shortest'}?${SVG(s,`0 0 210 ${k*28+6}`,260)}`,ans:L[ti],kind:'str',choices:L.slice(0,k),steps:[`The ribbons start at the same line, so compare their right ends.`,`Ribbon <b>${L[ti]}</b> is the ${long?'longest':'shortest'}.`]}}
    if(p===2){const v=v3([0,1],[1,2],[2,3]);
      if(v===0){const m=R(1,9);return {q:`${m} m = ? cm`,ans:m*100,kind:'int',steps:[`1 m = 100 cm.`,`${m} × 100 = <b>${m*100}</b> cm.`]}}
      if(v===1){const m=R(1,9),c=R(5,95);return {q:`${m} m ${c} cm = ? cm`,ans:m*100+c,kind:'int',steps:[`${m} m = ${m*100} cm.`,`${m*100} + ${c} = <b>${m*100+c}</b> cm.`]}}
      if(v===2){const t=R(105,995),m=Math.floor(t/100);return {q:`${t} cm = ${m} m ? cm`,ans:t%100,kind:'int',steps:[`${t} cm = ${m*100} cm + ${t%100} cm.`,`${m*100} cm = ${m} m, so the answer is <b>${t%100}</b> cm.`]}}
      const a=R(120,180),b=R(15,60),o=nmE();return {q:`${o} is ${Math.floor(a/100)} m ${a%100} cm tall. ${o}'s brother is ${b} cm shorter. How tall is the brother in cm?`,ans:a-b,kind:'int',
        steps:[`${Math.floor(a/100)} m ${a%100} cm = ${a} cm.`,`${a} − ${b} = <b>${a-b}</b> cm.`]}}
    const v=v3([0,1],[1,2],[2,3]);
    if(v===0){const k=R(1,9),m=pick([0,250,500,750]);return {q:`${k} km${m?` ${m} m`:''} = ? m`,ans:k*1000+m,kind:'int',steps:[`1 km = 1,000 m.`,`${k} km = ${fE(k*1000)} m${m?`, plus ${m} m = <b>${fE(k*1000+m)}</b> m`:` = <b>${fE(k*1000)}</b> m`}.`]}}
    if(v===1){const t=R(1,9)*1000+R(1,19)*50;return {q:`${fE(t)} m = ? km ${t%1000} m`,ans:Math.floor(t/1000),kind:'int',steps:[`${fE(t)} m = ${fE(t-t%1000)} m + ${t%1000} m.`,`${fE(t-t%1000)} m = <b>${Math.floor(t/1000)}</b> km.`]}}
    if(v===2){const a=R(2,6)*1000+R(1,9)*100,b=R(1,9)*100+R(1,9)*10;return {q:`A road is ${fE(a)} m long. Workers have built ${fE(b)} m. How many metres are left to build?`,ans:a-b,kind:'int',steps:colSub(a,b)}}
    const k=R(1,4),m=R(1,9)*100,r=R(1,9)*100+50;return {q:`Ali walked ${k} km ${m} m to the park and then ${r} m to the shop. How far did he walk in metres?`,ans:k*1000+m+r,kind:'int',
      steps:[`${k} km ${m} m = ${fE(k*1000+m)} m.`,`${fE(k*1000+m)} + ${r} = <b>${fE(k*1000+m+r)}</b> m.`]}},
  eMass(p){
    if(p===1){const B=shuffle(['book','bag','melon','pillow','cat','bucket']);
      if(LV<3){const w=shuffle([2,3,4,5,6,7,8]).slice(0,LV+1),h=Math.random()<.5,t=h?Math.max(...w):Math.min(...w),i=w.indexOf(t);
        return {q:`${B.slice(0,w.length).map((x,j)=>`The ${x} weighs ${w[j]} kg`).join('. ')}. Which is the ${h?'heaviest':'lightest'}?`,ans:cap(B[i]),kind:'str',choices:B.slice(0,w.length).map(cap),
          steps:[`Compare the masses: ${w.join(' kg, ')} kg.`,`The ${h?'heaviest':'lightest'} is ${t} kg: the <b>${B[i]}</b>.`]}}
      const a=R(2,9),n=R(2,6),un=pick(['g','kg']);return {q:`One bag of rice has a mass of ${a} ${un}. What is the mass of ${n} bags?`,ans:a*n,kind:'int',steps:[`${n} × ${a} ${un} = <b>${a*n}</b> ${un}.`]}}
    const v=v3([0,1],[1,2],[2,3]);
    if(v===0){const k=R(1,9);return {q:`${k} kg = ? g`,ans:k*1000,kind:'int',steps:[`1 kg = 1,000 g.`,`${k} × 1,000 = <b>${fE(k*1000)}</b> g.`]}}
    if(v===1){const k=R(1,5),g=R(1,19)*50;return {q:`${k} kg ${g} g = ? g`,ans:k*1000+g,kind:'int',steps:[`${k} kg = ${fE(k*1000)} g.`,`${fE(k*1000)} + ${g} = <b>${fE(k*1000+g)}</b> g.`]}}
    if(v===2){const g=R(1,9)*1000+R(1,19)*50;return {q:`${fE(g)} g = ${Math.floor(g/1000)} kg ? g`,ans:g%1000,kind:'int',steps:[`${fE(g)} g = ${fE(g-g%1000)} g + ${g%1000} g.`,`So the answer is <b>${g%1000}</b> g.`]}}
    const k=R(2,5),g=R(3,18)*50;return {q:`Mum had ${k} kg of flour. She used ${g} g for a cake. How many grams of flour are left?`,ans:k*1000-g,kind:'int',steps:[`${k} kg = ${fE(k*1000)} g.`,`${fE(k*1000)} − ${g} = <b>${fE(k*1000-g)}</b> g.`]}},
  eVolLiq(p){const v=v3([0,1],[1,2],[2,3]);
    if(v===0){const l=R(1,9);return {q:`${l} ℓ = ? ml`,ans:l*1000,kind:'int',steps:[`1 ℓ = 1,000 ml.`,`${l} × 1,000 = <b>${fE(l*1000)}</b> ml.`]}}
    if(v===1){const c=R(2,6),n=R(2,8);return {q:`A jug holds ${c} ℓ of water. How many litres do ${n} jugs hold?`,ans:c*n,kind:'int',steps:[`${n} × ${c} ℓ = <b>${c*n}</b> ℓ.`]}}
    if(v===2){const l=R(1,5),m=R(1,19)*50;return {q:`${l} ℓ ${m} ml = ? ml`,ans:l*1000+m,kind:'int',steps:[`${l} ℓ = ${fE(l*1000)} ml.`,`${fE(l*1000)} + ${m} = <b>${fE(l*1000+m)}</b> ml.`]}}
    const B=pick([1000,1500,2000,3000]),g=pick([250,500]);return {q:`A bottle holds ${fE(B)} ml of juice. It is poured into cups of ${g} ml each. How many cups can be filled?`,ans:B/g,kind:'int',steps:[`${fE(B)} ÷ ${g} = <b>${B/g}</b> cups.`]}},
  eMoney(p){
    if(p===1){if(LV<3){const coins=[...Array(D(2,3,4))].map(()=>pick([5,10,20,50])),s=coins.reduce((a,b)=>a+b,0);
        return {q:`How much money is there? ${coins.map(c=>`${c}¢`).join(', ')}. Give the answer in cents.`,ans:s,kind:'int',steps:[`Add the coins: ${coins.join(' + ')} = <b>${s}</b>¢.`]}}
      const notes=[...Array(R(2,4))].map(()=>pick([2,5,10])),s=notes.reduce((a,b)=>a+b,0);
      return {q:`${nmE()} has ${notes.map(n=>`a $${n} note`).join(', ')}. How many dollars is that?`,ans:s,kind:'int',steps:[`Add the notes: ${notes.join(' + ')} = <b>$${s}</b>.`]}}
    if(p===2){if(LV===1){const d=R(1,9),c=R(1,19)*5;return {q:`${usd(d*100+c)} = ? cents`,ans:d*100+c,kind:'int',steps:[`$1 = 100¢, so $${d} = ${d*100}¢.`,`${d*100} + ${c} = <b>${d*100+c}</b>¢.`]}}
      const a=R(100,900),b=R(100,900),s=a+b,ans=usd(s);
      return {q:`${usd(a)} + ${usd(b)} = ?`,ans,kind:'str',choices:strChoices(ans,[usd(s+10),usd(s-10),usd(s+100),usd(s-100),usd(s+5)].filter(x=>x!=='$0.00')),
        steps:[`Change to cents: ${a}¢ + ${b}¢ = ${s}¢.`,`${s}¢ = <b>${ans}</b>.`]}}
    const price=R(120,D(900,1800,4500)),pay=[1000,2000,5000].find(x=>x>price),ch=pay-price,ans=usd(ch),o=nmE();
    return {q:`${o} buys a toy for ${usd(price)} and pays with a ${usd(pay)} note. How much change does ${o} get?`,ans,kind:'str',
      choices:strChoices(ans,[usd(ch+10),usd(ch-10),usd(ch+100),usd(ch>100?ch-100:ch+50)]),steps:[`Change = amount paid − price.`,`${pay}¢ − ${price}¢ = ${ch}¢ = <b>${ans}</b>.`]}},
  eTime(p){
    if(p===1||p===2){const h=R(1,12),m=p===1?pick(D([0],[0,30],[0,30])):pick(D([0,15,30,45],[0,5,10,20,25,35,40,50,55],[5,10,20,25,35,40,50,55])),t=`${h}:${fm2(m)}`;
      const pool=[`${h%12+1}:${fm2(m)}`,`${h}:${fm2((m+30)%60)}`,`${(h+10)%12+1}:${fm2(m)}`,`${m/5||12}:${fm2(h*5%60)}`];
      return {q:`What time does the clock show?${clockSVG(h,m)}`,ans:t,kind:'str',choices:strChoices(t,pool.filter(x=>x!==t)),
        steps:[`The short hand points ${m?`just past ${h}`:`at ${h}`}, so the hour is ${h}.`,`The long hand points to ${m/5||12}, which means ${m} minutes.`,`The time is <b>${t}</b>.`]}}
    if(p===3){const t0=R(7,15)*60+pick([0,10,15,20,30,40,45]),d=R(2,11)*5+(LV===3?R(1,2)*60:0);
      const tt=x=>`${(Math.floor(x/60)-1)%12+1}:${fm2(x%60)} ${x<720?'a.m.':'p.m.'}`;
      if(Math.random()<.5)return {q:`A lesson starts at ${tt(t0)} and ends at ${tt(t0+d)}. How many minutes long is it?`,ans:d,kind:'int',
        steps:[`From ${tt(t0)} to ${tt(t0+d)}: count on hours then minutes.`,`The lesson lasts <b>${d}</b> minutes.`]};
      const ans=tt(t0+d);return {q:`A film starts at ${tt(t0)} and lasts ${d} minutes. When does it end?`,ans,kind:'str',choices:strChoices(ans,[tt(t0+d+10),tt(t0+d-10),tt(t0+d+60),tt(t0+d-5)]),
        steps:[`${d} minutes = ${Math.floor(d/60)} h ${d%60} min.`,`${tt(t0)} + ${d} min = <b>${ans}</b>.`]}}
    const h=R(1,11),m=R(0,11)*5,pm=Math.random()<.5,t12=`${h}:${fm2(m)} ${pm?'p.m.':'a.m.'}`,t24=`${fm2(pm?h+12:h)}:${fm2(m)}`;
    if(Math.random()<.5)return {q:`Write <b>${t12}</b> in the 24-hour clock.`,ans:t24,kind:'str',choices:strChoices(t24,[`${fm2(pm?h:h+12)}:${fm2(m)}`,`${fm2((pm?h+12:h)+1)}:${fm2(m)}`,`${fm2(pm?h+10:h+2)}:${fm2(m)}`]),
      steps:[pm?`For p.m. times, add 12 to the hour: ${h} + 12 = ${h+12}.`:`For a.m. times, keep the hour and write it with two digits.`,`So it is <b>${t24}</b>.`]};
    return {q:`What is <b>${t24}</b> in the 12-hour clock?`,ans:t12,kind:'str',choices:strChoices(t12,[`${h}:${fm2(m)} ${pm?'a.m.':'p.m.'}`,`${h%12+1}:${fm2(m)} ${pm?'p.m.':'a.m.'}`,`${(h+1)%12+1}:${fm2(m)} ${pm?'a.m.':'p.m.'}`]),
      steps:[pm?`The hour ${h+12} is more than 12, so subtract 12: ${h} p.m.`:`The hour ${fm2(h)} is before 12, so it is a.m.`,`So it is <b>${t12}</b>.`]}},
  eMulTab(p){const a=pick(p),b=R(1,D(5,10,12)),c=a*b,x=itE();
    if(LV===3&&Math.random()<.4)return {q:`${a} × ? = ${c}`,ans:b,kind:'int',steps:[`Which number times ${a} makes ${c}?`,`${a} × ${b} = ${c}, so the answer is <b>${b}</b>.`]};
    const q=story()?`There are <b>${b}</b> bags with <b>${a}</b> ${x} in each bag. How many ${x} are there altogether?`:`${b} × ${a} = ?`;
    return {q,ans:c,kind:'int',steps:[`${b} groups of ${a}: ${b<=6?Array(b).fill(a).join(' + '):`count in ${a}s ${b} times`}.`,`${b} × ${a} = <b>${c}</b>.`]}},
  eDivTab(p){const a=pick(p),q=R(1,D(5,10,12)),n=a*q,x=itE();
    const t=story()?pick([`<b>${n}</b> ${x} are shared equally among <b>${a}</b> children. How many does each child get?`,`<b>${n}</b> ${x} are put into bags of <b>${a}</b>. How many bags are needed?`]):`${n} ÷ ${a} = ?`;
    return {q:t,ans:q,kind:'int',steps:[`Think: ${a} × ? = ${n}.`,`${a} × ${q} = ${n}, so ${n} ÷ ${a} = <b>${q}</b>.`]}},
  eFraction(p){
    if(p===1){if(LV===1||Math.random()<.5){const d=pick([2,4]),n=d===2?1:pick([1,3]),w=200/d;let r='';
        for(let i=0;i<d;i++)r+=`<rect x="${2+i*w}" y="2" width="${w}" height="46" fill="${i<n?'#F2701D':'#fff'}" stroke="#1F2A2E" stroke-width="3"/>`;
        const a=`${n}/${d}`;return {q:`What fraction is shaded?${SVG(r,'0 0 204 50',240)}`,ans:a,kind:'str',choices:['1/2','1/3','1/4','3/4'],steps:[`The shape has ${d} equal parts and ${n} ${n>1?'are':'is'} shaded.`,`So it is <b>${a}</b>.`]}}
      const d=pick(D([2],[2,4],[2,3,4])),k=R(1,D(5,6,8)),n=d*k,nm={2:'half',3:'one third',4:'one quarter'}[d];
      return {q:`What is ${nm} of ${n}?`,ans:k,kind:'int',steps:[`Divide ${n} into ${d} equal parts.`,`${n} ÷ ${d} = <b>${k}</b>.`]}}
    if(p===2){if(LV===1){let a=R(2,10),b=R(2,10);while(a===b)b=R(2,10);const big=Math.random()<.5,ans=`1/${big?Math.min(a,b):Math.max(a,b)}`;
        return {q:`Which fraction is ${big?'greater':'smaller'}?`,ans,kind:'str',choices:[`1/${a}`,`1/${b}`],steps:[`With the same numerator 1, the larger the denominator, the smaller the parts.`,`So <b>${ans}</b> is ${big?'greater':'smaller'}.`]}}
      const d=R(5,12),ns=shuffle([...Array(d-1)].map((_,i)=>i+1)).slice(0,LV===2?2:3),big=Math.random()<.5,t=big?Math.max(...ns):Math.min(...ns),ans=`${t}/${d}`;
      return {q:`Which fraction is the ${big?'greatest':'smallest'}?`,ans,kind:'str',choices:ns.map(n=>`${n}/${d}`),steps:[`The denominators are the same (${d}), so compare the numerators.`,`${big?'Greatest':'Smallest'} numerator is ${t}, so <b>${ans}</b>.`]}}
    const d=R(2,D(5,8,10)),n=R(1,d-1),k=R(2,D(3,4,6));
    if(LV<3)return {q:`Complete the equivalent fraction: ${F(n,d)} = ${F('?',d*k)}`,ans:n*k,kind:'int',hint:'Type the numerator only.',steps:[`${d} × ${k} = ${d*k}, so multiply the numerator by ${k} too.`,`${n} × ${k} = <b>${n*k}</b>.`]};
    const g=gcd(n,d);return {q:`Write ${F(n*k,d*k)} in its simplest form.`,ans:[n/g,d/g],kind:'frac',hint:'Type a fraction like 2/3.',steps:simpE(n*k,d*k,[`Find the largest number that divides ${n*k} and ${d*k}: ${k*g}.`])}},
  eFracOps(p){
    if(p===1){const d=R(3,D(6,10,12)),a=R(1,d-1),plus=Math.random()<.5,b=plus?R(1,d-a):R(1,a);
      if(!plus&&a===b)return this.eFracOps(p);
      const r=plus?a+b:a-b;return {q:`${F(a,d)} ${plus?'+':'−'} ${F(b,d)} = ?`,ans:[r,d],kind:'frac',hint:'Type a fraction like 3/5.',steps:simpE(r,d,[`The denominators are the same, so ${plus?'add':'subtract'} the numerators: ${a} ${plus?'+':'−'} ${b} = ${r}.`,`${F(r,d)}.`])}}
    if(p===2){let d1=R(2,6),k=R(2,3),d2=LV===1?d1*k:R(2,8);while(d2===d1)d2=R(2,8);const n1=R(1,d1-1),n2=R(1,d2-1),plus=LV===1||Math.random()<.6,L=lcm(d1,d2),a=n1*L/d1,b=n2*L/d2;
      if(!plus&&a<=b)return this.eFracOps(p);
      const r=plus?a+b:a-b;return {q:`${F(n1,d1)} ${plus?'+':'−'} ${F(n2,d2)} = ?`,ans:[r,L],kind:'frac',hint:'Type a fraction like 7/12.',
        steps:simpE(r,L,[`Use the common denominator ${L}: ${F(n1,d1)} = ${F(a,L)}, ${F(n2,d2)} = ${F(b,L)}.`,`${F(a,L)} ${plus?'+':'−'} ${F(b,L)} = ${F(r,L)}.`])}}
    const v=v3([0],[0,1],[1,2]);
    if(v===0){const b=R(2,9),a=R(1,b-1),d=R(2,9),c=R(1,d-1);return {q:`${F(a,b)} × ${F(c,d)} = ?`,ans:[a*c,b*d],kind:'frac',hint:'Type a fraction like 3/8.',steps:simpE(a*c,b*d,[`Multiply the numerators and the denominators: ${F(`${a} × ${c}`,`${b} × ${d}`)} = ${F(a*c,b*d)}.`])}}
    if(v===1){const d=R(2,9),n=R(1,d-1),k=R(2,6);return Math.random()<.5?{q:`${F(n,d)} ÷ ${k} = ?`,ans:[n,d*k],kind:'frac',hint:'Type a fraction like 1/6.',steps:simpE(n,d*k,[`Dividing by ${k} is the same as multiplying by ${F(1,k)}.`,`${F(n,d)} × ${F(1,k)} = ${F(n,d*k)}.`])}
      :{q:`${k} ÷ ${F(n,d)} = ?`,ans:[k*d,n],kind:'frac',hint:'Type a fraction or a whole number.',steps:simpE(k*d,n,[`Dividing by a fraction = multiplying by its reciprocal ${F(d,n)}.`,`${k} × ${F(d,n)} = ${F(k*d,n)}.`])}}
    const b=R(2,9),a=R(1,b-1),d=R(2,9),c=R(1,d-1);return {q:`${F(a,b)} ÷ ${F(c,d)} = ?`,ans:[a*d,b*c],kind:'frac',hint:'Type a fraction like 3/4.',steps:simpE(a*d,b*c,[`Flip the second fraction and multiply: ${F(a,b)} × ${F(d,c)} = ${F(a*d,b*c)}.`])}},
  ePlace(p){let n,s;
    if(LV===1){let i;do{n=R(10**(p-1),10**p-1);s=String(n);const ok=[...Array(p).keys()].filter(j=>s[j]!=='0'&&j<p-1&&s.split(s[j]).length===2);i=ok.length?pick(ok):-1}while(i<0);
      const dig=+s[i],pl=p-1-i,val=dig*10**pl;
      return {q:`What is the value of the digit <b>${dig}</b> in <b>${fE(n)}</b>?`,ans:val,kind:'int',steps:[`The digit ${dig} is in the ${PL[pl]} place.`,`Its value is ${dig} × ${fE(10**pl)} = <b>${fE(val)}</b>.`]}}
    n=R(10**(p-1),10**p-1);s=String(n);
    if(LV===2){const parts=[...s].map((c,i)=>+c*10**(p-1-i)).filter(x=>x>0),k=R(0,parts.length-1);
      return {q:`${parts.map((x,i)=>i===k?'?':fE(x)).join(' + ')} = ${fE(n)}`,ans:parts[k],kind:'int',steps:[`Write ${fE(n)} in expanded form: ${parts.map(fE).join(' + ')}.`,`The missing part is <b>${fE(parts[k])}</b>.`]}}
    return {q:`Write in numerals: <b>${words(n)}</b>`,ans:n,kind:'int',hint:'Type the number only.',steps:[`Read it part by part: ${words(n)}.`,`In numerals: <b>${fE(n)}</b>.`]}},
  eRound(p){const to=p===1?pick([10,100]):pick(D([10,100],[100,1000],[1000,10000]));
    if(p===2&&LV===3&&Math.random()<.4){const a=R(1000,9999),b=R(1000,9999),ra=Math.round(a/100)*100,rb=Math.round(b/100)*100;
      return {q:`Estimate ${fE(a)} + ${fE(b)} by rounding each number to the nearest hundred.`,ans:ra+rb,kind:'int',steps:[`${fE(a)} ≈ ${fE(ra)} and ${fE(b)} ≈ ${fE(rb)}.`,`${fE(ra)} + ${fE(rb)} = <b>${fE(ra+rb)}</b>.`]}}
    let n;do{n=R(to+1,p===1?999:D(9999,99999,999999))}while(n%to===0);const r=Math.round(n/to)*to,dg=Math.floor(n%to/(to/10));
    return {q:`Round <b>${fE(n)}</b> to the nearest ${fE(to)}.`,ans:r,kind:'int',steps:[`Look at the digit to the right of the ${fE(to)}s place: ${dg}.`,`${dg>=5?`${dg} is 5 or more, so round up`:`${dg} is less than 5, so round down`}: <b>${fE(r)}</b>.`]}},
  eFactors(p){const fac=n=>[...Array(n)].map((_,i)=>i+1).filter(i=>n%i===0);
    if(p===1){if(LV===1){const n=pick([12,16,18,20,24,30,36]),good=pick(fac(n).filter(x=>x>1&&x<n)),bad=shuffle([...Array(n)].map((_,i)=>i+2).filter(x=>n%x&&x<n)).slice(0,3);
        return {q:`Which number is a factor of <b>${n}</b>?`,ans:String(good),kind:'str',choices:shuffle([good,...bad]).map(String),steps:[`A factor divides ${n} exactly.`,`${n} ÷ ${good} = ${n/good}. So <b>${good}</b>.`,`Factors of ${n}: ${fac(n).join(', ')}.`]}}
      if(LV===2){const a=R(3,12),k=R(4,12);return {q:`What is the ${ord(k)} multiple of ${a}?`,ans:a*k,kind:'int',steps:[`Multiples of ${a}: ${[1,2,3].map(i=>a*i).join(', ')}, ...`,`The ${ord(k)} multiple is ${a} × ${k} = <b>${a*k}</b>.`]}}
      const n=pick([12,18,20,24,28,30,36,40,48]),f=fac(n);return {q:`How many factors does ${n} have?`,ans:f.length,kind:'int',steps:[`Factors of ${n}: ${f.join(', ')}.`,`There are <b>${f.length}</b>.`]}}
    const a=R(2,12)*pick([2,3]),b=R(2,12)*pick([2,3]);if(a===b)return this.eFactors(p);
    if(LV<3){const h=Math.random()<.5;return h?{q:`Find the highest common factor (HCF) of ${a} and ${b}.`,ans:gcd(a,b),kind:'int',steps:[`Factors of ${a}: ${fac(a).join(', ')}.`,`Factors of ${b}: ${fac(b).join(', ')}.`,`The highest common factor is <b>${gcd(a,b)}</b>.`]}
      :{q:`Find the lowest common multiple (LCM) of ${a} and ${b}.`,ans:lcm(a,b),kind:'int',steps:[`List multiples of the larger number, ${Math.max(a,b)}, until one is also a multiple of ${Math.min(a,b)}.`,`The lowest common multiple is <b>${lcm(a,b)}</b>.`]}}
    if(Math.random()<.5){const x=R(2,9),y=R(2,9);return {q:`Bus A leaves every ${x*2} minutes and bus B every ${y*3} minutes. They both leave at 8:00. After how many minutes do they next leave together?`,ans:lcm(x*2,y*3),kind:'int',steps:[`We need the LCM of ${x*2} and ${y*3}.`,`LCM = <b>${lcm(x*2,y*3)}</b> minutes.`]}}
    const g=R(2,8),r=g*R(2,6),bl=g*R(2,6);return {q:`${r} red beads and ${bl} blue beads are packed into identical bags with no beads left over. What is the greatest number of bags?`,ans:gcd(r,bl),kind:'int',steps:[`We need the HCF of ${r} and ${bl}.`,`HCF = <b>${gcd(r,bl)}</b>.`]}},
  eMulLong(p){
    if(p===1){if(LV===1){const a=R(12,99),b=R(2,9),t=a-a%10;return {q:`${a} × ${b} = ?`,ans:a*b,kind:'int',steps:[`Split ${a} = ${t} + ${a%10}.`,`${t} × ${b} = ${t*b}, ${a%10} × ${b} = ${a%10*b}.`,`${t*b} + ${a%10*b} = <b>${fE(a*b)}</b>.`]}}
      if(LV===2){const a=R(101,999),b=R(2,9),h=a-a%100,t=a%100-a%10,u=a%10;return {q:`${a} × ${b} = ?`,ans:a*b,kind:'int',steps:[`Split ${a} = ${h} + ${t} + ${u}.`,`${h*b} + ${t*b} + ${u*b} = <b>${fE(a*b)}</b>.`]}}
      let a,b;do{a=R(20,999);b=R(3,9)}while(a%b===0);const q=Math.floor(a/b),r=a%b,rem=Math.random()<.5;
      return {q:`${a} ÷ ${b} = ? remainder ?<br>What is the ${rem?'remainder':'quotient'}?`,ans:rem?r:q,kind:'int',steps:[`${b} × ${q} = ${b*q}, and ${a} − ${b*q} = ${r}.`,`So ${a} ÷ ${b} = ${q} remainder ${r}. The ${rem?'remainder':'quotient'} is <b>${rem?r:q}</b>.`]}}
    if(LV<3){const a=LV===1?R(12,99):R(101,999),b=R(12,99),bt=b-b%10,bu=b%10;
      return {q:`${a} × ${b} = ?`,ans:a*b,kind:'int',steps:[`Split ${b} = ${bt} + ${bu}.`,`${a} × ${bt} = ${fE(a*bt)} and ${a} × ${bu} = ${fE(a*bu)}.`,`${fE(a*bt)} + ${fE(a*bu)} = <b>${fE(a*b)}</b>.`]}}
    const b=R(3,9),q=R(120,1100),a=b*q;return {q:`${fE(a)} ÷ ${b} = ?`,ans:q,kind:'int',steps:[`Divide place by place, starting from the thousands.`,`Check: ${b} × ${fE(q)} = ${fE(a)}. So the answer is <b>${fE(q)}</b>.`]}},
  eDecimal(p){
    if(p===1){if(LV===1){const n=R(1,9),d=pick([10,100]),m=d===10?n:R(11,99);return {q:`Write ${F(m,d)} as a decimal.`,ans:m/d,kind:'dec',hint:'Type a decimal like 0.7.',steps:[`${d===10?'Tenths have one':'Hundredths have two'} digit${d===10?'':'s'} after the decimal point.`,`${F(m,d)} = <b>${m/d}</b>.`]}}
      if(LV===2){let n;do{n=R(1001,9999)}while(n%10===0||String(n).slice(1).includes('0'));const s=(n/100).toFixed(2),i=pick([1,2]),dig=s[s.length-3+i],ans=i===1?`0.${dig}`:`0.0${dig}`;
        return {q:`What is the value of the digit <b>${dig}</b> in <b>${s}</b>?`,ans,kind:'str',choices:strChoices(ans,[dig,`0.${dig}`,`0.0${dig}`,`${dig}0`]),steps:[`The digit ${dig} is in the ${i===1?'tenths':'hundredths'} place.`,`Its value is <b>${ans}</b>.`]}}
      const vs=[];while(vs.length<4){const x=R(100,999)/100;if(!vs.includes(x))vs.push(x)}const big=Math.random()<.5,t=big?Math.max(...vs):Math.min(...vs);
      return {q:`Which decimal is the ${big?'greatest':'smallest'}?`,ans:t.toFixed(2),kind:'str',choices:vs.map(x=>x.toFixed(2)),steps:[`Compare the ones, then the tenths, then the hundredths.`,`The ${big?'greatest':'smallest'} is <b>${t.toFixed(2)}</b>.`]}}
    if(p===2){const pl=LV===1?1:2,sc=10**pl,plus=Math.random()<.5;let a=R(sc+1,sc*20),b=R(1,sc*10);if(!plus&&b>=a)[a,b]=[b+sc,a];
      const r=plus?a+b:a-b,fd=x=>(x/sc).toFixed(pl);
      if(LV===3){const o=nmE();return {q:plus?`${o} buys a book for $${fd(a)} and a pen for $${fd(b)}. How much does ${o} spend in dollars?`:`A ribbon is ${fd(a)} m long. ${o} cuts off ${fd(b)} m. How long is the ribbon now in metres?`,ans:r/sc,kind:'dec',hint:'Type a decimal like 4.75.',
        steps:[`Line up the decimal points: ${fd(a)} ${plus?'+':'−'} ${fd(b)}.`,`= <b>${fd(r)}</b>.`]}}
      return {q:`${fd(a)} ${plus?'+':'−'} ${fd(b)} = ?`,ans:r/sc,kind:'dec',hint:'Type a decimal like 3.5.',steps:[`Line up the decimal points.`,`${fd(a)} ${plus?'+':'−'} ${fd(b)} = <b>${fd(r)}</b>.`]}}
    const k=pick(D([10],[10,100],[10,100,1000])),pl=String(k).length-1,i=R(11,999),x=i/100,mul=Math.random()<.5;
    const ans=mul?i*k/100:i/(100*k),dp=Math.max(0,mul?2-pl:2+pl);
    return {q:`${x} ${mul?'×':'÷'} ${fE(k)} = ?`,ans,kind:'dec',hint:'Type a decimal or whole number.',steps:[`${mul?'Multiplying':'Dividing'} by ${fE(k)} moves each digit ${pl} place${pl>1?'s':''} to the ${mul?'left':'right'}.`,`${x} ${mul?'×':'÷'} ${fE(k)} = <b>${parseFloat(ans.toFixed(dp))}</b>.`]}},
  eAreaPer(p){const u=12;
    if(p===1){const sq=Math.random()<.4,l=R(3,15),b=sq?l:R(2,l-1),area=Math.random()<.5,sh=sq?'square':'rectangle',dims=sq?`sides of ${l} cm`:`length ${l} cm and width ${b} cm`;
      return area?{q:`A ${sh} has ${dims}. What is its area in cm²?`,ans:l*b,kind:'int',steps:[`Area = length × width.`,`${l} × ${b} = <b>${l*b}</b> cm².`]}
        :{q:`A ${sh} has ${dims}. What is its perimeter in cm?`,ans:2*(l+b),kind:'int',steps:[`Perimeter = add all the sides = 2 × (${l} + ${b}).`,`= <b>${2*(l+b)}</b> cm.`]}}
    if(p===2){const v=v3([0,1],[1,2],[2,3]);
      if(v===0){const s=R(3,25);return {q:`A square has a perimeter of ${4*s} cm. How long is one side?`,ans:s,kind:'int',steps:[`All 4 sides are equal, so side = ${4*s} ÷ 4.`,`= <b>${s}</b> cm.`]}}
      if(v===1){const s=R(3,12);return {q:`A square has an area of ${s*s} cm². How long is one side?`,ans:s,kind:'int',steps:[`Find the number that times itself makes ${s*s}.`,`${s} × ${s} = ${s*s}, so the side is <b>${s}</b> cm.`]}}
      const l=R(5,20),b=R(2,l-1);if(v===2)return {q:`A rectangle has an area of ${l*b} cm² and a length of ${l} cm. What is its width?`,ans:b,kind:'int',steps:[`Width = area ÷ length.`,`${l*b} ÷ ${l} = <b>${b}</b> cm.`]};
      return {q:`A rectangle has a perimeter of ${2*(l+b)} cm and a length of ${l} cm. What is its width?`,ans:b,kind:'int',steps:[`Length + width = ${2*(l+b)} ÷ 2 = ${l+b}.`,`Width = ${l+b} − ${l} = <b>${b}</b> cm.`]}}
    const W=R(6,10),H=R(5,9),w=R(2,W-3),h=R(2,H-3),X=W*u,Y=H*u,area=LV===1||Math.random()<.6;
    const s=`<polygon points="4,4 ${4+(W-w)*u},4 ${4+(W-w)*u},${4+h*u} ${4+X},${4+h*u} ${4+X},${4+Y} 4,${4+Y}" ${ST}/>${tl(4+X/2,Y+20,`${W} cm`)}${tl(4+(W-w)*u/2,0,`${W-w} cm`)}${tl(8+X,4+h*u+(Y-h*u)/2+4,`${H-h} cm`,'start')}${tl(0,4+Y/2,`${H} cm`,'end')}`;
    return area?{q:`Find the area of this L-shaped figure in cm².${SVG(s,`-36 -14 ${X+90} ${Y+40}`,300)}`,ans:W*H-w*h,kind:'int',
        steps:[`Think of a ${W} cm × ${H} cm rectangle: ${W*H} cm².`,`The missing corner is ${w} cm × ${h} cm = ${w*h} cm².`,`${W*H} − ${w*h} = <b>${W*H-w*h}</b> cm².`]}
      :{q:`Find the perimeter of this L-shaped figure in cm.${SVG(s,`-36 -14 ${X+90} ${Y+40}`,300)}`,ans:2*(W+H),kind:'int',
        steps:[`The two unknown sides are ${W} − ${W-w} = ${w} cm and ${H} − ${H-h} = ${h} cm.`,`Add all six sides: ${W} + ${H} + ${W-w} + ${h} + ${w} + ${H-h} = <b>${2*(W+H)}</b> cm.`]}},
  eAngles(p){
    if(p===1){if(LV===3&&Math.random()<.4){const t=pick([['a quarter turn',90],['a half turn',180],['a three-quarter turn',270],['a full turn',360]]);
        return {q:`How many degrees are there in ${t[0]}?`,ans:t[1],kind:'int',steps:[`A full turn is 360°.`,`${cap(t[0])} = <b>${t[1]}°</b>.`]}}
      const d=pick([pick([25,35,45,60,70]),90,pick([110,125,140,155])]);return {q:`What type of angle is this?${angleSVG(d)}`,ans:ANG(d),kind:'str',choices:['Acute','Right angle','Obtuse'],
        steps:[`Compare it with a right angle (the corner of a book).`,`It is ${d<90?'smaller than':d===90?'exactly':'larger than'} a right angle, so it is <b>${ANG(d).toLowerCase()}</b>.`]}}
    if(p===2){const v=v3([0],[0,1],[1,2]);
      if(v===0){const a=R(20,160);return {q:`Two angles lie on a straight line. One is ${a}°. What is the other angle?`,ans:180-a,kind:'int',hint:'Type the number of degrees.',steps:[`Angles on a straight line add up to 180°.`,`180° − ${a}° = <b>${180-a}°</b>.`]}}
      if(v===1){const a=R(60,150),b=R(40,200-a);return {q:`Three angles meet at a point. Two of them are ${a}° and ${b}°. What is the third angle?`,ans:360-a-b,kind:'int',hint:'Type the number of degrees.',steps:[`Angles at a point add up to 360°.`,`360° − ${a}° − ${b}° = <b>${360-a-b}°</b>.`]}}
      const a=R(25,155);return {q:`Two straight lines cross. One of the angles is ${a}°. What is the angle vertically opposite to it?`,ans:a,kind:'int',hint:'Type the number of degrees.',steps:[`Vertically opposite angles are equal.`,`So it is <b>${a}°</b>.`]}}
    const v=v3([0],[0,1],[1,2]);
    if(v===0){const a=R(30,90),b=R(20,150-a);return {q:`Two angles of a triangle are ${a}° and ${b}°. What is the third angle?`,ans:180-a-b,kind:'int',hint:'Type the number of degrees.',steps:[`The angles of a triangle add up to 180°.`,`180° − ${a}° − ${b}° = <b>${180-a-b}°</b>.`]}}
    if(v===1){const ap=R(10,80)*2;return {q:`An isosceles triangle has an angle of ${ap}° between its two equal sides. What is the size of each of the other two angles?`,ans:(180-ap)/2,kind:'int',hint:'Type the number of degrees.',
      steps:[`The other two angles are equal and add up to 180° − ${ap}° = ${180-ap}°.`,`${180-ap}° ÷ 2 = <b>${(180-ap)/2}°</b>.`]}}
    const a=R(60,120),b=R(60,120),c=R(50,110);if(a+b+c>=350)return this.eAngles(p);
    return {q:`Three angles of a quadrilateral are ${a}°, ${b}° and ${c}°. What is the fourth angle?`,ans:360-a-b-c,kind:'int',hint:'Type the number of degrees.',steps:[`The angles of a quadrilateral add up to 360°.`,`360° − ${a}° − ${b}° − ${c}° = <b>${360-a-b-c}°</b>.`]}},
  eLines(){const t=pick(['p','q','r']);
    const s={p:`<line x1="10" y1="22" x2="110" y2="22" stroke="#1F2A2E" stroke-width="4"/><line x1="10" y1="62" x2="110" y2="62" stroke="#F2701D" stroke-width="4"/>`,
      q:`<line x1="10" y1="45" x2="110" y2="45" stroke="#1F2A2E" stroke-width="4"/><line x1="60" y1="5" x2="60" y2="85" stroke="#F2701D" stroke-width="4"/><path d="M60 33 H72 V45" fill="none" stroke="#1F2A2E" stroke-width="2"/>`,
      r:`<line x1="10" y1="70" x2="110" y2="20" stroke="#1F2A2E" stroke-width="4"/><line x1="20" y1="15" x2="100" y2="80" stroke="#F2701D" stroke-width="4"/>`}[t];
    const ans={p:'Parallel',q:'Perpendicular',r:'Neither'}[t];
    return {q:`Are these two lines parallel, perpendicular or neither?${SVG(s)}`,ans,kind:'str',choices:['Parallel','Perpendicular','Neither'],
      steps:[{p:`The lines stay the same distance apart and never meet.`,q:`The lines meet at a right angle.`,r:`The lines cross, but not at a right angle.`}[t],`So the answer is <b>${ans.toLowerCase()}</b>.`]}},
  eSymmetry(){const S=pick(D([['square',4],['rectangle',2],['equilateral triangle',3],['isosceles triangle',1]],[['square',4],['rectangle',2],['equilateral triangle',3],['regular pentagon',5],['regular hexagon',6],['kite',1]],[['regular hexagon',6],['regular octagon',8],['rhombus',2],['kite',1],['parallelogram',0],['regular pentagon',5]]));
    return {q:`How many lines of symmetry does a <b>${S[0]}</b> have?`,ans:S[1],kind:'int',steps:[`A line of symmetry folds the shape into two matching halves.`,S[0].startsWith('regular')||S[0]==='equilateral triangle'?`A regular shape has as many lines of symmetry as sides.`:`Try folding it every way you can.`,`A ${S[0]} has <b>${S[1]}</b>.`]}},
  e3D(){const v=v3([0],[0,1],[1,2]);
    if(v===2){const b=pick(SOL.filter(x=>x.f)),w=pick(['faces','edges','vertices']),k={faces:'f',edges:'e',vertices:'v'}[w];
      return {q:`How many ${w} does a <b>${b.n.toLowerCase()}</b> have?`,ans:b[k],kind:'int',steps:[`A ${b.n.toLowerCase()} has ${b.f} faces, ${b.e} edges and ${b.v} vertices.`,`So it has <b>${b[k]}</b> ${w}.`]}}
    const b=pick(SOL),pool=SOL.map(x=>x.n);
    if(v===0)return {q:`${cap(b.x)} has the shape of a ...`,ans:b.n,kind:'str',choices:strChoices(b.n,pool),steps:[`${cap(b.x)} has ${b.d}.`,`That is a <b>${b.n.toLowerCase()}</b>.`]};
    return {q:`Which solid has ${b.d}?`,ans:b.n,kind:'str',choices:strChoices(b.n,pool),steps:[`A <b>${b.n.toLowerCase()}</b> has ${b.d}, like ${b.x}.`]}},
  eNegative(){const v=v3([0],[0,1],[1,2]);
    if(v===0){let a=R(-10,10),b=R(-10,10);while(a===b)b=R(-10,10);const cold=Math.random()<.5,t=cold?Math.min(a,b):Math.max(a,b),f=x=>`${x}°C`;
      return {q:`Which temperature is ${cold?'colder':'warmer'}: ${f(a)} or ${f(b)}?`,ans:f(t),kind:'str',choices:[f(a),f(b)],steps:[`On a number line, numbers further left are smaller (colder).`,`${f(t)} is ${cold?'colder':'warmer'}.`]}}
    if(v===1){const a=R(-8,6),c=R(2,12),up=Math.random()<.5,r=up?a+c:a-c;return {q:`The temperature is ${a}°C. It ${up?'rises':'falls'} by ${c}°C. What is the new temperature?`,ans:r,kind:'int',hint:'Use − for negative numbers, e.g. -4.',
      steps:[`${up?'Count up':'Count down'} ${c} from ${a} on the number line.`,`${a} ${up?'+':'−'} ${c} = <b>${r}</b>°C.`]}}
    const a=R(1,15),b=-R(1,12);return {q:`At noon it was ${a}°C. At midnight it was ${b}°C. By how many degrees did the temperature fall?`,ans:a-b,kind:'int',steps:[`From ${a} down to 0 is ${a}°, from 0 down to ${b} is ${-b}°.`,`${a} + ${-b} = <b>${a-b}</b>°C.`]}},
  eChance(p){
    if(p===1){const r=R(0,8),b=R(0,8),tot=r+b;if(tot===0||r===b)return this.eChance(p);const col=pick(['red','blue','green']),c=col==='red'?r:col==='blue'?b:0;
      const ans=c===0?'Impossible':c===tot?'Certain':c*2>tot?'Likely':'Unlikely';
      return {q:`A bag has ${r} red ${r===1?'ball':'balls'} and ${b} blue ${b===1?'ball':'balls'}. One ball is picked without looking. How likely is it to be <b>${col}</b>?`,ans,kind:'str',choices:['Impossible','Unlikely','Likely','Certain'],
        steps:[`There ${c===1?'is':'are'} ${c} ${col} out of ${tot} balls.`,c===0?`There are no ${col} balls, so it is <b>impossible</b>.`:c===tot?`Every ball is ${col}, so it is <b>certain</b>.`:`${c} is ${c*2>tot?'more':'less'} than half of ${tot}, so it is <b>${ans.toLowerCase()}</b>.`]}}
    if(LV===1||Math.random()<.4){const [t,S]=pick([['a 4',[4]],['an even number',[2,4,6]],['a number greater than 4',[5,6]],['a number less than 3',[1,2]],['a multiple of 3',[3,6]]]);
      return {q:`A fair dice is rolled once. What is the probability of rolling ${t}?`,ans:[S.length,6],kind:'frac',hint:'Type a fraction like 1/6.',steps:simpE(S.length,6,[`There are 6 possible outcomes.`,`Favourable outcomes: ${S.join(', ')} (${S.length}).`,`Probability = ${F(S.length,6)}.`])}}
    const r=R(2,6),b=R(2,6),g=R(1,5),tot=r+b+g,[w,c]=pick([['red',r],['blue',b],['green',g]]);
    return {q:`A bag has ${r} red, ${b} blue and ${g} green marbles. One is picked at random. What is the probability that it is ${w}?`,ans:[c,tot],kind:'frac',hint:'Type a fraction like 2/9.',
      steps:simpE(c,tot,[`Total marbles: ${r} + ${b} + ${g} = ${tot}.`,`${cap(w)} marbles: ${c}, so the probability is ${F(c,tot)}.`])}},
  eCoord(p){
    if(p===1){const x=R(1,7),y=R(1,7),ans=`(${x}, ${y})`;return {q:`What are the coordinates of point A?${gridSVG(0,8,[[x,y,'A']])}`,ans,kind:'str',choices:strChoices(ans,[`(${y}, ${x})`,`(${x+1}, ${y})`,`(${x}, ${y+1})`,`(${x-1}, ${y-1})`]),
      steps:[`Read across the x-axis first: ${x}.`,`Then up the y-axis: ${y}.`,`A is at <b>${ans}</b>.`]}}
    let x,y;do{x=R(-4,4);y=R(-4,4)}while(x===0||y===0||(LV>1&&x>0&&y>0));const ans=`(${x}, ${y})`;
    return {q:`What are the coordinates of point B?${gridSVG(-5,5,[[x,y,'B']])}`,ans,kind:'str',choices:strChoices(ans,[`(${y}, ${x})`,`(${-x}, ${y})`,`(${x}, ${-y})`,`(${-x}, ${-y})`]),
      steps:[`x: B is ${Math.abs(x)} ${x<0?'left':'right'} of the origin, so x = ${x}.`,`y: B is ${Math.abs(y)} ${y<0?'down':'up'}, so y = ${y}.`,`B is at <b>${ans}</b>.`]}},
  eStats(p){
    if(p===1){const v=v3([0],[0,1],[1,2]);
      if(v===0){const m=R(2,9),data=shuffle([m,m,m,...[...Array(R(3,5))].map(()=>{let x;do{x=R(1,9)}while(x===m);return x})]);
        const cnt={};data.forEach(x=>cnt[x]=(cnt[x]||0)+1);if(Object.values(cnt).filter(c=>c>=3).length>1)return this.eStats(p);
        return {q:`Find the mode: <b>${data.join(', ')}</b>`,ans:m,kind:'int',steps:[`The mode is the value that appears most often.`,`${m} appears ${cnt[m]} times, so the mode is <b>${m}</b>.`]}}
      const n=v===1?pick([5,7]):pick([4,6]),data=[...Array(n)].map(()=>R(1,30)),s=data.slice().sort((a,b)=>a-b);
      if(n%2===0&&(s[n/2-1]+s[n/2])%2)return this.eStats(p);const md=n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2;
      return {q:`Find the median: <b>${data.join(', ')}</b>`,ans:md,kind:'int',steps:[`Put the numbers in order: ${s.join(', ')}.`,n%2?`The middle number is <b>${md}</b>.`:`The two middle numbers are ${s[n/2-1]} and ${s[n/2]}; halfway between them is <b>${md}</b>.`]}}
    if(p===2){const v=v3([0,1],[0,1],[1,2]);const n=R(4,6);let data,sum;do{data=[...Array(n)].map(()=>R(2,20));sum=data.reduce((a,b)=>a+b,0)}while(sum%n);
      if(v===0){const mx=Math.max(...data),mn=Math.min(...data);return {q:`Find the range: <b>${data.join(', ')}</b>`,ans:mx-mn,kind:'int',steps:[`Range = largest − smallest.`,`${mx} − ${mn} = <b>${mx-mn}</b>.`]}}
      if(v===1)return {q:`Find the mean: <b>${data.join(', ')}</b>`,ans:sum/n,kind:'int',steps:[`Add them: ${data.join(' + ')} = ${sum}.`,`Divide by ${n}: ${sum} ÷ ${n} = <b>${sum/n}</b>.`]};
      const k=R(0,n-1),miss=data[k];return {q:`The mean of ${n} numbers is ${sum/n}. The numbers are ${data.map((x,i)=>i===k?'?':x).join(', ')}. What is the missing number?`,ans:miss,kind:'int',
        steps:[`Total = mean × count = ${sum/n} × ${n} = ${sum}.`,`Missing = ${sum} − (${data.filter((_,i)=>i!==k).join(' + ')}) = <b>${miss}</b>.`]}}
    const n=R(3,6),avg=R(50,90),x=R(50,100);if((avg*n+x)%(n+1))return this.eStats(p);const na=(avg*n+x)/(n+1);
    if(LV<3)return {q:`The average mass of ${n} boxes is ${avg} kg. What is the total mass of the boxes?`,ans:avg*n,kind:'int',steps:[`Total = average × number = ${avg} × ${n} = <b>${avg*n}</b> kg.`]};
    return {q:`${nmE()}'s average score in ${n} tests is ${avg}. After the next test, the average is ${na}. What was the score in that test?`,ans:x,kind:'int',
      steps:[`Total before: ${avg} × ${n} = ${avg*n}.`,`Total after: ${na} × ${n+1} = ${na*(n+1)}.`,`Score = ${na*(n+1)} − ${avg*n} = <b>${x}</b>.`]}},
  eOrderOps(){const v=v3([0],[0,1],[1,2]);
    if(v===0){const a=R(2,20),b=R(2,9),c=R(2,9),plus=Math.random()<.5;if(!plus&&a<b*c)return {q:`${b*c+a} − ${b} × ${c} = ?`,ans:a,kind:'int',steps:[`Multiply first: ${b} × ${c} = ${b*c}.`,`${b*c+a} − ${b*c} = <b>${a}</b>.`]};
      return {q:`${a} ${plus?'+':'−'} ${b} × ${c} = ?`,ans:plus?a+b*c:a-b*c,kind:'int',steps:[`Multiply first: ${b} × ${c} = ${b*c}.`,`${a} ${plus?'+':'−'} ${b*c} = <b>${plus?a+b*c:a-b*c}</b>.`]}}
    if(v===1){const a=R(2,15),b=R(2,15),c=R(2,6),d=R(1,(a+b)*c-1);return {q:`(${a} + ${b}) × ${c} − ${d} = ?`,ans:(a+b)*c-d,kind:'int',steps:[`Brackets first: ${a} + ${b} = ${a+b}.`,`Then multiply: ${a+b} × ${c} = ${(a+b)*c}.`,`Then subtract: ${(a+b)*c} − ${d} = <b>${(a+b)*c-d}</b>.`]}}
    const e=R(2,6),f=R(2,9)*e,b=R(5,12),c=R(1,b-1),a=R(2,6);return {q:`${a} × (${b} − ${c}) + ${f} ÷ ${e} = ?`,ans:a*(b-c)+f/e,kind:'int',
      steps:[`Brackets: ${b} − ${c} = ${b-c}.`,`Multiply and divide: ${a} × ${b-c} = ${a*(b-c)}, ${f} ÷ ${e} = ${f/e}.`,`Add: ${a*(b-c)} + ${f/e} = <b>${a*(b-c)+f/e}</b>.`]}},
  eTriArea(){const b=R(2,12)*2,h=R(3,15),A=b*h/2;
    if(LV<3||Math.random()<.5){const s=`<polygon points="10,80 110,80 ${R(30,90)},10" ${ST}/>`;
      return {q:`A triangle has a base of ${b} cm and a height of ${h} cm. What is its area in cm²?${SVG(s)}`,ans:A,kind:'int',steps:[`Area of a triangle = ½ × base × height.`,`½ × ${b} × ${h} = <b>${A}</b> cm².`]}}
    return {q:`A triangle has an area of ${A} cm² and a base of ${b} cm. What is its height?`,ans:h,kind:'int',steps:[`Height = 2 × area ÷ base.`,`2 × ${A} ÷ ${b} = <b>${h}</b> cm.`]}},
  eVolume(p){
    if(p===1){const l=R(2,D(5,10,20)),b=R(2,D(4,8,15)),h=R(2,D(4,8,12));
      if(LV<3)return {q:`A cuboid is ${l} cm long, ${b} cm wide and ${h} cm high. What is its volume in cm³?`,ans:l*b*h,kind:'int',steps:[`Volume = length × width × height.`,`${l} × ${b} × ${h} = <b>${fE(l*b*h)}</b> cm³.`]};
      const L=R(2,5)*10,B=R(2,5)*10,H=R(1,4)*10;return {q:`A tank measures ${L} cm by ${B} cm by ${H} cm. How many litres of water can it hold? (1 ℓ = 1,000 cm³)`,ans:L*B*H/1000,kind:'int',
        steps:[`Volume = ${L} × ${B} × ${H} = ${fE(L*B*H)} cm³.`,`${fE(L*B*H)} ÷ 1,000 = <b>${L*B*H/1000}</b> ℓ.`]}}
    const v=v3([0],[0,1],[1,2]);
    if(v===0){const s=R(2,10);return {q:`A cube has a volume of ${s**3} cm³. What is the length of one edge?`,ans:s,kind:'int',steps:[`Find the number that, multiplied by itself 3 times, makes ${s**3}.`,`${s} × ${s} × ${s} = ${s**3}, so the edge is <b>${s}</b> cm.`]}}
    const l=R(3,15),b=R(3,12),h=R(2,10);
    if(v===1)return {q:`A cuboid has a volume of ${fE(l*b*h)} cm³. Its length is ${l} cm and its width is ${b} cm. What is its height?`,ans:h,kind:'int',steps:[`Height = volume ÷ (length × width).`,`${fE(l*b*h)} ÷ ${l*b} = <b>${h}</b> cm.`]};
    const L=R(2,5)*10,B=R(2,5)*10,wh=R(2,9),V=L*B*wh;
    return {q:`A rectangular tank has a base of ${L} cm by ${B} cm. ${fE(V)} cm³ of water is poured in. How high is the water, in cm?`,ans:wh,kind:'int',
      steps:[`Height = volume ÷ base area.`,`${fE(V)} ÷ (${L} × ${B}) = ${fE(V)} ÷ ${fE(L*B)} = <b>${wh}</b> cm.`]}},
  ePercent(p){
    if(p===1){const [a,b]=pick([[1,2],[1,4],[3,4],[1,5],[2,5],[3,5],[4,5],[1,10],[3,10],[7,10],[1,20],[9,20],[1,25]]),pc=a*100/b;
      if(LV===3&&Math.random()<.5)return {q:`Write ${pc}% as a decimal.`,ans:pc/100,kind:'dec',hint:'Type a decimal like 0.35.',steps:[`Per cent means out of 100.`,`${pc}% = ${F(pc,100)} = <b>${pc/100}</b>.`]};
      return {q:`Write ${F(a,b)} as a percentage.`,ans:pc,kind:'int',hint:'Type the number only.',steps:[`Make the denominator 100: ${F(a,b)} = ${F(pc,100)}.`,`So it is <b>${pc}%</b>.`]}}
    if(p===2){const pc=pick(D([10,25,50],[10,20,25,50,75],[5,12,15,35,45,60])),n=R(2,20)*20,r=n*pc/100;if(!Number.isInteger(r))return this.ePercent(p);
      return {q:`What is ${pc}% of ${n}?`,ans:r,kind:'int',steps:[`${pc}% = ${F(pc,100)}.`,`${F(pc,100)} × ${n} = <b>${r}</b>.`]}}
    const pr=R(1,20)*20,pc=pick([10,20,25,30,40,50]),off=pr*pc/100;
    if(LV<3||Math.random()<.5)return {q:`A bag costs $${pr}. It is sold at ${pc}% off. What is the sale price in dollars?`,ans:pr-off,kind:'int',steps:[`Discount = ${pc}% of $${pr} = $${off}.`,`Sale price = $${pr} − $${off} = <b>$${pr-off}</b>.`]};
    const up=Math.random()<.5,nw=up?pr+off:pr-off;return {q:`The price of a toy ${up?'increased':'decreased'} from $${pr} to $${nw}. What is the percentage ${up?'increase':'decrease'}?`,ans:pc,kind:'int',hint:'Type the number only.',
      steps:[`Change = $${off}.`,`${off} ÷ ${pr} × 100% = <b>${pc}%</b>.`]}},
  eRatio(p){
    if(p===1){const a=R(1,9),b=R(1,9);if(a===b||gcd(a,b)>1)return this.eRatio(p);const k=R(2,D(4,6,9)),ans=`${a} : ${b}`;
      if(LV===3)return {q:`${a} : ${b} = ${a*k} : ?`,ans:b*k,kind:'int',steps:[`${a} × ${k} = ${a*k}, so multiply ${b} by ${k} too.`,`${b} × ${k} = <b>${b*k}</b>.`]};
      return {q:`Write <b>${a*k} : ${b*k}</b> in its simplest form.`,ans,kind:'str',choices:strChoices(ans,[`${b} : ${a}`,`${a*k/ (k%2?1:2)} : ${b*k/(k%2?1:2)}`,`${a+1} : ${b}`,`${a} : ${b+1}`]),
        steps:[`Divide both parts by ${k}, their highest common factor.`,`${a*k} ÷ ${k} : ${b*k} ÷ ${k} = <b>${ans}</b>.`]}}
    const a=R(1,7),b=R(1,7);if(a===b)return this.eRatio(p);const u=R(2,15),o=nmE(),T=(a+b)*u;
    if(LV<3||Math.random()<.5){const first=Math.random()<.5;return {q:`${o} and Sam share $${T} in the ratio ${a} : ${b}. How much does ${first?o:'Sam'} get in dollars?`,ans:(first?a:b)*u,kind:'int',
      steps:[`Total units: ${a} + ${b} = ${a+b}.`,`1 unit = $${T} ÷ ${a+b} = $${u}.`,`${first?o:'Sam'} gets ${first?a:b} × $${u} = <b>$${(first?a:b)*u}</b>.`]}}
    const d=Math.abs(a-b)*u;return {q:`The ratio of boys to girls is ${a} : ${b}. There are ${d} more ${a>b?'boys':'girls'} than ${a>b?'girls':'boys'}. How many children are there in total?`,ans:T,kind:'int',
      steps:[`The difference is ${Math.abs(a-b)} units = ${d}, so 1 unit = ${u}.`,`Total = ${a+b} units = ${a+b} × ${u} = <b>${T}</b>.`]}},
  eRate(){const v=v3([0],[0,1],[1,2]);
    if(v===0){const r=R(2,15),n=R(2,12);return {q:`One notebook costs $${r}. How much do ${n} notebooks cost in dollars?`,ans:r*n,kind:'int',steps:[`Cost = rate × quantity = $${r} × ${n} = <b>$${r*n}</b>.`]}}
    if(v===1){const r=R(3,20),n=R(2,10);return {q:`A machine makes ${r*n} toys in ${n} minutes. How many toys does it make in 1 minute?`,ans:r,kind:'int',steps:[`Rate = ${r*n} ÷ ${n} = <b>${r}</b> toys per minute.`]}}
    const r=R(3,9),n=R(2,6),m=R(2,9);return {q:`A tap fills ${r*n} ℓ in ${n} minutes. How many litres does it fill in ${m} minutes?`,ans:r*m,kind:'int',steps:[`In 1 minute: ${r*n} ÷ ${n} = ${r} ℓ.`,`In ${m} minutes: ${r} × ${m} = <b>${r*m}</b> ℓ.`]}},
  eAlgebra(){const v=v3([0],[0,1],[1,2]);
    if(v===0){const a=R(2,9),b=R(1,20),n=R(2,12);return {q:`Find the value of <b>${a}n + ${b}</b> when n = ${n}.`,ans:a*n+b,kind:'int',steps:[`${a}n means ${a} × n = ${a} × ${n} = ${a*n}.`,`${a*n} + ${b} = <b>${a*n+b}</b>.`]}}
    if(v===1){const a=R(2,9),x=R(2,12),b=R(1,20);return {q:`Solve: <b>${a}x + ${b} = ${a*x+b}</b>. What is x?`,ans:x,kind:'int',steps:[`Subtract ${b} from both sides: ${a}x = ${a*x}.`,`Divide by ${a}: x = <b>${x}</b>.`]}}
    const k=R(2,6),c=R(2,9),y=R(3,15);return {q:`A pen costs y dollars. A bag costs $${c} more than ${k} pens. When y = ${y}, how much does the bag cost in dollars?`,ans:k*y+c,kind:'int',steps:[`Bag = ${k}y + ${c}.`,`= ${k} × ${y} + ${c} = <b>${k*y+c}</b>.`]}},
  eCircle(){const v=v3([0],[0,1],[1,2]);
    if(v===0){const r=R(2,30),toD=Math.random()<.5;return toD?{q:`A circle has a radius of ${r} cm. What is its diameter?`,ans:2*r,kind:'int',steps:[`Diameter = 2 × radius.`,`2 × ${r} = <b>${2*r}</b> cm.`]}
      :{q:`A circle has a diameter of ${2*r} cm. What is its radius?`,ans:r,kind:'int',steps:[`Radius = diameter ÷ 2.`,`${2*r} ÷ 2 = <b>${r}</b> cm.`]}}
    const r=R(1,5)*7;if(v===1)return {q:`Find the circumference of a circle with radius ${r} cm. (Take π = ²²⁄₇)`,ans:2*22*r/7,kind:'int',steps:[`Circumference = 2 × π × r.`,`2 × ²²⁄₇ × ${r} = <b>${2*22*r/7}</b> cm.`]};
    return {q:`Find the area of a circle with radius ${r} cm. (Take π = ²²⁄₇)`,ans:22*r*r/7,kind:'int',steps:[`Area = π × r × r.`,`²²⁄₇ × ${r} × ${r} = <b>${fE(22*r*r/7)}</b> cm².`]}},
  ePattern(p){const st=p===1?pick(D([1,2],[2,5,10],[2,5,10])):pick(D([10,100],[5,10,50,100],[25,50,100,250])),down=Math.random()<D(0,.3,.5);
    const a=down?R(st*5,st*5+(p===1?40:400)):R(0,p===1?50:500),q=[0,1,2,3,4].map(i=>a+(down?-1:1)*i*st);
    if(LV===3){const k=R(1,3);return {q:`Find the missing number: ${q.map((x,i)=>i===k?'?':fE(x)).join(', ')}`,ans:q[k],kind:'int',steps:[`The numbers ${down?'go down':'go up'} by ${st} each time.`,`${fE(q[k-1])} ${down?'−':'+'} ${st} = <b>${fE(q[k])}</b>.`]}}
    return {q:`What comes next? ${q.slice(0,4).map(fE).join(', ')}, ...`,ans:q[4],kind:'int',steps:[`The numbers ${down?'go down':'go up'} by ${st} each time.`,`${fE(q[3])} ${down?'−':'+'} ${st} = <b>${fE(q[4])}</b>.`]}},
  eOddEven(){const v=v3([0],[0,1],[1,2]);
    if(v===0){const n=R(1,D(20,100,100)),e=n%2===0;return {q:`Is <b>${n}</b> odd or even?`,ans:e?'Even':'Odd',kind:'str',choices:['Odd','Even'],steps:[`Look at the ones digit: ${n%10}.`,`${n%10} ${e?'can':'cannot'} be split into 2 equal groups, so ${n} is <b>${e?'even':'odd'}</b>.`]}}
    if(v===1){const n=R(10,98),e=Math.random()<.5;let a=n+1;while((a%2===0)!==e)a++;return {q:`What is the next ${e?'even':'odd'} number after <b>${n}</b>?`,ans:a,kind:'int',steps:[`${e?'Even':'Odd'} numbers end in ${e?'0, 2, 4, 6 or 8':'1, 3, 5, 7 or 9'}.`,`The next one after ${n} is <b>${a}</b>.`]}}
    const a=R(1,30),b=a+R(6,16),L=[];for(let i=a+1;i<b;i++)if(i%2===0)L.push(i);return {q:`How many even numbers are there between ${a} and ${b}?`,ans:L.length,kind:'int',steps:[`They are: ${L.join(', ')}.`,`That is <b>${L.length}</b> numbers.`]}},
  eDouble(){const v=v3([0],[0,1],[1,2]);
    if(v===0){const n=R(1,10);return {q:`What is double ${n}?`,ans:2*n,kind:'int',steps:[`Double means add the number to itself: ${n} + ${n} = <b>${2*n}</b>.`]}}
    if(v===1){const n=R(1,10)*2;return {q:`What is half of ${n}?`,ans:n/2,kind:'int',steps:[`Half means split into 2 equal parts.`,`${n} ÷ 2 = <b>${n/2}</b>.`]}}
    const n=R(11,25),d=Math.random()<.5;return d?{q:`What is double ${n}?`,ans:2*n,kind:'int',steps:[`Double the tens and the ones: ${n-n%10} + ${n-n%10} = ${2*(n-n%10)}, ${n%10} + ${n%10} = ${2*(n%10)}.`,`${2*(n-n%10)} + ${2*(n%10)} = <b>${2*n}</b>.`]}
      :{q:`What is half of ${2*n}?`,ans:n,kind:'int',steps:[`${2*n} ÷ 2 = <b>${n}</b>.`]}},
};

/* [id suffix, name, description, generator, param] for each curriculum and Primary stage */
const L=(kur,k,list)=>list.map(([s,n,d,g,p])=>[`${kur}-math-k${k}-${s}`,n,d,g,p]);
const T269=[2,5,10],T34=[3,4],T6789=[6,7,8,9];
const INTL_TOPIK={
  cam:{math:{
    1:L('cam',1,[['ord','Ordinal numbers','First, second, third ...','eOrdinal'],['cmp','Comparing numbers to 20','More, less and equal','eCompare',20],
      ['pat','Number patterns','Counting on and back','ePattern',1],['len','Length','Longer, shorter and measuring','eLength',1],
      ['data','Handling information','Pictograms','ePicGraph',1],['dbl','Doubling and halving','Doubles and halves to 20','eDouble'],['time','Time','O\'clock and half past','eTime',1]]),
    2:L('cam',2,[['as','Addition and subtraction within 100','Mental and column methods','eAddSub',100],['oe','Odd and even numbers','Odd, even and patterns','eOddEven'],
      ['mul','Multiplication facts of 2, 5 and 10','Times tables','eMulTab',T269],['div','Division','Sharing and grouping','eDivTab',T269],
      ['shp','2D shapes','Names, sides and corners','eShape2D'],['frac','Fractions','Halves and quarters','eFraction',1],
      ['data','Data representation','Pictograms and tally','ePicGraph',2],['time','Time','Telling the time to 5 minutes','eTime',2]]),
    3:L('cam',3,[['as','Addition and subtraction to 1000','Column methods','eAddSub',1000],['rnd','Rounding','To the nearest 10 and 100','eRound',1],
      ['money','Money','Dollars and cents','eMoney',2],['time','Time intervals','Durations and timetables','eTime',3],
      ['mul','Multiplication facts','Tables of 3, 4, 6, 7, 8 and 9','eMulTab',[3,4,6,7,8,9]],['div','Division facts','Using related facts','eDivTab',[3,4,6,7,8,9]],
      ['cfr','Comparing fractions','Unit and like fractions','eFraction',2],['ap','Perimeter and area','Rectangles and squares','eAreaPer',1],
      ['meas','Length conversions','Metres and centimetres','eLength',2],['chance','Chance','Likely, unlikely, certain','eChance',1],['bar','Bar graphs','Reading bar charts','eBarGraph',1]]),
    4:L('cam',4,[['big','Larger numbers','Place value to 1 000 000','ePlace',6],['rnd','Rounding larger numbers','Nearest 10, 100, 1000','eRound',2],
      ['neg','Negative numbers','Temperatures and number lines','eNegative'],['fm','Factors and multiples','Factors, multiples, divisibility','eFactors',1],
      ['t24','Time','24-hour clock','eTime',4],['md','Multiplication and division','Written methods','eMulLong',1],['ang','Angles and turns','Acute, right, obtuse','eAngles',1],
      ['fop','Adding and subtracting fractions','Same denominator','eFracOps',1],['sym','Symmetry','Lines of symmetry','eSymmetry'],['3d','3D shapes','Faces, edges and vertices','e3D'],
      ['mass','Mass and capacity','Kilograms, grams, litres','eMass',2]]),
    5:L('cam',5,[['dec','Decimals','Place value and comparing','eDecimal',1],['decop','Adding and subtracting decimals','One and two decimal places','eDecimal',2],
      ['md','Multiplying larger numbers','2-digit and 3-digit by 2-digit','eMulLong',2],['ops','Calculation rules','Order of operations','eOrderOps'],
      ['fop','Fractions with different denominators','Adding and subtracting','eFracOps',2],['pct','Percentages','Fractions, decimals and percentages','ePercent',1],
      ['tri','Angles and triangles','Angles on a line and at a point','eAngles',2],['comp','Perimeter and area of composite shapes','L-shapes','eAreaPer',3],
      ['prob','Probability','Chance as a fraction','eChance',2],['coord','Coordinates','First quadrant','eCoord',1],['mm','Mode and median','Averages','eStats',1],['ratio','Ratio','Simplest form','eRatio',1]]),
    6:L('cam',6,[['decmd','Multiplying and dividing decimals','By 10, 100 and 1000','eDecimal',3],['alg','Algebra','Expressions and equations','eAlgebra'],
      ['hcf','HCF and LCM','Highest common factor, lowest common multiple','eFactors',2],['angs','Angles in shapes','Triangles and quadrilaterals','eAngles',3],
      ['fmd','Multiplying and dividing fractions','Fractions and whole numbers','eFracOps',3],['pct','Percentages of amounts','Finding percentages','ePercent',2],
      ['mean','Mean and range','Statistics','eStats',2],['coord4','Coordinates in four quadrants','Negative coordinates','eCoord',2],
      ['circ','Circles','Radius, diameter, circumference','eCircle'],['share','Sharing in a ratio','Ratio word problems','eRatio',2],['vol','Volume','Cuboids and capacity','eVolume',1]]),
  }},
  sgp:{math:{
    1:L('sgp',1,[['n10','Numbers to 10','Counting objects','eCount',10],['n20','Numbers to 20','Comparing numbers','eCompare',20],['ord','Ordinal numbers','Position words','eOrdinal'],
      ['len','Length','Comparing and measuring','eLength',1],['mul','Multiplication','Equal groups','eMulTab',T269],['div','Division','Sharing equally','eDivTab',[2,5]],
      ['time','Time','Telling time to the hour','eTime',1],['money','Money','Coins and notes','eMoney',1],['pg','Picture graphs','Reading picture graphs','ePicGraph',1]]),
    2:L('sgp',2,[['n1000','Numbers to 1000','Place value','ePlace',3],['as','Addition and subtraction within 1000','With renaming','eAddSub',1000],
      ['oe','Odd and even numbers','Identifying odd and even','eOddEven'],['t2510','Multiplication tables of 2, 5 and 10','Times tables','eMulTab',T269],
      ['t34','Multiplication tables of 3 and 4','Times tables','eMulTab',T34],['len','Length','Metres and centimetres','eLength',2],['mass','Mass','Kilograms and grams','eMass',1],
      ['vol','Volume','Litres','eVolLiq',1],['time','Time','Hours and minutes','eTime',2],['pg','Picture graphs','With scales','ePicGraph',2],['3d','Shapes','2D and 3D shapes','e3D']]),
    3:L('sgp',3,[['n10k','Numbers to 10 000','Place value and words','ePlace',4],['money','Money','Change and word problems','eMoney',3],
      ['t6789','Multiplication tables of 6, 7, 8 and 9','Times tables','eMulTab',T6789],['md','Multiplication and division','Written methods','eMulLong',1],
      ['bar','Bar graphs','Reading and interpreting','eBarGraph',1],['ang','Angles','Right, acute and obtuse','eAngles',1],['lines','Perpendicular and parallel lines','Identifying lines','eLines'],
      ['eqf','Equivalent fractions','Simplest form','eFraction',3],['ap','Area and perimeter','Squares and rectangles','eAreaPer',1],['time','Time','Durations','eTime',3],
      ['mass','Mass and volume','Unit conversions','eMass',2]]),
    4:L('sgp',4,[['n100k','Numbers to 100 000','Rounding and estimation','eRound',2],['ops','Four operations','Multiplying by 2-digit numbers','eMulLong',2],
      ['graph','Tables and graphs','Bar graphs with scales','eBarGraph',2],['ang','Angles','Angles on a line and at a point','eAngles',2],
      ['rs','Rectangles and squares','Finding unknown sides','eAreaPer',2],['comp','Area and perimeter','Composite figures','eAreaPer',3],
      ['sym','Symmetry','Lines of symmetry','eSymmetry'],['t24','Time','24-hour clock','eTime',4],['decop','Four operations of decimals','Adding and subtracting','eDecimal',2],
      ['fop','Fractions','Adding unlike fractions','eFracOps',2]]),
    5:L('sgp',5,[['n10m','Numbers to 10 million','Place value and words','ePlace',7],['ops','Order of operations','With brackets','eOrderOps'],
      ['ffrac','Four operations of fractions','Multiplying and dividing','eFracOps',3],['tri','Area of triangle','Base and height','eTriArea'],
      ['vol','Volume','Cubes and cuboids','eVolume',1],['decmd','Decimals','Multiplying and dividing by 10, 100, 1000','eDecimal',3],
      ['rate','Rate','Rates and unit rates','eRate'],['ang','Angles','Angles at a point, vertically opposite','eAngles',2],['ptri','Properties of triangles','Unknown angles','eAngles',3]]),
    6:L('sgp',6,[['fdiv','Fractions','Dividing fractions','eFracOps',3],['ratio','Ratio','Word problems','eRatio',2],['pct','Percentage','Discount, increase and decrease','ePercent',3],
      ['avg','Average','Mean and word problems','eStats',3],['vol','Volume of cube and cuboid','Unknown dimensions','eVolume',2],['angs','Angles in geometric figures','Triangles and quadrilaterals','eAngles',3]]),
  }},
};
window.G_INTL=G_INTL;window.INTL_TOPIK=INTL_TOPIK;
})();
