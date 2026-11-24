/* Topik tambahan Matematika Kurikulum Merdeka SD (kelas 1–6).
   Cakupan topik mengacu pada daftar kurikulum KooBits; semua soal dibuat sendiri secara acak.
   File ini dimuat SEBELUM skrip utama index.html. Fungsi di sini memakai helper skrip utama
   (R, pick, D, LV, F, SVG, fmtN, strChoices, ...) yang baru tersedia saat soal dibuat. */
(() => {
const EMO=[{e:'🍎',n:'apel'},{e:'⭐',n:'bintang'},{e:'🐟',n:'ikan'},{e:'🌸',n:'bunga'},{e:'⚽',n:'bola'},{e:'🍌',n:'pisang'},{e:'🐤',n:'anak ayam'},{e:'🚗',n:'mobil'}];
const row=(e,n)=>{let s='';for(let i=0;i<n;i++)s+=e+(i%5===4?'&nbsp;&nbsp;':'');return `<div style="font-size:28px;line-height:1.5;margin:8px 0">${s}</div>`};
const SUP='⁰¹²³⁴⁵⁶⁷⁸⁹', supN=n=>String(n).split('').map(c=>SUP[c]).join('');
const fm2=x=>String(x).padStart(2,'0'), jam=m=>`${fm2(Math.floor(m/60)%24)}.${fm2(m%60)}`;
const isPrima=n=>{if(n<2)return false;for(let i=2;i*i<=n;i++)if(n%i===0)return false;return true};
const faktor=n=>[...Array(n)].map((_,i)=>i+1).filter(i=>n%i===0);
function terbilang(n){const s=['','satu','dua','tiga','empat','lima','enam','tujuh','delapan','sembilan','sepuluh','sebelas'];
  if(n<12)return s[n];if(n<20)return terbilang(n-10)+' belas';
  if(n<100)return terbilang(Math.floor(n/10))+' puluh'+(n%10?' '+terbilang(n%10):'');
  if(n<200)return 'seratus'+(n-100?' '+terbilang(n-100):'');
  if(n<1000)return terbilang(Math.floor(n/100))+' ratus'+(n%100?' '+terbilang(n%100):'');
  if(n<2000)return 'seribu'+(n-1000?' '+terbilang(n-1000):'');
  if(n<1e6)return terbilang(Math.floor(n/1000))+' ribu'+(n%1000?' '+terbilang(n%1000):'');
  return terbilang(Math.floor(n/1e6))+' juta'+(n%1e6?' '+terbilang(n%1e6):'')}
const JENIS=d=>d<90?'Sudut lancip':d===90?'Sudut siku-siku':d<180?'Sudut tumpul':'Sudut lurus';
const JENIS3=['Sudut lancip','Sudut siku-siku','Sudut tumpul'];
function angleSVG(deg){const r=Math.PI/180,x=60+52*Math.cos(deg*r),y=70-52*Math.sin(deg*r);
  const mark=deg===90?`<path d="M60 58 H72 V70" fill="none" stroke="#F2701D" stroke-width="3"/>`
    :`<path d="M76 70 A16 16 0 0 0 ${(60+16*Math.cos(deg*r)).toFixed(1)} ${(70-16*Math.sin(deg*r)).toFixed(1)}" fill="none" stroke="#F2701D" stroke-width="3"/>`;
  return SVG(`<line x1="60" y1="70" x2="112" y2="70" stroke="#1F2A2E" stroke-width="4" stroke-linecap="round"/><line x1="60" y1="70" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#1F2A2E" stroke-width="4" stroke-linecap="round"/>${mark}`,'0 0 120 80',170)}
function barSVG(labels,vals,step,top){const H=120,W=40+labels.length*50,y=v=>10+H-(v/top)*H;let s='';
  for(let v=0;v<=top;v+=step)s+=`<line x1="34" y1="${y(v)}" x2="${W}" y2="${y(v)}" stroke="#E3D9CC" stroke-width="1"/><text x="30" y="${y(v)+4}" font-size="10" text-anchor="end">${v}</text>`;
  labels.forEach((l,i)=>{const x=44+i*50;s+=`<rect x="${x}" y="${y(vals[i])}" width="30" height="${(vals[i]/top)*H}" fill="#2BA59B"/><text x="${x+15}" y="${H+26}" font-size="11" text-anchor="middle" font-weight="700">${l}</text>`});
  s+=`<line x1="34" y1="10" x2="34" y2="${H+10}" stroke="#1F2A2E" stroke-width="2"/><line x1="34" y1="${H+10}" x2="${W}" y2="${H+10}" stroke="#1F2A2E" stroke-width="2"/>`;
  return SVG(s,`0 0 ${W+6} ${H+32}`,Math.min(360,Math.round(W*1.5)))}
function gridSVG(N,pts){const c=24,o=20;let s='';
  for(let i=0;i<=N;i++)s+=`<line x1="${o+i*c}" y1="${o}" x2="${o+i*c}" y2="${o+N*c}" stroke="#E3D9CC"/><line x1="${o}" y1="${o+i*c}" x2="${o+N*c}" y2="${o+i*c}" stroke="#E3D9CC"/><text x="${o+i*c}" y="${o+N*c+14}" font-size="10" text-anchor="middle">${i}</text><text x="${o-6}" y="${o+(N-i)*c+4}" font-size="10" text-anchor="end">${i}</text>`;
  s+=`<line x1="${o}" y1="${o+N*c}" x2="${o+N*c}" y2="${o+N*c}" stroke="#1F2A2E" stroke-width="2"/><line x1="${o}" y1="${o}" x2="${o}" y2="${o+N*c}" stroke="#1F2A2E" stroke-width="2"/>`;
  for(const [x,y,l] of pts)s+=`<circle cx="${o+x*c}" cy="${o+(N-y)*c}" r="5" fill="#F2701D"/><text x="${o+x*c+7}" y="${o+(N-y)*c-6}" font-size="12" font-weight="800">${l}</text>`;
  return SVG(s,`0 0 ${o*2+N*c} ${o*2+N*c}`,250)}
const lab=(x,y,t)=>`<text x="${x}" y="${y}" font-size="11" font-weight="800" text-anchor="middle" fill="#1F2A2E">${t}</text>`;
const RUANG=[{n:'Kubus',sisi:6,rusuk:12,titik:8,ciri:'6 sisi berbentuk persegi yang sama besar',c:'dadu'},
  {n:'Balok',sisi:6,rusuk:12,titik:8,ciri:'6 sisi berbentuk persegi panjang',c:'kotak sepatu'},
  {n:'Bola',ciri:'satu permukaan lengkung, tanpa rusuk dan titik sudut',c:'bola sepak'},
  {n:'Tabung',ciri:'alas dan tutup berbentuk lingkaran, selimutnya lengkung',c:'kaleng susu'},
  {n:'Kerucut',ciri:'alas berbentuk lingkaran dan satu titik puncak',c:'topi ulang tahun'},
  {n:'Prisma segitiga',sisi:5,rusuk:9,titik:6,ciri:'alas dan tutup berbentuk segitiga',c:'tenda kemah'},
  {n:'Limas segi empat',sisi:5,rusuk:8,titik:5,ciri:'alas persegi dan sisi tegak segitiga yang bertemu di puncak',c:'piramida'}];
const SEGI=[{n:'Persegi',p:'22,10 98,10 98,86 22,86',c:'4 sisi sama panjang dan 4 sudut siku-siku'},
  {n:'Persegi panjang',p:'6,20 114,20 114,76 6,76',c:'sisi berhadapan sama panjang (panjang dan lebar berbeda) dan 4 sudut siku-siku'},
  {n:'Jajar genjang',p:'30,20 114,20 90,76 6,76',c:'2 pasang sisi sejajar, sisi bersebelahan tidak sama panjang, dan sudutnya tidak siku-siku'},
  {n:'Belah ketupat',p:'60,4 104,46 60,88 16,46',c:'4 sisi sama panjang, tetapi sudutnya tidak siku-siku'},
  {n:'Trapesium',p:'34,20 86,20 114,76 6,76',c:'tepat sepasang sisi sejajar'},
  {n:'Layang-layang',p:'60,4 96,34 60,88 24,34',c:'2 pasang sisi bersebelahan yang sama panjang'},
  {n:'Segitiga sama sisi',p:'60,3 108,86.1384 12,86.1384',c:'3 sisi sama panjang dan 3 sudut sama besar'},
  {n:'Segitiga siku-siku',p:'14,8 14,84 106,84',c:'satu sudut siku-siku'}];
const HARI=['Senin','Selasa','Rabu','Kamis','Jumat'];
const v3=(a,b,c)=>pick(D(a,b,c));   // pilih varian soal menurut tingkat

const G_EXTRA={
  /* ---------- Kelas 1 ---------- */
  hitungBenda(){const a=pick(EMO);
    if(LV===3&&Math.random()<.6){const b=pick(EMO.filter(x=>x!==a));let x=R(5,12),y=R(2,x-1);
      return {q:`Ada berapa ${a.n} lebih banyak daripada ${b.n}?${row(a.e,x)}${row(b.e,y)}`,ans:x-y,kind:'int',
        steps:[`Hitung ${a.n}: ada ${x}.`,`Hitung ${b.n}: ada ${y}.`,`Selisihnya ${x} − ${y} = <b>${x-y}</b>.`]}}
    const n=R(D(2,6,11),D(10,15,20)),k=Math.floor(n/5),s=n%5;
    return {q:`Ada berapa ${a.n}?${row(a.e,n)}`,ans:n,kind:'int',
      steps:n<5?[`Hitung satu per satu: ${[...Array(n)].map((_,i)=>i+1).join(', ')}.`,`Ada <b>${n}</b> ${a.n}.`]
        :[`Hitung per kelompok lima: ada ${k} kelompok isi 5${s?` dan sisa ${s}`:''}.`,`${Array(k).fill(5).join(' + ')}${s?` + ${s}`:''} = <b>${n}</b>.`]}},
  panjangK1(){const names=['A','B','C'],col=['#F2701D','#2BA59B','#6C63FF'];
    if(LV===3&&Math.random()<.5){const n=R(3,9);let s='';for(let i=0;i<n;i++)s+=`<rect x="${4+i*22}" y="34" width="22" height="22" fill="#fff" stroke="#1F2A2E" stroke-width="2"/>`;
      s+=`<rect x="4" y="10" width="${n*22}" height="16" rx="8" fill="#F2701D"/>`;
      return {q:`Berapa kotak panjang pensil ini?${SVG(s,`0 0 ${n*22+8} 60`,Math.min(320,n*32))}`,ans:n,kind:'int',
        steps:[`Hitung kotak di bawah pensil dari ujung kiri sampai ujung kanan.`,`Panjangnya <b>${n}</b> kotak.`]}}
    const k=LV===1?2:3,lens=shuffle([3,4,5,6,7,8,9]).slice(0,k),long=Math.random()<.5,t=long?Math.max(...lens):Math.min(...lens),ti=lens.indexOf(t);
    let s='';lens.forEach((l,i)=>{s+=`<text x="2" y="${23+i*28}" font-size="14" font-weight="800">${names[i]}</text><rect x="20" y="${10+i*28}" width="${l*20}" height="16" rx="8" fill="${col[i]}"/>`});
    return {q:`Pita mana yang paling ${long?'panjang':'pendek'}?${SVG(s,`0 0 210 ${k*28+6}`,260)}`,ans:names[ti],kind:'str',choices:names.slice(0,k),
      steps:[`Pangkal semua pita sejajar, jadi bandingkan ujung kanannya.`,`Pita <b>${names[ti]}</b> paling ${long?'panjang':'pendek'}.`]}},
  grafikGambar(k){const C=shuffle([{e:'🍎',n:'Apel'},{e:'🍊',n:'Jeruk'},{e:'🍌',n:'Pisang'},{e:'🥭',n:'Mangga'},{e:'🍇',n:'Anggur'}]).slice(0,D(3,4,4));
    const sc=k===2&&LV===3?2:1;let vals;do{vals=C.map(()=>R(1,D(5,7,8)))}while(new Set(vals).size<vals.length);
    const real=vals.map(v=>v*sc),low=s=>s.toLowerCase();
    const tb=`<table style="border-collapse:collapse;margin:10px 0;font-size:16px">${C.map((c,i)=>`<tr><td style="padding:4px 10px;font-weight:800;border:2px solid #E3D9CC">${c.n}</td><td style="padding:4px 10px;border:2px solid #E3D9CC;font-size:22px">${c.e.repeat(vals[i])}</td></tr>`).join('')}</table>${sc>1?`<div style="font-weight:700">Setiap gambar mewakili ${sc} buah.</div>`:''}`;
    const head=`Grafik gambar buah yang dibeli Ibu:${tb}`,v=v3([0,1],[0,1,2],[0,1,2,3]);
    if(v===0){const i=R(0,C.length-1);return {q:`${head}Berapa banyak ${low(C[i].n)}?`,ans:real[i],kind:'int',
      steps:[`Hitung gambar ${low(C[i].n)}: ada ${vals[i]}.`,...(sc>1?[`Setiap gambar = ${sc} buah, jadi ${vals[i]} × ${sc} = ${real[i]}.`]:[]),`Jadi ada <b>${real[i]}</b> ${low(C[i].n)}.`]}}
    if(v===1){const most=Math.random()<.5,t=most?Math.max(...vals):Math.min(...vals),i=vals.indexOf(t);
      return {q:`${head}Buah apa yang paling ${most?'banyak':'sedikit'}?`,ans:C[i].n,kind:'str',choices:C.map(c=>c.n),
        steps:[`Bandingkan panjang baris gambarnya.`,`Baris ${low(C[i].n)} paling ${most?'panjang':'pendek'}, jadi jawabannya <b>${C[i].n}</b>.`]}}
    const [i,j]=shuffle([...C.keys()]).slice(0,2);
    if(v===2){const [a,b]=real[i]>real[j]?[i,j]:[j,i];return {q:`${head}Berapa ${low(C[a].n)} lebih banyak daripada ${low(C[b].n)}?`,ans:real[a]-real[b],kind:'int',
      steps:[`${C[a].n} ada ${real[a]}, ${low(C[b].n)} ada ${real[b]}.`,`${real[a]} − ${real[b]} = <b>${real[a]-real[b]}</b>.`]}}
    return {q:`${head}Berapa jumlah ${low(C[i].n)} dan ${low(C[j].n)}?`,ans:real[i]+real[j],kind:'int',
      steps:[`${C[i].n} ada ${real[i]}, ${low(C[j].n)} ada ${real[j]}.`,`${real[i]} + ${real[j]} = <b>${real[i]+real[j]}</b>.`]}},

  /* ---------- Kelas 2 ---------- */
  ganjilGenap(){const v=v3([0],[0,1],[1,2,3]);
    if(v===0){const n=R(1,D(20,100,100)),g=n%2===0;return {q:`Bilangan <b>${n}</b> termasuk bilangan ...`,ans:g?'Genap':'Ganjil',kind:'str',choices:['Ganjil','Genap'],
      steps:[`Lihat angka satuannya: ${n%10}.`,`${n%10} ${g?'habis':'tidak habis'} dibagi 2, jadi ${n} bilangan <b>${g?'genap':'ganjil'}</b>.`]}}
    if(v===1){const n=R(10,98),g=Math.random()<.5;let a=n+1;while((a%2===0)!==g)a++;
      return {q:`Bilangan ${g?'genap':'ganjil'} berikutnya setelah <b>${n}</b> adalah ...`,ans:a,kind:'int',
        steps:[`Bilangan ${g?'genap':'ganjil'} berakhiran ${g?'0, 2, 4, 6, atau 8':'1, 3, 5, 7, atau 9'}.`,`Setelah ${n}, bilangan ${g?'genap':'ganjil'} pertama adalah <b>${a}</b>.`]}}
    if(v===2){const a=R(5,49),b=R(5,49),s=a+b,g=s%2===0;return {q:`Hasil ${a} + ${b} adalah bilangan ...`,ans:g?'Genap':'Ganjil',kind:'str',choices:['Ganjil','Genap'],
      steps:[`${a} + ${b} = ${s}.`,`Angka satuannya ${s%10}, jadi hasilnya bilangan <b>${g?'genap':'ganjil'}</b>.`]}}
    const a=R(1,30),b=a+R(6,16),L=[];for(let i=a+1;i<b;i++)if(i%2)L.push(i);
    return {q:`Ada berapa bilangan ganjil di antara ${a} dan ${b}?`,ans:L.length,kind:'int',steps:[`Bilangan ganjil di antara ${a} dan ${b}: ${L.join(', ')}.`,`Banyaknya <b>${L.length}</b>.`]}},
  bangunRuang(){const v=v3([0],[0,1],[1,2]);
    if(v===2){const b=pick(RUANG.filter(x=>x.sisi)),w=pick(['sisi','rusuk','titik']),lb={sisi:'sisi',rusuk:'rusuk',titik:'titik sudut'}[w];
      return {q:`Berapa banyak ${lb} pada bangun <b>${b.n.toLowerCase()}</b>?`,ans:b[w],kind:'int',
        steps:[`${b.n} memiliki ${b.sisi} sisi, ${b.rusuk} rusuk, dan ${b.titik} titik sudut.`,`Jadi banyak ${lb}nya <b>${b[w]}</b>.`]}}
    const b=pick(LV===1?RUANG.slice(0,5):RUANG),pool=RUANG.map(x=>x.n);
    if(v===0)return {q:`Benda seperti <b>${b.c}</b> berbentuk bangun ruang ...`,ans:b.n,kind:'str',choices:strChoices(b.n,pool),
      steps:[`${cap(b.c)} memiliki ${b.ciri}.`,`Itu ciri bangun <b>${b.n.toLowerCase()}</b>.`]};
    return {q:`Bangun ruang yang memiliki ${b.ciri} adalah ...`,ans:b.n,kind:'str',choices:strChoices(b.n,pool),
      steps:[`Ciri itu dimiliki oleh <b>${b.n.toLowerCase()}</b>, contohnya ${b.c}.`]}},
  pecSederhana(){const v=v3([0],[0,1],[1,2]);
    if(v===0){const d=pick([2,4]),n=d===2?1:pick([1,3]),w=200/d;let r='';
      for(let i=0;i<d;i++)r+=`<rect x="${2+i*w}" y="2" width="${w}" height="46" fill="${i<n?'#F2701D':'#fff'}" stroke="#1F2A2E" stroke-width="3"/>`;
      const a=`${n}/${d}`;return {q:`Bagian yang diwarnai adalah ...${SVG(r,'0 0 204 50',240)}`,ans:a,kind:'str',choices:['1/2','1/3','1/4','3/4'],
        steps:[`Bangun dibagi menjadi ${d} bagian sama besar, yang diwarnai ${n} bagian.`,`Jadi <b>${a}</b>.`]}}
    if(v===1){const n=R(1,D(5,10,10))*2,x=bd();return {q:`Setengah dari ${n} ${x} adalah ...`,ans:n/2,kind:'int',
      steps:[`Setengah artinya dibagi 2 sama banyak.`,`${n} : 2 = <b>${n/2}</b>.`]}}
    const q=R(1,6),n=q*4,t=Math.random()<.5;return {q:`${t?'Tiga perempat':'Seperempat'} dari ${n} adalah ...`,ans:t?3*q:q,kind:'int',
      steps:[`Seperempat artinya dibagi 4: ${n} : 4 = ${q}.`,t?`Tiga perempat = 3 × ${q} = <b>${3*q}</b>.`:`Jadi <b>${q}</b>.`]}},
  beratK2(){const B=shuffle(['buku','tas','semangka','bantal','kucing','ember']);
    if(LV===1){const [a,b]=B,left=Math.random()<.5,yl=left?40:16,yr=left?16:40,h=left?a:b;
      const s=`<line x1="60" y1="28" x2="60" y2="80" stroke="#1F2A2E" stroke-width="4"/><polygon points="44,84 76,84 60,72" fill="#1F2A2E"/>
        <line x1="10" y1="${yl}" x2="110" y2="${yr}" stroke="#F2701D" stroke-width="5" stroke-linecap="round"/>${lab(22,yl-6,a)}${lab(98,yr-6,b)}`;
      return {q:`Perhatikan timbangan. Mana yang lebih berat?${SVG(s,'0 0 120 90',200)}`,ans:cap(h),kind:'str',choices:[cap(a),cap(b)],
        steps:[`Sisi timbangan yang lebih berat turun ke bawah.`,`Sisi ${h} lebih rendah, jadi <b>${h}</b> lebih berat.`]}}
    if(LV===2){const w=shuffle([2,3,4,5,6,7,8]).slice(0,3),h=Math.random()<.5,t=h?Math.max(...w):Math.min(...w),i=w.indexOf(t);
      return {q:`Berat ${B.slice(0,3).map((x,j)=>`${x} ${w[j]} kg`).join(', ')}. Benda mana yang paling ${h?'berat':'ringan'}?`,ans:cap(B[i]),kind:'str',choices:B.slice(0,3).map(cap),
        steps:[`Bandingkan beratnya: ${w.join(' kg, ')} kg.`,`Yang paling ${h?'berat':'ringan'} ${t} kg, yaitu <b>${B[i]}</b>.`]}}
    const it=pick(['mangga','jeruk','apel']),k=R(2,6),n=R(2,5),un=pick(['kelereng','balok mainan','kancing']);
    return {q:`Satu ${it} sama berat dengan ${k} ${un}. Berapa ${un} yang sama berat dengan ${n} ${it}?`,ans:k*n,kind:'int',
      steps:[`1 ${it} = ${k} ${un}.`,`${n} ${it} = ${n} × ${k} = <b>${k*n}</b> ${un}.`]}},

  /* ---------- Kelas 3 ---------- */
  bil1000(){let n;do{n=R(101,999)}while(n%10===0);const [h,t,u]=String(n).split('').map(Number);
    if(LV===1)return {q:`${h*100} + ${t*10} + ${u} = ...`,ans:n,kind:'int',
      steps:[`${h*100} adalah ${h} ratusan, ${t*10} adalah ${t} puluhan, ${u} adalah ${u} satuan.`,`Digabung menjadi <b>${n}</b>.`]};
    if(LV===2){const d=shuffle([1,2,3,4,5,6,7,8,9]).slice(0,3),big=Math.random()<.5,o=d.slice().sort((a,b)=>big?b-a:a-b),a=+o.join('');
      return {q:`Susun angka <b>${d.join(', ')}</b> (masing-masing dipakai sekali) menjadi bilangan tiga angka ${big?'terbesar':'terkecil'}.`,ans:a,kind:'int',
        steps:[`Untuk bilangan ${big?'terbesar':'terkecil'}, taruh angka ${big?'terbesar':'terkecil'} di tempat ratusan, lalu urutkan sisanya.`,`Urutannya ${o.join(', ')} → <b>${a}</b>.`]}}
    return {q:`Tulis lambang bilangan dari: <b>${terbilang(n)}</b>`,ans:n,kind:'int',
      steps:[`${cap(terbilang(n))} = ${h} ratusan, ${t} puluhan, ${u} satuan.`,`Lambangnya <b>${n}</b>.`]}},
  satuanPanjang(){const v=v3([0,1],[2,3],[4,5]);
    if(v===0){const m=R(1,9);return {q:`${m} m = ... cm`,ans:m*100,kind:'int',steps:[`1 m = 100 cm.`,`${m} × 100 = <b>${m*100}</b> cm.`]}}
    if(v===1){const m=R(2,9);return {q:`${m*100} cm = ... m`,ans:m,kind:'int',steps:[`100 cm = 1 m.`,`${m*100} : 100 = <b>${m}</b> m.`]}}
    if(v===2){const m=R(1,9),c=R(5,95);return {q:`${m} m ${c} cm = ... cm`,ans:m*100+c,kind:'int',steps:[`${m} m = ${m*100} cm.`,`${m*100} + ${c} = <b>${m*100+c}</b> cm.`]}}
    if(v===3){const k=R(1,9),m=pick([0,250,500,750]);return {q:`${k} km${m?` ${m} m`:''} = ... m`,ans:k*1000+m,kind:'int',
      steps:[`1 km = 1.000 m, jadi ${k} km = ${fmtN(k*1000)} m.`,m?`${fmtN(k*1000)} + ${m} = <b>${fmtN(k*1000+m)}</b> m.`:`Jadi <b>${fmtN(k*1000)}</b> m.`]}}
    if(v===4){const m=R(2,5),c=R(15,95),o=nm();return {q:`${o} punya pita sepanjang ${m} m. Pita itu dipotong ${c} cm. Berapa cm sisa pitanya?`,ans:m*100-c,kind:'int',hint:'Tulis angkanya saja.',
      steps:[`${m} m = ${m*100} cm.`,`${m*100} − ${c} = <b>${m*100-c}</b> cm.`]}}
    const a=R(150,185),b=R(30,60);return {q:`Tinggi Ayah 1 m ${a-100} cm. Tinggi Adik ${b} cm lebih pendek dari Ayah. Berapa cm tinggi Adik?`,ans:a-b,kind:'int',hint:'Tulis angkanya saja.',
      steps:[`1 m ${a-100} cm = ${a} cm.`,`${a} − ${b} = <b>${a-b}</b> cm.`]}},
  satuanBerat(){const v=v3([0,1],[2,3],[4,5]);
    if(v===0){const k=R(1,9);return {q:`${k} kg = ... g`,ans:k*1000,kind:'int',steps:[`1 kg = 1.000 g.`,`${k} × 1.000 = <b>${fmtN(k*1000)}</b> g.`]}}
    if(v===1){const k=R(2,9);return {q:`${fmtN(k*1000)} g = ... kg`,ans:k,kind:'int',steps:[`1.000 g = 1 kg.`,`${fmtN(k*1000)} : 1.000 = <b>${k}</b> kg.`]}}
    if(v===2){const k=R(1,5),g=R(1,19)*50;return {q:`${k} kg ${g} g = ... g`,ans:k*1000+g,kind:'int',steps:[`${k} kg = ${fmtN(k*1000)} g.`,`${fmtN(k*1000)} + ${g} = <b>${fmtN(k*1000+g)}</b> g.`]}}
    if(v===3){const g=R(1,9)*1000+R(1,9)*100,k=Math.floor(g/1000);return {q:`${fmtN(g)} g = ${k} kg ... g`,ans:g%1000,kind:'int',
      steps:[`${fmtN(g)} g = ${fmtN(k*1000)} g + ${g%1000} g.`,`${fmtN(k*1000)} g = ${k} kg, jadi sisanya <b>${g%1000}</b> g.`]}}
    if(v===4){const k=R(1,4),g=pick([250,500,750]),o=nm();return {q:`${o} membeli ${k} kg beras dan ${g} g gula. Berapa gram berat semuanya?`,ans:k*1000+g,kind:'int',hint:'Tulis angkanya saja.',
      steps:[`${k} kg = ${fmtN(k*1000)} g.`,`${fmtN(k*1000)} + ${g} = <b>${fmtN(k*1000+g)}</b> g.`]}}
    const k=R(2,5),g=R(3,18)*50;return {q:`Ibu punya ${k} kg tepung. Sebanyak ${g} g dipakai membuat kue. Berapa gram tepung yang tersisa?`,ans:k*1000-g,kind:'int',hint:'Tulis angkanya saja.',
      steps:[`${k} kg = ${fmtN(k*1000)} g.`,`${fmtN(k*1000)} − ${g} = <b>${fmtN(k*1000-g)}</b> g.`]}},
  sudutK3(){const v=v3([0],[0,1],[1,2]);
    if(v===0){const d=pick([pick([25,35,45,60,70]),90,pick([110,125,140,155])]);
      return {q:`Sudut ini termasuk ...${angleSVG(d)}`,ans:JENIS(d),kind:'str',choices:JENIS3,
        steps:[`Bandingkan dengan sudut siku-siku (seperti pojok buku).`,d<90?`Sudut ini lebih kecil dari siku-siku, jadi <b>sudut lancip</b>.`:d===90?`Sudut ini tepat seperti pojok buku, jadi <b>sudut siku-siku</b>.`:`Sudut ini lebih besar dari siku-siku, jadi <b>sudut tumpul</b>.`]}}
    if(v===1){const h=pick([1,2,3,4,5,9,10,11]),j=Math.min(h,12-h),deg=j*30;
      return {q:`Pukul ${h}.00, jarum pendek dan jarum panjang membentuk sudut ...${clockSVG(h,0)}`,ans:JENIS(deg),kind:'str',choices:JENIS3,
        steps:[`Jarum panjang di angka 12, jarum pendek di angka ${h}.`,`Jaraknya ${j} angka, sama dengan ${deg}° (setiap angka 30°).`,`${deg}° ${deg<90?'kurang dari':deg===90?'sama dengan':'lebih dari'} 90°, jadi <b>${JENIS(deg).toLowerCase()}</b>.`]}}
    const par=Math.random()<.5,s=par?`<line x1="10" y1="22" x2="110" y2="22" stroke="#1F2A2E" stroke-width="4"/><line x1="10" y1="62" x2="110" y2="62" stroke="#F2701D" stroke-width="4"/>`
      :`<line x1="10" y1="45" x2="110" y2="45" stroke="#1F2A2E" stroke-width="4"/><line x1="60" y1="5" x2="60" y2="85" stroke="#F2701D" stroke-width="4"/><path d="M60 33 H72 V45" fill="none" stroke="#1F2A2E" stroke-width="2"/>`;
    return {q:`Kedua garis ini disebut garis ...${SVG(s)}`,ans:par?'Sejajar':'Tegak lurus',kind:'str',choices:['Sejajar','Tegak lurus','Berimpit'],
      steps:[par?`Kedua garis selalu berjarak sama dan tidak pernah bertemu.`:`Kedua garis berpotongan membentuk sudut siku-siku.`,`Jadi kedua garis <b>${par?'sejajar':'tegak lurus'}</b>.`]}},
  diagramBatang(k){const step=k===3?D(1,2,2):D(5,10,10),top=step*10,n=D(4,5,5);
    let vals;do{vals=[...Array(n)].map(()=>R(1,10)*step)}while(new Set(vals).size<n);
    const head=`Diagram batang banyak buku yang dipinjam di perpustakaan:${barSVG(HARI.slice(0,n).map(h=>h.slice(0,3)),vals,step,top)}`,v=v3([0,1],[0,1,2],[1,2,3]);
    if(v===0){const i=R(0,n-1);return {q:`${head}Berapa buku yang dipinjam hari ${HARI[i]}?`,ans:vals[i],kind:'int',
      steps:[`Lihat ujung batang ${HARI[i]}, lalu tarik garis ke angka di kiri.`,`Batangnya sampai angka <b>${vals[i]}</b>.`]}}
    if(v===1){const most=Math.random()<.5,t=most?Math.max(...vals):Math.min(...vals),i=vals.indexOf(t);
      return {q:`${head}Pada hari apa buku paling ${most?'banyak':'sedikit'} dipinjam?`,ans:HARI[i],kind:'str',choices:HARI.slice(0,n),
        steps:[`Cari batang yang paling ${most?'tinggi':'rendah'}.`,`Batang paling ${most?'tinggi':'rendah'} adalah hari <b>${HARI[i]}</b> (${t} buku).`]}}
    const [i,j]=shuffle([...vals.keys()]).slice(0,2);
    if(v===2){const [a,b]=vals[i]>vals[j]?[i,j]:[j,i];return {q:`${head}Berapa buku lebih banyak dipinjam hari ${HARI[a]} daripada hari ${HARI[b]}?`,ans:vals[a]-vals[b],kind:'int',
      steps:[`${HARI[a]}: ${vals[a]} buku, ${HARI[b]}: ${vals[b]} buku.`,`${vals[a]} − ${vals[b]} = <b>${vals[a]-vals[b]}</b>.`]}}
    const tot=vals.reduce((a,b)=>a+b,0);return {q:`${head}Berapa banyak buku yang dipinjam selama ${n} hari itu?`,ans:tot,kind:'int',
      steps:[`Jumlahkan semua batang: ${vals.join(' + ')}.`,`Hasilnya <b>${tot}</b> buku.`]}},

  /* ---------- Kelas 4 ---------- */
  kaliBagiK4(){const v=v3([0],[0,1],[1,2]),x=bd();
    if(v===0){const a=R(12,D(49,99,99)),b=R(2,9),t=a-a%10,u=a%10;
      return {q:story()?`Setiap kotak berisi <b>${a}</b> ${x}. Ada <b>${b}</b> kotak. Berapa ${x} semuanya?`:`${a} × ${b} = ?`,ans:a*b,kind:'int',
        steps:[`Pecah ${a} = ${t} + ${u}.`,`${t} × ${b} = ${t*b} dan ${u} × ${b} = ${u*b}.`,`${t*b} + ${u*b} = <b>${fmtN(a*b)}</b>.`]}}
    if(v===1){if(LV===2){const a=R(101,499),b=R(2,9),h=a-a%100,t=a%100-a%10,u=a%10;
        return {q:`${a} × ${b} = ?`,ans:a*b,kind:'int',steps:[`Pecah ${a} = ${h} + ${t} + ${u}.`,`${h} × ${b} = ${h*b}, ${t} × ${b} = ${t*b}, ${u} × ${b} = ${u*b}.`,`${h*b} + ${t*b} + ${u*b} = <b>${fmtN(a*b)}</b>.`]}}
      const a=R(12,49),b=R(12,39),bt=b-b%10,bu=b%10;
      return {q:`${a} × ${b} = ?`,ans:a*b,kind:'int',steps:[`Pecah ${b} = ${bt} + ${bu}.`,`${a} × ${bt} = ${a*bt} dan ${a} × ${bu} = ${a*bu}.`,`${a*bt} + ${a*bu} = <b>${fmtN(a*b)}</b>.`]}}
    let a,b;do{a=R(20,99);b=R(3,9)}while(a%b===0);const q=Math.floor(a/b),r=a%b,sisa=Math.random()<.5;
    return {q:`<b>${a}</b> kue dimasukkan ke dalam kotak. Setiap kotak berisi <b>${b}</b> kue. ${sisa?'Berapa kue yang tidak masuk kotak (sisa)?':'Berapa kotak yang terisi penuh?'}`,ans:sisa?r:q,kind:'int',
      steps:[`${a} : ${b} = ${q} sisa ${r}, karena ${b} × ${q} = ${b*q} dan ${a} − ${b*q} = ${r}.`,sisa?`Jadi sisa kuenya <b>${r}</b>.`:`Jadi ada <b>${q}</b> kotak penuh.`]}},
  faktorKelipatan(){
    if(LV===1){const n=pick([12,16,18,20,24,30,36]),f=faktor(n),good=pick(f.filter(x=>x>1&&x<n)),bad=shuffle([...Array(n)].map((_,i)=>i+2).filter(x=>n%x&&x<n)).slice(0,3);
      return {q:`Manakah yang merupakan faktor dari <b>${n}</b>?`,ans:String(good),kind:'str',choices:shuffle([good,...bad]).map(String),
        steps:[`Faktor ${n} adalah bilangan yang membagi ${n} habis.`,`${n} : ${good} = ${n/good}, habis. Jadi <b>${good}</b>.`,`Semua faktor ${n}: ${f.join(', ')}.`]}}
    if(LV===2){if(Math.random()<.5){const n=pick([12,18,20,24,28,30,32,36,40,48]),f=faktor(n);
        return {q:`Ada berapa banyak faktor dari ${n}?`,ans:f.length,kind:'int',steps:[`Faktor ${n}: ${f.join(', ')}.`,`Banyaknya <b>${f.length}</b>.`]}}
      const a=R(3,12),k=R(4,12);return {q:`Kelipatan ke-${k} dari ${a} adalah ...`,ans:a*k,kind:'int',
        steps:[`Kelipatan ${a}: ${[1,2,3].map(i=>a*i).join(', ')}, ...`,`Kelipatan ke-${k} = ${a} × ${k} = <b>${a*k}</b>.`]}}
    const a=R(3,9),N=R(40,100),c=Math.floor(N/a);
    return {q:`Ada berapa kelipatan ${a} dari 1 sampai ${N}?`,ans:c,kind:'int',
      steps:[`Kelipatan ${a} terbesar yang tidak lebih dari ${N} adalah ${a*c} = ${a} × ${c}.`,`Jadi ada <b>${c}</b> kelipatan.`]}},
  pecDesimalK4(){const v=v3([0,1],[2,3],[4,5]);
    if(v===0){const n=R(1,9);return {q:`${F(n,10)} = ... (tulis dalam bentuk desimal)`,ans:n/10,kind:'dec',hint:'Pakai koma, contoh 0,3.',
      steps:[`Per sepuluh berarti satu angka di belakang koma.`,`${F(n,10)} = <b>0,${n}</b>.`]}}
    if(v===1){const n=R(1,9);return {q:`0,${n} = ${F('?',10)}`,ans:n,kind:'int',hint:'Tulis pembilangnya saja.',
      steps:[`0,${n} artinya ${n} per sepuluh.`,`Jadi ${F(n,10)}, pembilangnya <b>${n}</b>.`]}}
    if(v===2){const n=R(11,99);return {q:`${F(n,100)} = ... (tulis dalam bentuk desimal)`,ans:n/100,kind:'dec',hint:'Pakai koma, contoh 0,45.',
      steps:[`Per seratus berarti dua angka di belakang koma.`,`${F(n,100)} = <b>${fmtD(n/100,2)}</b>.`]}}
    if(v===3){const n=R(1,99);return {q:`${F(n,100)} = ...%`,ans:n,kind:'int',hint:'Tulis angkanya saja.',
      steps:[`Persen artinya per seratus.`,`${F(n,100)} = <b>${n}%</b>.`]}}
    const [a,b]=pick([[1,2],[1,4],[3,4],[1,5],[2,5],[3,5],[4,5],[1,10]]),pc=a*100/b;
    if(v===4)return {q:`${F(a,b)} = ... (tulis dalam bentuk desimal)`,ans:a/b,kind:'dec',hint:'Pakai koma, contoh 0,25.',
      steps:[`Ubah penyebutnya menjadi 100: ${F(a,b)} = ${F(pc,100)}.`,`${F(pc,100)} = <b>${fmtD(a/b,2)}</b>.`]};
    return {q:`${F(a,b)} = ...%`,ans:pc,kind:'int',hint:'Tulis angkanya saja.',
      steps:[`Ubah penyebutnya menjadi 100: ${F(a,b)} = ${F(pc,100)}.`,`Jadi <b>${pc}%</b>.`]}},
  segiBanyak(){const s=pick(SEGI),pool=SEGI.map(x=>x.n);
    if(LV===1||(LV===2&&Math.random()<.5))return {q:`Apa nama bangun ini?${SVG(`<polygon points="${s.p}" ${STY}/>`,'0 0 120 92')}`,ans:s.n,kind:'str',choices:strChoices(s.n,pool),
      steps:[`Bangun ini memiliki ${s.c}.`,`Namanya <b>${s.n.toLowerCase()}</b>.`]};
    if(LV===3&&Math.random()<.4){const [k,nm]=pick([[5,'segi lima'],[6,'segi enam'],[8,'segi delapan']]),n=R(2,4);
      return {q:`Berapa jumlah semua sisi dari ${n} buah ${nm}?`,ans:n*k,kind:'int',steps:[`Satu ${nm} punya ${k} sisi.`,`${n} × ${k} = <b>${n*k}</b> sisi.`]}}
    return {q:`Bangun datar yang memiliki ${s.c} adalah ...`,ans:s.n,kind:'str',choices:strChoices(s.n,pool),steps:[`Ciri itu dimiliki oleh <b>${s.n.toLowerCase()}</b>.`]}},
  polaK4(){const v=v3([0],[0,1],[2,3]);
    if(v===0){const s=R(3,12),a=R(1,50),q=[0,1,2,3].map(i=>a+i*s);
      return {q:`Lanjutkan pola: ${q.join(', ')}, ...`,ans:a+4*s,kind:'int',steps:[`Setiap suku bertambah ${s}.`,`${q[3]} + ${s} = <b>${a+4*s}</b>.`]}}
    if(v===1){const s=R(4,25),a=R(5*s,5*s+80),q=[0,1,2,3].map(i=>a-i*s);
      return {q:`Lanjutkan pola: ${q.join(', ')}, ...`,ans:a-4*s,kind:'int',steps:[`Setiap suku berkurang ${s}.`,`${q[3]} − ${s} = <b>${a-4*s}</b>.`]}}
    if(v===2){const r=pick([2,3]),a=R(1,5),q=[0,1,2,3].map(i=>a*r**i);
      return {q:`Lanjutkan pola: ${q.join(', ')}, ...`,ans:a*r**4,kind:'int',steps:[`Setiap suku dikali ${r}.`,`${q[3]} × ${r} = <b>${a*r**4}</b>.`]}}
    const s=R(3,9),a=R(1,30),q=[0,1,2,3,4].map(i=>a+i*s),k=R(1,3);
    return {q:`Bilangan yang hilang: ${q.map((x,i)=>i===k?'...':x).join(', ')}`,ans:q[k],kind:'int',steps:[`Selisih antarsuku ${s}.`,`${q[k-1]} + ${s} = <b>${q[k]}</b>.`]}},
  volKubusSatuan(){const p=R(2,6),l=R(2,5),t=R(2,4);
    if(LV===1){let s='';for(let i=0;i<p;i++)for(let j=0;j<l;j++)s+=`<rect x="${4+i*20}" y="${4+j*20}" width="20" height="20" fill="#FFE6D3" stroke="#F2701D" stroke-width="2"/>`;
      return {q:`Satu lapis kubus satuan disusun seperti gambar (dilihat dari atas). Berapa banyak kubusnya?${SVG(s,`0 0 ${p*20+8} ${l*20+8}`,Math.min(260,p*36))}`,ans:p*l,kind:'int',
        steps:[`Ada ${l} baris, setiap baris ${p} kubus.`,`${l} × ${p} = <b>${p*l}</b> kubus.`]}}
    if(LV===2)return {q:`Sebuah balok disusun dari kubus satuan: panjang ${p}, lebar ${l}, dan tinggi ${t} kubus. Berapa banyak kubus satuan seluruhnya?`,ans:p*l*t,kind:'int',
      steps:[`Satu lapis: ${p} × ${l} = ${p*l} kubus.`,`Ada ${t} lapis: ${p*l} × ${t} = <b>${p*l*t}</b> kubus.`]};
    if(Math.random()<.5){const s=R(2,5);return {q:`Sebuah kubus besar disusun dari kubus satuan. Panjang rusuknya ${s} kubus. Berapa banyak kubus satuannya?`,ans:s**3,kind:'int',
      steps:[`Banyak kubus = rusuk × rusuk × rusuk.`,`${s} × ${s} × ${s} = <b>${s**3}</b> kubus.`]}}
    const L=R(2,6),g=pick([200,250,500]),n=L*1000/g;
    return {q:`Air ${L} liter dituang ke gelas-gelas berisi ${g} ml. Berapa gelas yang terisi penuh?`,ans:n,kind:'int',
      steps:[`${L} liter = ${fmtN(L*1000)} ml.`,`${fmtN(L*1000)} : ${g} = <b>${n}</b> gelas.`]}},
  durasi(){
    if(LV===1){const h=R(6,15),d=R(1,5),t0=h*60,ans=jam(t0+d*60);
      return {q:`Sekarang pukul ${jam(t0)}. Pukul berapa ${d} jam lagi?`,ans,kind:'str',choices:strChoices(ans,[jam(t0+(d+1)*60),jam(t0+(d+2)*60),jam(t0+d*60+30),jam(t0+(d-1)*60+30)]),
        steps:[`Tambahkan jamnya: ${h} + ${d} = ${h+d}.`,`Jadi pukul <b>${ans}</b>.`]}}
    if(LV===2){const t0=R(6,15)*60+pick([0,15,30]),d=R(2,9)*10+pick([0,5]),o=nm();
      return {q:`${o} bermain dari pukul ${jam(t0)} sampai pukul ${jam(t0+d)}. Berapa menit ${o} bermain?`,ans:d,kind:'int',hint:'Tulis angkanya saja.',
        steps:[`Hitung dari ${jam(t0)} sampai ${jam(t0+d)}${Math.floor((t0+d)/60)>Math.floor(t0/60)?`, lewat pukul ${jam(Math.ceil(t0/60)*60)}`:''}.`,`Lamanya <b>${d}</b> menit.`]}}
    const t0=R(6,14)*60+pick([10,20,25,40,45,50]),dh=R(1,3),dm=pick([15,20,35,40,50]),t1=t0+dh*60+dm,ans=jam(t1);
    return {q:`Kereta berangkat pukul ${jam(t0)}. Lama perjalanannya ${dh} jam ${dm} menit. Pukul berapa kereta tiba?`,ans,kind:'str',choices:strChoices(ans,[jam(t1+10),jam(t1-10),jam(t1+60),jam(t0+dh*60+dm-60)]),
      steps:[`${jam(t0)} + ${dh} jam = ${jam(t0+dh*60)}.`,`${jam(t0+dh*60)} + ${dm} menit = <b>${ans}</b>.`]}},

  /* ---------- Kelas 5 ---------- */
  bilJutaan(){let n=R(100001,999999),s=String(n);
    if(LV===1){let i;do{n=R(100001,999999);s=String(n);const ok=[0,1,2,3,4].filter(j=>s[j]!=='0'&&s.split(s[j]).length===2);i=ok.length?pick(ok):-1}while(i<0);
      const dig=+s[i],place=5-i,val=dig*10**place;
      return {q:`Berapa nilai angka <b>${dig}</b> pada bilangan <b>${fmtN(n)}</b>?`,ans:val,kind:'int',hint:'Tulis angkanya saja.',
        steps:[`Angka ${dig} berada di tempat ${TEMPAT[place]}.`,`Nilainya ${dig} × ${fmtN(10**place)} = <b>${fmtN(val)}</b>.`]}}
    if(LV===2){const to=pick([1000,10000,100000]),r=Math.round(n/to)*to,lb={1000:'ribuan',10000:'puluh ribuan',100000:'ratus ribuan'}[to],dg=Math.floor(n%to/(to/10));
      return {q:`Bulatkan <b>${fmtN(n)}</b> ke ${lb} terdekat.`,ans:r,kind:'int',hint:'Tulis angkanya saja.',
        steps:[`Lihat angka tepat di sebelah kanan tempat ${lb}: ${dg}.`,`${dg>=5?`${dg} ≥ 5, dibulatkan ke atas`:`${dg} < 5, dibulatkan ke bawah`}: <b>${fmtN(r)}</b>.`]}}
    return {q:`Tulis lambang bilangan dari: <b>${terbilang(n)}</b>`,ans:n,kind:'int',hint:'Tulis angkanya saja.',
      steps:[`Bagian ribuan: ${terbilang(Math.floor(n/1000))} ribu → ${Math.floor(n/1000)}.`,`Sisanya: ${n%1000?terbilang(n%1000):'nol'} → ${String(n%1000).padStart(3,'0')}.`,`Jadi <b>${fmtN(n)}</b>.`]}},
  prima(){
    if(LV===1){const P=[7,11,13,17,19,23,29,31,37,41,43,47],C=[9,15,21,25,27,33,35,39,45,49],p=pick(P),bad=shuffle(C.slice()).slice(0,3);
      return {q:`Manakah yang merupakan bilangan prima?`,ans:String(p),kind:'str',choices:shuffle([p,...bad]).map(String),
        steps:[`Bilangan prima hanya punya 2 faktor: 1 dan dirinya sendiri.`,...bad.map(b=>{const f=[3,5,7].find(x=>b%x===0);return `${b} = ${f} × ${b/f}, bukan prima.`}),`Jadi jawabannya <b>${p}</b>.`]}}
    if(LV===2){const a=R(1,40),b=a+R(10,25),L=[];for(let i=a+1;i<b;i++)if(isPrima(i))L.push(i);
      return {q:`Ada berapa bilangan prima di antara ${a} dan ${b}?`,ans:L.length,kind:'int',steps:[`Bilangan prima di antara ${a} dan ${b}: ${L.join(', ')||'tidak ada'}.`,`Banyaknya <b>${L.length}</b>.`]}}
    let e;do{e=[R(1,4),R(0,2),R(0,1),R(0,1)]}while(e[1]+e[2]+e[3]===0||(e[2]&&e[3]));
    const fmt=x=>[[2,x[0]],[3,x[1]],[5,x[2]],[7,x[3]]].filter(t=>t[1]>0).map(([p,k])=>p+(k>1?supN(k):'')).join(' × ');
    const n=2**e[0]*3**e[1]*5**e[2]*7**e[3],ans=fmt(e);let m=n;const ds=[];for(const p of [2,3,5,7])while(m%p===0){ds.push(`${m} : ${p} = ${m/p}`);m/=p}
    const alt=[[e[0]+1,e[1],e[2],e[3]],[e[0],e[1]+1,e[2],e[3]],[e[0]>1?e[0]-1:e[0]+2,e[1],e[2],e[3]],[e[0],e[1]?e[1]-1:2,e[2],e[3]]].map(fmt);
    return {q:`Faktorisasi prima dari <b>${n}</b> adalah ...`,ans,kind:'str',choices:strChoices(ans,alt),
      steps:[`Bagi terus dengan bilangan prima: ${ds.join('; ')}.`,`Jadi ${n} = <b>${ans}</b>.`]}},
  pecCampuran(){let d,n;do{d=R(LV===3?3:2,D(5,8,10));n=R(1,d-1)}while(gcd(n,d)>1);const w=R(1,D(3,5,6)),imp=w*d+n,mix=`${w} ${n}/${d}`;
    if(LV===1)return {q:`${w} ${F(n,d)} = ${F('?',d)}`,ans:imp,kind:'int',hint:'Tulis pembilangnya saja.',
      steps:[`Kalikan bilangan bulat dengan penyebut: ${w} × ${d} = ${w*d}.`,`Tambahkan pembilang: ${w*d} + ${n} = <b>${imp}</b>.`,`Jadi ${w} ${F(n,d)} = ${F(imp,d)}.`]};
    if(LV===2)return {q:`${F(imp,d)} = ... (tulis sebagai pecahan campuran)`,ans:mix,kind:'str',choices:strChoices(mix,[`${w+1} ${n}/${d}`,`${w} ${d-n}/${d}`,`${w>1?w-1:w+2} ${n}/${d}`,`${w+1} ${d-n}/${d}`]),
      steps:[`${imp} : ${d} = ${w} sisa ${n}.`,`Hasil bagi menjadi bilangan bulat, sisa menjadi pembilang: <b>${mix}</b>.`]};
    let n1,n2;do{n1=R(1,d-1);n2=R(1,d-1)}while(n1+n2===d);const a1=R(1,3),b1=R(1,3),tot=(a1+b1)*d+n1+n2,W=Math.floor(tot/d),N=tot%d,g=gcd(N,d),ans=`${W} ${N/g}/${d/g}`;
    return {q:`${a1} ${F(n1,d)} + ${b1} ${F(n2,d)} = ...`,ans,kind:'str',choices:strChoices(ans,[`${W+1} ${N/g}/${d/g}`,`${W>1?W-1:W+2} ${N/g}/${d/g}`,`${a1+b1} ${n1+n2}/${2*d}`,`${W} ${N/g}/${d/g+1}`]),
      steps:[`Jumlahkan bilangan bulatnya: ${a1} + ${b1} = ${a1+b1}.`,`Jumlahkan pecahannya: ${F(n1,d)} + ${F(n2,d)} = ${F(n1+n2,d)}${n1+n2>d?` = 1 ${F(n1+n2-d,d)}`:''}.`,`Gabungkan${g>1?' lalu sederhanakan':''}: <b>${ans}</b>.`]}},
  sudutK5(){const v=v3([0],[1,2],[2,3]);
    if(v===0){const d=pick([R(10,85),90,R(95,175),180]);return {q:`Sudut yang besarnya <b>${d}°</b> termasuk ...`,ans:JENIS(d),kind:'str',choices:[...JENIS3,'Sudut lurus'],
      steps:[`Lancip < 90°, siku-siku = 90°, tumpul di antara 90° dan 180°, lurus = 180°.`,`Jadi ${d}° adalah <b>${JENIS(d).toLowerCase()}</b>.`]}}
    if(v===1){const a=R(20,160);return {q:`Dua sudut bersebelahan membentuk garis lurus. Salah satunya ${a}°. Berapa derajat sudut yang lain?`,ans:180-a,kind:'int',hint:'Tulis angkanya saja.',
      steps:[`Sudut pada garis lurus jumlahnya 180°.`,`180° − ${a}° = <b>${180-a}°</b>.`]}}
    if(v===2){const a=R(30,90),b=R(20,150-a);return {q:`Dua sudut segitiga besarnya ${a}° dan ${b}°. Berapa derajat sudut ketiga?`,ans:180-a-b,kind:'int',hint:'Tulis angkanya saja.',
      steps:[`Jumlah sudut segitiga = 180°.`,`180° − ${a}° − ${b}° = <b>${180-a-b}°</b>.`]}}
    const h=R(1,11),j=Math.min(h,12-h);return {q:`Berapa derajat sudut terkecil antara kedua jarum jam pada pukul ${h}.00?`,ans:j*30,kind:'int',hint:'Tulis angkanya saja.',
      steps:[`Satu putaran 360° dibagi 12 angka, jadi jarak antarangka 30°.`,`Jarak kedua jarum ${j} angka: ${j} × 30° = <b>${j*30}°</b>.`]}},
  luasBangun(){const v=v3([0,1],[1,2],[2,3]);
    if(v===0){const a=R(2,12)*2,t=R(3,15);return {q:`Luas segitiga dengan alas ${a} cm dan tinggi ${t} cm adalah ... cm²`,ans:a*t/2,kind:'int',hint:'Tulis angkanya saja.',
      steps:[`Luas segitiga = alas × tinggi : 2.`,`${a} × ${t} : 2 = <b>${a*t/2}</b> cm².`]}}
    if(v===1){const a=R(4,20),t=R(3,15);return {q:`Luas jajar genjang dengan alas ${a} cm dan tinggi ${t} cm adalah ... cm²`,ans:a*t,kind:'int',hint:'Tulis angkanya saja.',
      steps:[`Luas jajar genjang = alas × tinggi.`,`${a} × ${t} = <b>${a*t}</b> cm².`]}}
    if(v===2){let a,b,t;do{a=R(4,20);b=R(4,20);t=R(3,12)}while(a===b||((a+b)*t)%2);
      return {q:`Sebuah trapesium memiliki sisi sejajar ${a} cm dan ${b} cm, serta tinggi ${t} cm. Berapa cm² luasnya?`,ans:(a+b)*t/2,kind:'int',hint:'Tulis angkanya saja.',
        steps:[`Luas trapesium = (jumlah sisi sejajar) × tinggi : 2.`,`(${a} + ${b}) × ${t} : 2 = ${a+b} × ${t} : 2 = <b>${(a+b)*t/2}</b> cm².`]}}
    const a=R(3,12)*2,t=R(3,15),L=a*t/2;return {q:`Luas sebuah segitiga ${L} cm² dan alasnya ${a} cm. Berapa cm tingginya?`,ans:t,kind:'int',hint:'Tulis angkanya saja.',
      steps:[`Tinggi = luas × 2 : alas.`,`${L} × 2 : ${a} = <b>${t}</b> cm.`]}},

  /* ---------- Kelas 6 ---------- */
  bagiPecahan(){const v=v3([0],[0,1],[1,2]);
    if(v===0){const d=R(2,9),n=R(1,d-1),k=R(2,6);return {q:`${F(n,d)} : ${k} = ?`,ans:[n,d*k],kind:'frac',hint:'Tulis pecahan seperti 1/6.',
      steps:simpSteps(n,d*k,[`Membagi dengan ${k} sama dengan mengalikan ${F(1,k)}.`,`${F(n,d)} × ${F(1,k)} = ${F(n,d*k)}.`])}}
    if(v===1){const k=R(2,9),d=R(2,6),n=R(1,d-1);return {q:`${k} : ${F(n,d)} = ?`,ans:[k*d,n],kind:'frac',hint:'Tulis pecahan seperti 7/2, atau bilangan bulat.',
      steps:simpSteps(k*d,n,[`Membagi dengan pecahan sama dengan mengalikan kebalikannya, yaitu ${F(d,n)}.`,`${k} × ${F(d,n)} = ${F(k*d,n)}.`])}}
    const b=R(2,9),a=R(1,b-1),d=R(2,9),c=R(1,d-1);return {q:`${F(a,b)} : ${F(c,d)} = ?`,ans:[a*d,b*c],kind:'frac',hint:'Tulis pecahan seperti 3/4.',
      steps:simpSteps(a*d,b*c,[`Balik pecahan kedua lalu kalikan: ${F(a,b)} × ${F(d,c)}.`,`${F(a,b)} × ${F(d,c)} = ${F(a*d,b*c)}.`])}},
  koordinat(){const N=8;
    if(LV<3){if(LV===1||Math.random()<.5){const x=R(1,N-1),y=R(1,N-1),ans=`(${x}, ${y})`;
        return {q:`Koordinat titik A adalah ...${gridSVG(N,[[x,y,'A']])}`,ans,kind:'str',choices:strChoices(ans,[`(${y}, ${x})`,`(${x+1}, ${y})`,`(${x}, ${y-1})`,`(${x-1}, ${y+1})`]),
          steps:[`Baca sumbu-x (mendatar) dulu: titik A di ${x}.`,`Lalu sumbu-y (tegak): ${y}.`,`Jadi koordinatnya <b>${ans}</b>.`]}}
      const L=['A','B','C','D'],pts=[];while(pts.length<4){const p=[R(1,N-1),R(1,N-1)];if(!pts.some(q=>q[0]===p[0]&&q[1]===p[1]))pts.push(p)}const i=R(0,3);
      return {q:`Titik manakah yang berada di koordinat (${pts[i][0]}, ${pts[i][1]})?${gridSVG(N,pts.map((p,j)=>[...p,L[j]]))}`,ans:L[i],kind:'str',choices:L,
        steps:[`Mulai dari titik (0, 0), bergerak ke kanan ${pts[i][0]} lalu ke atas ${pts[i][1]}.`,`Di situ ada titik <b>${L[i]}</b>.`]}}
    const x1=R(1,4),x2=R(x1+2,N-1),y1=R(1,4),y2=R(y1+2,N-1),ans=`(${x1}, ${y2})`;
    return {q:`A, B, dan C adalah titik sudut persegi panjang ABCD. Koordinat titik D adalah ...${gridSVG(N,[[x1,y1,'A'],[x2,y1,'B'],[x2,y2,'C']])}`,ans,kind:'str',
      choices:strChoices(ans,[`(${y2}, ${x1})`,`(${x2}, ${y1+1})`,`(${x1}, ${y1})`,`(${x1+1}, ${y2})`]),
      steps:[`D berada tepat di atas A, jadi koordinat x-nya sama dengan A: ${x1}.`,`D sejajar mendatar dengan C, jadi koordinat y-nya sama dengan C: ${y2}.`,`Jadi D = <b>${ans}</b>.`]}},
  satuanVolume(){const v=v3([0,1],[1,2],[2,3]);
    if(v===0){const l=R(1,9);return {q:`${l} liter = ... ml`,ans:l*1000,kind:'int',steps:[`1 liter = 1.000 ml.`,`${l} × 1.000 = <b>${fmtN(l*1000)}</b> ml.`]}}
    if(v===1){const l=R(2,9);return {q:`${fmtN(l*1000)} ml = ... liter`,ans:l,kind:'int',steps:[`1.000 ml = 1 liter.`,`${fmtN(l*1000)} : 1.000 = <b>${l}</b> liter.`]}}
    if(v===2){const l=R(1,5),m=pick([250,500,750]);return {q:`${l} liter ${m} ml = ... cm³`,ans:l*1000+m,kind:'int',hint:'Tulis angkanya saja.',
      steps:[`1 liter = 1.000 ml, dan 1 ml = 1 cm³.`,`${l} liter ${m} ml = ${fmtN(l*1000+m)} ml = <b>${fmtN(l*1000+m)}</b> cm³.`]}}
    const B=pick([1500,2000,2500,3000]),g=pick([250,500]),n=B/g;
    return {q:`Sebotol air berisi ${fmtD(B/1000,1)} liter dituang ke gelas-gelas ${g} ml. Berapa gelas yang terisi penuh?`,ans:n,kind:'int',
      steps:[`${fmtD(B/1000,1)} liter = ${fmtN(B)} ml.`,`${fmtN(B)} : ${g} = <b>${n}</b> gelas.`]}},
  peluangSD(){const v=v3([0],[0,1],[1,2]);
    if(v===0){if(Math.random()<.35)return {q:`Sebuah koin dilempar sekali. Berapa peluang muncul gambar?`,ans:[1,2],kind:'frac',hint:'Tulis pecahan seperti 1/2.',
        steps:[`Hasil yang mungkin: angka atau gambar (2 hasil).`,`Peluang muncul gambar = <b>${F(1,2)}</b>.`]};
      const [t,S]=LV===1?(()=>{const e=R(1,6);return [`angka ${e}`,[e]]})():pick([['angka genap',[2,4,6]],['angka ganjil',[1,3,5]],['angka lebih dari 4',[5,6]],['angka kurang dari 3',[1,2]],['angka faktor dari 6',[1,2,3,6]]]);
      return {q:`Sebuah dadu dilempar sekali. Berapa peluang muncul ${t}?`,ans:[S.length,6],kind:'frac',hint:'Tulis pecahan seperti 1/6.',
        steps:simpSteps(S.length,6,[`Dadu punya 6 hasil: 1, 2, 3, 4, 5, 6.`,`Hasil yang diharapkan: ${S.join(', ')} (${S.length} hasil).`,`Peluang = ${F(S.length,6)}.`])}}
    const m=R(2,6),b=R(2,6),k=R(1,5),tot=m+b+k,[w,c]=pick([['merah',m],['biru',b],['kuning',k]]);
    if(v===1)return {q:`Dalam kantong ada ${m} bola merah, ${b} bola biru, dan ${k} bola kuning. Satu bola diambil tanpa melihat. Berapa peluang terambil bola ${w}?`,ans:[c,tot],kind:'frac',hint:'Tulis pecahan seperti 2/9.',
      steps:simpSteps(c,tot,[`Jumlah semua bola: ${m} + ${b} + ${k} = ${tot}.`,`Bola ${w} ada ${c}, jadi peluangnya ${F(c,tot)}.`])};
    const n=R(2,10)*6,e=R(1,6);return {q:`Sebuah dadu dilempar ${n} kali. Berapa kali kira-kira muncul angka ${e}?`,ans:n/6,kind:'int',
      steps:[`Peluang muncul angka ${e} = ${F(1,6)}.`,`Frekuensi harapan = ${F(1,6)} × ${n} = <b>${n/6}</b> kali.`]}},
  luasGabungan(){const u=12,v=v3([0],[0,1],[1,2]);
    if(v===0){const a=R(3,7),b=R(3,6),c=R(2,5),d=R(2,b);const W=(a+c)*u,H=b*u;
      const s=`<rect x="4" y="4" width="${a*u}" height="${b*u}" ${STY}/><rect x="${4+a*u}" y="${4+H-d*u}" width="${c*u}" height="${d*u}" ${STY}/>${lab(4+a*u/2,H+20,`${a} cm`)}${lab(4+a*u+c*u/2,H+20,`${c} cm`)}<text x="0" y="${4+H/2+4}" font-size="11" font-weight="800" text-anchor="end">${b} cm</text><text x="${8+(a+c)*u}" y="${4+H-d*u/2+4}" font-size="11" font-weight="800">${d} cm</text>`;
      return {q:`Bangun ini terdiri dari dua persegi panjang. Berapa cm² luas seluruhnya?${SVG(s,`-36 0 ${W+90} ${H+28}`,300)}`,ans:a*b+c*d,kind:'int',hint:'Tulis angkanya saja.',
        steps:[`Luas bagian kiri: ${a} × ${b} = ${a*b} cm².`,`Luas bagian kanan: ${c} × ${d} = ${c*d} cm².`,`Jumlahnya ${a*b} + ${c*d} = <b>${a*b+c*d}</b> cm².`]}}
    if(v===1){const W=R(6,10),H=R(5,9),w=R(2,W-3),h=R(2,H-3),X=W*u,Y=H*u;
      const pts=`4,4 ${4+(W-w)*u},4 ${4+(W-w)*u},${4+h*u} ${4+X},${4+h*u} ${4+X},${4+Y} 4,${4+Y}`;
      const s=`<polygon points="${pts}" ${STY}/>${lab(4+X/2,Y+20,`${W} cm`)}<text x="${4+(W-w)*u/2}" y="0" font-size="11" font-weight="800" text-anchor="middle">${W-w} cm</text><text x="${8+X}" y="${4+h*u+(Y-h*u)/2+4}" font-size="11" font-weight="800">${H-h} cm</text><text x="0" y="${4+Y/2}" font-size="11" font-weight="800" text-anchor="end">${H} cm</text>`;
      return {q:`Berapa cm² luas bangun berbentuk L ini?${SVG(s,`-36 -14 ${X+90} ${Y+40}`,300)}`,ans:W*H-w*h,kind:'int',hint:'Tulis angkanya saja.',
        steps:[`Anggap bangun ini persegi panjang ${W} × ${H} = ${W*H} cm² yang pojok kanan atasnya dipotong.`,`Potongannya berukuran ${W} − ${W-w} = ${w} cm kali ${H} − ${H-h} = ${h} cm, luasnya ${w*h} cm².`,`${W*H} − ${w*h} = <b>${W*H-w*h}</b> cm².`]}}
    const W=R(3,6)*2,H=R(4,8),t=R(3,6),X=W*u;
    const s=`<polygon points="4,${4+t*u} ${4+X/2},4 ${4+X},${4+t*u}" ${STY}/><rect x="4" y="${4+t*u}" width="${X}" height="${H*u}" ${STY}/>${lab(4+X/2,(t+H)*u+20,`${W} cm`)}<text x="${8+X}" y="${4+t*u+H*u/2}" font-size="11" font-weight="800">${H} cm</text><text x="${8+X/2}" y="${4+t*u/2+4}" font-size="11" font-weight="800">tinggi ${t} cm</text><line x1="${4+X/2}" y1="4" x2="${4+X/2}" y2="${4+t*u}" stroke="#1F2A2E" stroke-dasharray="3 3"/>`;
    return {q:`Bangun rumah ini terdiri dari persegi panjang dan segitiga. Berapa cm² luasnya?${SVG(s,`0 0 ${X+80} ${(t+H)*u+26}`,300)}`,ans:W*H+W*t/2,kind:'int',hint:'Tulis angkanya saja.',
      steps:[`Persegi panjang: ${W} × ${H} = ${W*H} cm².`,`Segitiga: ${W} × ${t} : 2 = ${W*t/2} cm².`,`Jumlahnya ${W*H} + ${W*t/2} = <b>${W*H+W*t/2}</b> cm².`]}},
};

/* [id, nama, keterangan, fungsi soal, parameter] — ditambahkan sebelum "Latihan campuran" */
const TOPIK_EXTRA={
  1:[['k1-hitung','Bilangan sampai 20','Menghitung banyak benda','hitungBenda'],['k1-panjang','Membandingkan panjang','Paling panjang, paling pendek, satuan tak baku','panjangK1'],
     ['k1-grafik','Grafik gambar','Membaca data dari gambar','grafikGambar',1]],
  2:[['k2-ganjil','Ganjil dan genap','Mengenal bilangan ganjil dan genap','ganjilGenap'],['k2-ruang','Bangun ruang','Kubus, balok, tabung, kerucut, bola','bangunRuang'],
     ['k2-pec','Pecahan sederhana','Setengah dan seperempat','pecSederhana'],['k2-berat','Berat benda','Membandingkan berat dan satuan tak baku','beratK2'],
     ['k2-grafik','Grafik gambar','Membaca dan menafsirkan data','grafikGambar',2]],
  3:[['k3-bil','Bilangan sampai 1.000','Nilai tempat dan lambang bilangan','bil1000'],['k3-pjg','Satuan panjang','m, cm, dan km','satuanPanjang'],
     ['k3-berat','Satuan berat','kg dan g','satuanBerat'],['k3-sudut','Garis dan sudut','Jenis sudut, garis sejajar dan tegak lurus','sudutK3'],
     ['k3-data','Diagram batang','Membaca data dari diagram','diagramBatang',3]],
  4:[['k4-kali','Perkalian & pembagian','Bersusun, pembagian bersisa','kaliBagiK4'],['k4-faktor','Faktor dan kelipatan','Faktor, kelipatan, banyak kelipatan','faktorKelipatan'],
     ['k4-desimal','Pecahan, desimal, dan persen','Per sepuluh dan per seratus','pecDesimalK4'],['k4-segi','Segi banyak','Ciri-ciri bangun datar','segiBanyak'],
     ['k4-pola','Pola bilangan','Melanjutkan dan melengkapi pola','polaK4'],['k4-vol','Volume dengan kubus satuan','Kubus satuan dan liter','volKubusSatuan'],
     ['k4-durasi','Durasi waktu','Jam mulai, jam selesai, dan lama kegiatan','durasi']],
  5:[['k5-bil','Bilangan sampai 1.000.000','Nilai tempat dan pembulatan','bilJutaan'],['k5-prima','Bilangan prima & faktorisasi','Prima dan pohon faktor','prima'],
     ['k5-camp','Pecahan campuran','Mengubah dan menjumlahkan','pecCampuran'],['k5-sudut','Sudut','Jenis sudut, garis lurus, dan segitiga','sudutK5'],
     ['k5-luas','Luas segitiga & segi empat','Segitiga, jajar genjang, trapesium','luasBangun'],['k5-data','Diagram batang','Membaca dan mengolah data','diagramBatang',5]],
  6:[['k6-bagi','Pembagian pecahan','Pecahan dibagi bilangan dan pecahan','bagiPecahan'],['k6-koor','Bidang koordinat','Membaca letak titik','koordinat'],
     ['k6-vol','Satuan volume','Liter, ml, dan cm³','satuanVolume'],['k6-pel','Peluang','Koin, dadu, dan kantong bola','peluangSD'],
     ['k6-gab','Luas bangun gabungan','Persegi panjang dan segitiga','luasGabungan']],
};
window.G_EXTRA=G_EXTRA;window.TOPIK_EXTRA=TOPIK_EXTRA;
})();
