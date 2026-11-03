import JSZip from 'jszip';
import '@fontsource/chakra-petch/600.css';
import '@fontsource/chakra-petch/700.css';
import '@fontsource/chakra-petch/700-italic.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import './styles.css';
import { EN } from './i18n.js';
import { openStore, isTauri } from './storage.js';

const $=s=>document.querySelector(s);
let L=(navigator.language||'de').toLowerCase().startsWith('de')?'de':'en';
const LOC=()=>L==='en'?'en-GB':'de-DE';
const CUR=()=>(typeof S!=='undefined'&&S.settings.cur)||'EUR';
const CURRENCIES=[['EUR','Euro'],['USD','US-Dollar|US dollar'],['GBP','Britisches Pfund|British pound'],['CHF','Schweizer Franken|Swiss franc'],['PLN','Polnischer Złoty|Polish złoty'],['CZK','Tschechische Krone|Czech koruna'],['SEK','Schwedische Krone|Swedish krona'],['DKK','Dänische Krone|Danish krone'],['NOK','Norwegische Krone|Norwegian krone'],['HUF','Forint|Hungarian forint'],['CAD','Kanadischer Dollar|Canadian dollar'],['AUD','Australischer Dollar|Australian dollar'],['JPY','Yen|Japanese yen'],['CNY','Renminbi|Chinese yuan']];
const eur=v=>(isFinite(v)?v:0).toLocaleString(LOC(),{style:'currency',currency:CUR()});
const sym=()=>{try{return new Intl.NumberFormat(LOC(),{style:'currency',currency:CUR()}).formatToParts(0).find(x=>x.type==='currency').value}catch(e){return CUR()}};
function renderCurrency(){
  document.querySelectorAll('.cur').forEach(el=>el.textContent=sym());
  $('#s-cur').innerHTML=CURRENCIES.map(([c,n])=>{const nm=n.split('|')[L==='en'&&n.includes('|')?1:0];return `<option value="${c}" ${c===CUR()?'selected':''}>${c} – ${nm}</option>`}).join('');
  $('#s-round').innerHTML=[['none',t('keine')],['0.10',t('auf {x}',{x:eur(0.1)})],['0.50',t('auf {x}',{x:eur(0.5)})],['0.99',t('auf ,99')]].map(([v,n])=>`<option value="${v}" ${v===S.settings.round?'selected':''}>${n}</option>`).join('');
}
const fmt=(v,d=2)=>(+v).toLocaleString(LOC(),{minimumFractionDigits:d,maximumFractionDigits:d});
const t=(k,vars)=>{let s=(L==='en'&&EN[k]!==undefined)?EN[k]:k;if(vars)for(const x in vars)s=s.split('{'+x+'}').join(vars[x]);return s};
const pn=x=>t('Platte')+' '+x.name;
/* Statische Texte übersetzen */
const STATIC=[];
function captureStatic(){
  const w=document.createTreeWalker(document.querySelector('.wrap'),NodeFilter.SHOW_TEXT);
  let n;while((n=w.nextNode())){const k=n.nodeValue.trim();if(k&&(EN[k]!==undefined||n.parentElement.dataset.en))STATIC.push({n,k,raw:n.nodeValue,en:n.parentElement.dataset.en})}
  document.querySelectorAll('.wrap [placeholder],.wrap [aria-label],.wrap [title]').forEach(el=>['placeholder','aria-label','title'].forEach(a=>{const k=el.getAttribute(a);if(k&&EN[k]!==undefined)STATIC.push({el,a,k})}));
}
function applyStatic(){
  STATIC.forEach(x=>{const val=L==='en'?(x.en||EN[x.k]):x.k;if(x.n)x.n.nodeValue=x.raw.replace(x.k,val);else x.el.setAttribute(x.a,val)});
  document.documentElement.lang=L;
  $('#l-de').setAttribute('aria-pressed',L==='de');$('#l-en').setAttribute('aria-pressed',L==='en');
}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const S={
  settings:{kwh:0.32,vat:19,klein:true,round:'0.50',valid:14,cur:'EUR'},
  sender:{name:'Torsten Weise',company:'#Powerscripting',street:'',zip:'',city:'',mail:'',phone:'',web:'powerscripting.de',taxid:'',iban:'',bank:''},
  logo:null,
  printers:[
    {id:'h2s',name:'Bambu Lab H2S',price:1699,life:6000,watt:260,wear:0.20},
    {id:'h2c',name:'Bambu Lab H2C',price:2199,life:6000,watt:300,wear:0.28}],
  filaments:[
    {id:'f1',name:'PETG-CF Schwarz',brand:'Bambu Lab',type:'PETG-CF',color:'#1d1f22',price:34.99,kg:1,stock:640},
    {id:'f2',name:'PLA Basic Weiß',brand:'Bambu Lab',type:'PLA',color:'#f4f4f2',price:19.99,kg:1,stock:820},
    {id:'f3',name:'PLA Matte Grau',brand:'Sunlu',type:'PLA',color:'#8b8d90',price:15.99,kg:1,stock:310},
    {id:'f4',name:'PETG Transparent Blau',brand:'Sunlu',type:'PETG',color:'#2f7fd8',price:16.99,kg:1,stock:95},
    {id:'f5',name:'TPU 95A Schwarz',brand:'Bambu Lab',type:'TPU',color:'#202020',price:41.99,kg:1,stock:450},
    {id:'f6',name:'ASA Rot',brand:'Bambu Lab',type:'ASA',color:'#c3262c',price:29.99,kg:1,stock:1000}],
  profiles:[
    {id:'fam',name:'Freunde & Familie',margin:0,rate:0,risk:5},
    {id:'priv',name:'Verkauf privat',margin:40,rate:20,risk:10},
    {id:'gew',name:'Gewerblich',margin:30,rate:45,risk:12}],
  job:null
};
const DEMO=()=>({file:'Kabelhalter_v3.gcode.3mf',meta:'Beispieldatei · 2 Druckplatten · aus Bambu Studio',kind:'demo',plate:0,
  plates:[
    {name:1,hours:3.7,ppp:4,purge:9,lines:[{slot:'A1',type:'PETG-CF',color:'#1d1f22',grams:86,fil:'f1'},{slot:'A2',type:'PLA',color:'#f4f4f2',grams:12,fil:'f2'}]},
    {name:2,hours:1.25,ppp:8,purge:0,lines:[{slot:'A1',type:'PETG-CF',color:'#1d1f22',grams:41,fil:'f1'}]}],
  printer:'h2s',profile:'priv',qty:10,prep:10,post:3,
  extras:[{name:'Gewindeeinsatz M3',price:0.08,n:4},{name:'Neodym-Magnet 6×2',price:0.12,n:2}]});
S.job=DEMO();

/* Speichern: Server (Docker), Datei (Windows-App) oder Browser */
let store=null,saveTimer=null;
const snapshot=()=>({version:1,lang:L,settings:S.settings,sender:S.sender,logo:S.logo,printers:S.printers,filaments:S.filaments,profiles:S.profiles});
function applyData(d){
  if(!d||typeof d!=='object')return;
  if(d.lang==='de'||d.lang==='en')L=d.lang;
  if(d.settings)Object.assign(S.settings,d.settings);
  if(d.sender)Object.assign(S.sender,d.sender);
  if('logo' in d)S.logo=d.logo||null;
  if(Array.isArray(d.printers)&&d.printers.length)S.printers=d.printers;
  if(Array.isArray(d.filaments)&&d.filaments.length)S.filaments=d.filaments;
  if(Array.isArray(d.profiles)&&d.profiles.length)S.profiles=d.profiles;
}
function setSaveState(k){const el=$('#savestate');if(el){el.dataset.state=k;el.textContent=t(k==='saving'?'Speichert …':k==='error'?'Nicht gespeichert':'Gespeichert')}}
const persist=()=>{if(!store)return;clearTimeout(saveTimer);setSaveState('saving');
  saveTimer=setTimeout(async()=>{try{await store.save(snapshot());setSaveState('saved')}catch(err){console.error(err);setSaveState('error');toast(t('Speichern fehlgeschlagen: {e}',{e:err.message||err}))}},400)};
const SENDER=[['name','Name'],['company','Firma / Marke'],['mail','E-Mail'],['street','Straße & Nr.'],['zip','PLZ'],['city','Ort'],['phone','Telefon'],['web','Webseite'],['taxid','Steuernr. / USt-IdNr.'],['bank','Bank'],['iban','IBAN']];
const NEWPROJ=()=>({file:'Eigenes Projekt',meta:'Manuelle Eingabe · Werte aus dem Slicer übernehmen',kind:'new',manual:true,plate:0,
  plates:[{name:1,hours:2,ppp:1,purge:0,lines:[{slot:'#1',grams:50,fil:S.filaments[0].id,manual:true}]}],
  printer:S.job?S.job.printer:'h2s',profile:S.job?S.job.profile:'priv',qty:1,prep:10,post:5,extras:[]});

const fil=id=>S.filaments.find(f=>f.id===id)||S.filaments[0];
const pr=()=>S.printers.find(p=>p.id===S.job.printer)||S.printers[0];
const prof=()=>S.profiles.find(p=>p.id===S.job.profile)||S.profiles[0];
const plate=()=>S.job.plates[S.job.plate];
const perKg=f=>f.price/(f.kg||1);

function roundUnit(u){
  const r=S.settings.round;
  if(r==='none')return u;
  if(r==='0.99'){const b=Math.floor(u)+0.99;return b>=u-1e-9?b:b+1}
  const step=+r;return Math.ceil((u-1e-9)/step)*step;
}

function calc(qty){
  const p=plate(),P=pr(),R=prof(),st=S.settings,ppp=Math.max(1,p.ppp|0);
  const plateMat=p.lines.reduce((a,l)=>a+l.grams*perKg(fil(l.fil))/1000,0)+(p.lines[0]?p.purge*perKg(fil(p.lines[0].fil))/1000:0);
  const hPart=p.hours/ppp, plates=Math.ceil(qty/ppp), h=hPart*qty;
  const parts={
    mat:plateMat/ppp*qty,
    strom:h*P.watt/1000*st.kwh,
    masch:h*P.price/Math.max(1,P.life),
    wear:h*P.wear,
    labor:R.rate>0?(plates*S.job.prep+qty*S.job.post)/60*R.rate:0,
    extra:qty*S.job.extras.reduce((a,x)=>a+x.price*x.n,0)};
  parts.risk=(parts.mat+parts.strom+parts.masch+parts.wear)*R.risk/100;
  const cost=Object.values(parts).reduce((a,b)=>a+b,0);
  const net=cost*(1+R.margin/100);
  const gross=st.klein?net:net*(1+st.vat/100);
  const unit=roundUnit(gross/qty);
  return {parts,cost,net,gross,unit,total:unit*qty,plates,h,grams:(plateMat?p.lines.reduce((a,l)=>a+l.grams,0)+p.purge:0)/ppp*qty};
}

const CATS=[['mat','Material','--c-mat'],['strom','Strom','--c-strom'],['masch','Maschine','--c-masch'],['wear','Verschleiß','--c-wear'],['labor','Arbeitszeit','--c-labor'],['extra','Zubehör','--c-extra'],['risk','Fehldruck-Risiko','--c-risk']];

function stockCheck(qty){
  const p=plate(),ppp=Math.max(1,p.ppp|0),need={};
  p.lines.forEach((l,i)=>{need[l.fil]=(need[l.fil]||0)+l.grams/ppp*qty+(i===0?p.purge/ppp*qty:0)});
  return Object.entries(need).filter(([id,g])=>fil(id).stock<g).map(([id,g])=>({f:fil(id),g}));
}

function renderResult(){
  const q=Math.max(1,S.job.qty|0),r=calc(q),R=prof(),st=S.settings;
  const total=r.cost||1;
  const short=stockCheck(q);
  const tiers=[1,5,10,25,50].map(n=>({n,u:calc(n).unit}));
  const base=tiers[0].u;
  $('#result').innerHTML=`
    <div class="lbl">${t('Stückpreis · {p}',{p:esc(t(R.name))})}</div>
    <div class="price">
      <div class="big num">${fmt(r.unit)}<small>${sym()}</small></div>
      <div class="side">${t('Gesamt {q} Stk',{q})}<strong>${eur(r.total)}</strong></div>
    </div>
    <div class="chips">
      <span class="chip">${st.klein?t('ohne USt (§ 19)'):t('inkl. {v} % MwSt',{v:st.vat})}</span>
      <span class="chip">${t(r.plates===1?'{n} Platte':'{n} Platten',{n:r.plates})} · ${fmt(r.h,1)} h</span>
      <span class="chip">${t('{g} g Filament',{g:fmt(r.grams,0)})}</span>
      ${short.length?short.map(s=>`<span class="chip warn">${t('Bestand knapp: {f} ({g} von {s} g)',{f:esc(s.f.name),g:fmt(s.g,0),s:s.f.stock})}</span>`).join(''):`<span class="chip ok">${t('Bestand reicht')}</span>`}
    </div>
    <div class="lbl">${t('Selbstkosten {c} · Marge {m} %',{c:eur(r.cost),m:R.margin})}</div>
    <div class="bar" role="img" aria-label="${t('Kostenaufteilung')}">${CATS.map(([k,,c])=>`<span style="width:${r.parts[k]/total*100}%;background:var(${c})"></span>`).join('')}</div>
    <table class="legend"><tbody>
      ${CATS.map(([k,n,c])=>`<tr><td><span class="dot" style="background:var(${c})"></span></td><td>${t(n)}</td><td class="n pct">${fmt(r.parts[k]/total*100,0)} %</td><td class="n">${eur(r.parts[k])}</td></tr>`).join('')}
      <tr class="sum"><td></td><td>${t('Selbstkosten')}</td><td></td><td class="n">${eur(r.cost)}</td></tr>
      <tr><td></td><td>${t('+ Marge')}</td><td></td><td class="n">${eur(r.net-r.cost)}</td></tr>
      ${st.klein?'':`<tr><td></td><td>${t('+ MwSt')}</td><td></td><td class="n">${eur(r.gross-r.net)}</td></tr>`}
      <tr><td></td><td>${t('Rundung')}</td><td></td><td class="n">${eur(r.total-r.gross)}</td></tr>
    </tbody></table>
    <div class="lbl" style="margin-top:18px">${t('Mengenstaffel')}</div>
    <table class="tiers"><thead><tr><th>${t('Menge')}</th><th class="n">${t('Stückpreis')}</th><th class="n">${t('Gesamt')}</th><th class="n"></th></tr></thead><tbody>
      ${tiers.map(x=>`<tr class="${x.n===q?'cur':''}"><td>${t('{n} Stk',{n:x.n})}</td><td class="n">${eur(x.u)}</td><td class="n">${eur(x.u*x.n)}</td><td class="n save">${x.u<base?'−'+fmt((1-x.u/base)*100,0)+' %':''}</td></tr>`).join('')}
    </tbody></table>`;
  renderQuote(r,q);
}

function renderPlate(){
  const j=S.job,p=plate();
  $('#plates').innerHTML=j.plates.map((x,i)=>`<button data-plate="${i}" aria-pressed="${i===j.plate}">${pn(x)} · ${fmt(x.hours,2)} h</button>`).join('');
  $('#j-h').value=p.hours; $('#j-ppp').value=p.ppp; $('#j-purge').value=p.purge;
  const opts=sel=>S.filaments.map(f=>`<option value="${f.id}" ${f.id===sel?'selected':''}>${esc(f.name)} · ${esc(f.brand)}</option>`).join('');
  $('#plate-src').textContent=t(j.manual?'manuelle Eingabe':'aus slice_info.config');
  $('#lines').innerHTML=p.lines.map((l,i)=>{const F=fil(l.fil),col=l.manual?F.color:l.color,typ=l.manual?F.type:l.type;return `<tr>
    <td><span class="sw" style="background:${esc(col)}"></span><span class="slot">${esc(l.slot)}</span> <span class="note">${esc(typ)}</span></td>
    <td><select data-line="${i}" aria-label="${t('Filament für {s}',{s:esc(l.slot)})}">${opts(l.fil)}</select></td>
    <td class="n"><div class="unit" style="display:inline-block"><input type="number" data-grams="${i}" value="${l.grams}" min="0" step="0.1" aria-label="${t('Gramm')}"><em>g</em></div></td>
    <td class="n mono" data-lcost="${i}"></td>
    <td class="n"><button class="btn ghost" data-ldel="${i}" aria-label="${t('Filament entfernen')}">✕</button></td></tr>`}).join('')||`<tr><td colspan="5" class="note">${t('Kein Filament auf dieser Platte. Über „+ Filament" hinzufügen.')}</td></tr>`;
  $('#delp').hidden=j.plates.length<2;
  $('#delp').textContent=t('{p} entfernen',{p:pn(p)});
  updLineCosts();
}
function updLineCosts(){plate().lines.forEach((l,i)=>{const c=document.querySelector(`[data-lcost="${i}"]`);if(c)c.textContent=eur(l.grams*perKg(fil(l.fil))/1000)})}

function renderExtras(){
  $('#extras').innerHTML=S.job.extras.map((x,i)=>`<tr>
    <td><input type="text" data-xn="${i}" value="${esc(x.name)}" aria-label="${t('Bezeichnung')}"></td>
    <td class="n"><div class="unit"><input type="number" data-xp="${i}" value="${x.price}" step="0.01" min="0" aria-label="${t('Stückpreis')}"><em>${sym()}</em></div></td>
    <td class="n"><input type="number" data-xc="${i}" value="${x.n}" step="1" min="0" aria-label="${t('Anzahl je Teil')}"></td>
    <td class="n"><button class="btn ghost" data-xdel="${i}" aria-label="${t('Entfernen')}">✕</button></td></tr>`).join('');
}

function renderSelects(){
  $('#j-printer').innerHTML=S.printers.map(p=>`<option value="${p.id}" ${p.id===S.job.printer?'selected':''}>${esc(p.name)}</option>`).join('');
  $('#j-prof').innerHTML=S.profiles.map(p=>`<option value="${p.id}" ${p.id===S.job.profile?'selected':''}>${esc(t(p.name))}</option>`).join('');
  $('#j-qty').value=S.job.qty;$('#j-prep').value=S.job.prep;$('#j-post').value=S.job.post;
}

function renderMaster(){
  $('#ptab').innerHTML=S.printers.map((p,i)=>`<tr><td>${esc(p.name)}</td>
    ${['price','life','watt','wear'].map(k=>`<td class="n"><input type="number" data-p="${i}" data-k="${k}" value="${p[k]}" step="${k==='wear'?0.01:1}" min="0" style="max-width:110px"></td>`).join('')}
    <td class="n mono" data-ph="${i}">${eur(p.price/p.life+p.wear)}</td>
    <td class="n"><button class="btn ghost" data-pdel="${i}" aria-label="${t('{n} löschen',{n:esc(p.name)})}">✕</button></td></tr>`).join('');
  $('#ftab').innerHTML=S.filaments.map((f,i)=>`<tr><td><span class="sw" style="background:${f.color}"></span>${esc(f.name)} <span class="note">${esc(f.brand)}</span></td><td>${esc(f.type)}</td>
    <td class="n"><input type="number" data-f="${i}" data-k="price" value="${f.price}" step="0.01" min="0" style="max-width:100px"></td>
    <td class="n"><input type="number" data-f="${i}" data-k="kg" value="${f.kg}" step="0.25" min="0.1" style="max-width:80px"></td>
    <td class="n mono" data-fk="${i}">${eur(perKg(f))}</td>
    <td class="n"><input type="number" data-f="${i}" data-k="stock" value="${f.stock}" step="1" min="0" style="max-width:90px"></td>
    <td class="n"><button class="btn ghost" data-fdel="${i}" aria-label="${t('{n} löschen',{n:esc(f.name)})}">✕</button></td></tr>`).join('');
  $('#sender').innerHTML=SENDER.map(([k,n])=>`<div><label class="lbl" for="sd-${k}">${t(n)}</label><input type="text" id="sd-${k}" data-sd="${k}" value="${esc(S.sender[k]||'')}"></div>`).join('');
  $('#s-valid').value=S.settings.valid;
  renderLogo();
  $('#prtab').innerHTML=S.profiles.map((p,i)=>`<tr><td>${esc(t(p.name))}</td>
    ${['margin','rate','risk'].map(k=>`<td class="n"><input type="number" data-pr="${i}" data-k="${k}" value="${p[k]}" step="1" min="0" style="max-width:100px"></td>`).join('')}</tr>`).join('');
  $('#s-kwh').value=S.settings.kwh;$('#s-vat').value=S.settings.vat;$('#s-klein').checked=S.settings.klein;
}

let quoteText='',quoteModel=null;
const v=id=>($(id)?$(id).value.trim():'');
const DEF_LOGO=`<div class="brand"><svg width="40" height="40" viewBox="0 0 64 64" aria-hidden="true"><use href="#logo"/></svg>
  <div><h2 style="font-size:17px">POWERSCRIPTING</h2><div class="tagline note">Elevate. Automate. Innovate.</div></div></div>`;
function renderLogo(){
  $('#logoprev').innerHTML=S.logo?`<img src="${S.logo}" alt="${t('Eigenes Logo')}">`:'<svg width="48" height="48" viewBox="0 0 64 64" aria-hidden="true"><use href="#logo"/></svg>';
  $('#logometa').textContent=t(S.logo?'Eigenes Logo aktiv':'Standard: #Powerscripting-Logo');
  $('#logodel').hidden=!S.logo;
}
/* Ein Modell für Vorschau, Text und PDF */
function buildQuote(r,q){
  const sd=S.sender,st=S.settings,p=plate();
  const ttl=v('#q-title')||t('3D-Druck'),no=v('#q-no')||'ANG-0001';
  const cust=[v('#q-cust'),v('#q-contact')?t('z. Hd. {c}',{c:v('#q-contact')}):'',v('#q-street'),[v('#q-zip'),v('#q-city')].filter(Boolean).join(' ')].filter(Boolean);
  const mats=[...new Set(p.lines.map(l=>fil(l.fil).name))].join(', ');
  const date=new Date().toLocaleDateString(LOC());
  const valid=new Date(Date.now()+(st.valid||14)*864e5).toLocaleDateString(LOC());
  const sendLine=[sd.company||sd.name,sd.street,[sd.zip,sd.city].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
  const cols=[
    [sd.name,sd.company!==sd.name?sd.company:'',sd.street,[sd.zip,sd.city].filter(Boolean).join(' ')].filter(Boolean),
    [sd.mail,sd.phone?t('Tel. {p}',{p:sd.phone}):'',sd.web].filter(Boolean),
    [sd.bank,sd.iban?'IBAN '+sd.iban:'',sd.taxid?t('St.-Nr. {t}',{t:sd.taxid}):''].filter(Boolean)].filter(c=>c.length);
  return {lang:L,no,date,valid,title:ttl,cust,mail:v('#q-mail'),sendLine,cols,logo:S.logo,
    sub:[mats,t('gefertigt auf {p}',{p:pr().name})].filter(Boolean).join(' · '),
    desc:t(S.job.extras.length?'3D-Druck inkl. Material, Zubehör und Nachbearbeitung':'3D-Druck inkl. Material und Nachbearbeitung'),
    qty:q,unit:eur(r.unit),total:eur(r.total),
    vatLine:st.klein?null:t('enthaltene MwSt {v} %',{v:st.vat}),vatAmount:st.klein?null:eur(r.total-r.total/(1+st.vat/100)),
    note:st.klein?t('Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.'):null,
    labels:{quote:t('Angebot'),date:t('Datum {d}',{d:date}),valid:t('gültig bis {d}',{d:valid}),pos:t('Pos.'),desc:t('Beschreibung'),qty:t('Menge'),unit:t('Einzelpreis'),total:t('Gesamt'),sum:t('Gesamtbetrag')}};
}
function renderQuote(r,q){
  const m=quoteModel=buildQuote(r,q);
  $('#quote').innerHTML=`
    <div class="qh">
      ${m.logo?`<div class="qlogo"><img src="${m.logo}" alt="Logo"></div>`:DEF_LOGO}
      <div class="qmeta">${m.labels.quote} <b>${esc(m.no)}</b><br>${m.labels.date}<br>${m.labels.valid}</div>
    </div>
    ${m.sendLine?`<div class="sendline">${esc(m.sendLine)}</div>`:'<div style="height:18px"></div>'}
    <div class="addr">${m.cust.map((x,i)=>i===0?`<strong>${esc(x)}</strong>`:esc(x)).join('<br>')}</div>
    ${m.mail?`<div class="note">${esc(m.mail)}</div>`:''}
    <h3>${esc(m.title)}</h3>
    <p class="note" style="margin:0 0 14px">${esc(m.sub)}</p>
    <div class="tblwrap"><table><thead><tr><th>${m.labels.pos}</th><th>${m.labels.desc}</th><th class="n">${m.labels.qty}</th><th class="n">${m.labels.unit}</th><th class="n">${m.labels.total}</th></tr></thead><tbody>
      <tr><td>1</td><td>${esc(m.title)}<br><span class="note">${m.desc}</span></td><td class="n">${m.qty}</td><td class="n mono">${m.unit}</td><td class="n mono">${m.total}</td></tr>
      ${m.vatLine?`<tr><td></td><td class="note">${m.vatLine}</td><td></td><td></td><td class="n mono">${m.vatAmount}</td></tr>`:''}
      <tr class="tot"><td></td><td>${m.labels.sum}</td><td></td><td></td><td class="n mono">${m.total}</td></tr>
    </tbody></table></div>
    ${m.note?`<p class="note" style="margin-top:14px">${m.note}</p>`:''}
    <footer>${m.cols.map(c=>`<div class="col">${c.map(esc).join('<br>')}</div>`).join('')||`<div class="col">${t('Eigene Daten unter Profile & Einstellungen eintragen')}</div>`}</footer>`;
  quoteText=`${t('Angebot {no} vom {d}',{no:m.no,d:m.date})}\n\n${m.cust.join('\n')}\n\n${m.title} – ${m.sub}\n${t('Menge: {q} Stk',{q})}\n${t('Einzelpreis: {u}',{u:m.unit})}\n${t('Gesamt: {t}',{t:m.total})}\n${m.note||t('inkl. {v} % MwSt',{v:S.settings.vat})}\n${t('Gültig bis {d}',{d:m.valid})}\n\n${m.cols.slice(0,2).flat().join('\n')}`;
}

function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.h);toast.h=setTimeout(()=>t.classList.remove('show'),2200)}
function renderHead(){const j=S.job;$('#fname').textContent=j.manual?t('Eigenes Projekt'):j.file;
  $('#fmeta').textContent=j.kind==='import'?t(j.nPlates===1?'{n} Druckplatte · Filament automatisch zugeordnet, bitte prüfen':'{n} Druckplatten · Filament automatisch zugeordnet, bitte prüfen',{n:j.nPlates}):t(j.meta)}
function renderAll(){renderCurrency();renderHead();renderSelects();renderPlate();renderExtras();renderMaster();renderResult()}

/* Events */
document.addEventListener('input',e=>{
  const el=e.target,v=parseFloat(el.value),n=isFinite(v)?v:0,p=plate(),j=S.job;
  if(el.id==='j-h')p.hours=n; else if(el.id==='j-ppp')p.ppp=Math.max(1,Math.round(n)); else if(el.id==='j-purge')p.purge=n;
  else if(el.id==='j-qty')j.qty=Math.max(1,Math.round(n)); else if(el.id==='j-prep')j.prep=n; else if(el.id==='j-post')j.post=n;
  else if(el.dataset.grams!==undefined){p.lines[+el.dataset.grams].grams=n;updLineCosts()}
  else if(el.dataset.xn!==undefined)j.extras[+el.dataset.xn].name=el.value;
  else if(el.dataset.xp!==undefined)j.extras[+el.dataset.xp].price=n;
  else if(el.dataset.xc!==undefined)j.extras[+el.dataset.xc].n=n;
  else if(el.dataset.p!==undefined){const P=S.printers[+el.dataset.p];P[el.dataset.k]=n;persist();document.querySelector(`[data-ph="${el.dataset.p}"]`).textContent=eur(P.price/Math.max(1,P.life)+P.wear)}
  else if(el.dataset.f!==undefined){const F=S.filaments[+el.dataset.f];F[el.dataset.k]=n;document.querySelector(`[data-fk="${el.dataset.f}"]`).textContent=eur(perKg(F));updLineCosts();persist()}
  else if(el.dataset.pr!==undefined){S.profiles[+el.dataset.pr][el.dataset.k]=n;persist()}
  else if(el.id==='s-kwh'){S.settings.kwh=n;persist()} else if(el.id==='s-vat'){S.settings.vat=n;persist()}
  else if(el.id&&el.id.startsWith('q-')){}
  else if(el.dataset.sd!==undefined){S.sender[el.dataset.sd]=el.value;persist()}
  else if(el.id==='s-valid'){S.settings.valid=Math.max(1,Math.round(n));persist()}
  else if(el.id==='n-color'){$('#n-hex').value=el.value;return}
  else if(el.id==='n-hex'){if(/^#[0-9a-f]{6}$/i.test(el.value))$('#n-color').value=el.value;return}
  else return;
  if(el.id==='j-h')$('#plates').querySelectorAll('button')[j.plate].textContent=`${pn(p)} · ${fmt(p.hours,2)} h`;
  renderResult();
});
document.addEventListener('change',e=>{
  const el=e.target;
  if(el.id==='j-printer')S.job.printer=el.value;
  else if(el.id==='j-prof')S.job.profile=el.value;
  else if(el.dataset.line!==undefined){plate().lines[+el.dataset.line].fil=el.value;renderPlate()}
  else if(el.id==='s-logo'&&el.files[0]){loadLogo(el.files[0]);el.value='';return}
  else if(el.id==='s-round'){S.settings.round=el.value;persist()}
  else if(el.id==='s-cur'){S.settings.cur=el.value;persist();renderAll();return}
  else if(el.id==='s-klein'){S.settings.klein=el.checked;persist()}
  else if(el.id==='f3mf'&&el.files[0]){import3mf(el.files[0]);el.value='';return}
  else return;
  renderResult();
});
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.plate!==undefined){S.job.plate=+b.dataset.plate;renderPlate();renderResult()}
  else if(b.dataset.xdel!==undefined){S.job.extras.splice(+b.dataset.xdel,1);renderExtras();renderResult()}
  else if(b.id==='addx'){S.job.extras.push({name:'Neues Zubehör',price:0.10,n:1});renderExtras();renderResult()}
  else if(b.dataset.ldel!==undefined){plate().lines.splice(+b.dataset.ldel,1);renderPlate();renderResult()}
  else if(b.id==='addl'){const p=plate();p.lines.push({slot:'#'+(p.lines.length+1),grams:20,fil:S.filaments[0].id,manual:true});renderPlate();renderResult()}
  else if(b.id==='delp'){const j=S.job;if(j.plates.length<2)return;const [x]=j.plates.splice(j.plate,1);j.plate=Math.min(j.plate,j.plates.length-1);renderPlate();renderResult();toast(t('{p} entfernt',{p:pn(x)}))}
  else if(b.id==='addp'){const n=S.job.plates.length+1;S.job.plates.push({name:n,hours:1,ppp:1,purge:0,lines:[{slot:'#1',grams:20,fil:S.filaments[0].id,manual:true}]});S.job.plate=n-1;renderPlate();renderResult()}
  else if(b.id==='newp'){S.job=NEWPROJ();renderAll();$('#j-h').focus();toast(t('Neues Projekt – Werte eintragen'))}
  else if(b.dataset.pdel!==undefined){if(S.printers.length<2){toast(t('Mindestens ein Drucker wird benötigt'));return}
    const [x]=S.printers.splice(+b.dataset.pdel,1);if(S.job.printer===x.id)S.job.printer=S.printers[0].id;persist();renderSelects();renderMaster();renderResult();toast(t('{n} gelöscht',{n:x.name}))}
  else if(b.dataset.fdel!==undefined){if(S.filaments.length<2){toast(t('Mindestens ein Filament wird benötigt'));return}
    const [f]=S.filaments.splice(+b.dataset.fdel,1);persist();renderMaster();renderPlate();renderResult();toast(t('{n} gelöscht',{n:f.name}))}
  else if(b.id==='logodel'){S.logo=null;persist();renderLogo();renderResult();toast(t('Standardlogo aktiv'))}
  else if(b.id==='demo'){S.job=DEMO();renderAll();toast(t('Beispiel geladen'))}
  else if(b.dataset.tab){document.querySelectorAll('nav.tabs button').forEach(x=>x.setAttribute('aria-selected',x===b));
    ['calc','quote','printers','fil','prof'].forEach(k=>$('#p-'+k).hidden=k!==b.dataset.tab);
    try{sessionStorage.setItem('ppc-tab',b.dataset.tab)}catch(err){}}
  else if(b.id==='q-pdf'){b.disabled=true;import('./pdf.js').then(m=>m.exportQuotePdf(quoteModel,$('#logo'))).then(ok=>{if(ok)toast(t('PDF gespeichert'))}).catch(err=>{console.error(err);toast(t('PDF konnte nicht erstellt werden: {e}',{e:err.message||err}))}).finally(()=>b.disabled=false)}
  else if(b.id==='q-copy'){const done=()=>toast(t('Angebotstext kopiert'));
    try{navigator.clipboard.writeText(quoteText).then(done,()=>toast(t('Kopieren nicht möglich – Text bitte markieren')))}catch(err){toast(t('Kopieren nicht möglich'))}}
  else if(b.id==='l-de'||b.id==='l-en'){L=b.id==='l-en'?'en':'de';persist();applyStatic();renderAll()}
});

/* Filament hinzufügen */
$('#fadd').addEventListener('submit',e=>{e.preventDefault();
  const name=v('#n-name'),type=v('#n-type').toUpperCase();if(!name||!type)return;
  const f={id:'f'+Date.now().toString(36),name,brand:v('#n-brand')||t('Sonstige'),type,color:$('#n-color').value,
    price:+$('#n-price').value||0,kg:+$('#n-kg').value||1,stock:+$('#n-stock').value||0};
  S.filaments.push(f);persist();renderMaster();renderPlate();$('#n-name').value='';toast(t('{n} hinzugefügt',{n:name}))});

/* Drucker hinzufügen */
$('#padd').addEventListener('submit',e=>{e.preventDefault();
  const name=v('#np-name');if(!name)return;
  const P={id:'p'+Date.now().toString(36),name,price:+$('#np-price').value||0,life:Math.max(1,+$('#np-life').value||1),watt:+$('#np-watt').value||0,wear:+$('#np-wear').value||0};
  S.printers.push(P);persist();renderSelects();renderMaster();renderResult();$('#np-name').value='';toast(t('{n} hinzugefügt',{n:name}))});

/* Logo */
function loadLogo(file){
  if(file.size>500*1024){toast(t('Logo ist größer als 500 KB – bitte verkleinern'));return}
  const rd=new FileReader();
  rd.onload=()=>{S.logo=rd.result;persist();renderLogo();renderResult();toast(t('Logo übernommen'))};
  rd.readAsDataURL(file);
}

/* 3MF Import */
const drop=$('#drop');
['dragover','dragenter'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('over')}));
['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,()=>drop.classList.remove('over')));
drop.addEventListener('drop',e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)import3mf(f)});

function matchFil(type,color){
  const t=(type||'').toUpperCase();
  const same=S.filaments.filter(f=>f.type.toUpperCase()===t);
  if(!same.length)return S.filaments[0].id;
  const hex=h=>{h=(h||'').replace('#','').slice(0,6);return [0,2,4].map(i=>parseInt(h.substr(i,2),16)||0)};
  const c=hex(color);
  return same.sort((a,b)=>{const d=x=>hex(x.color).reduce((s,v,i)=>s+(v-c[i])**2,0);return d(a)-d(b)})[0].id;
}
async function import3mf(file){
  if(typeof JSZip==='undefined'){toast(t('ZIP-Bibliothek nicht geladen'));return}
  try{
    const zip=await JSZip.loadAsync(file);
    const f=zip.file('Metadata/slice_info.config');
    if(!f){toast(t('Keine Slice-Daten gefunden. Datei vorher in Bambu Studio oder OrcaSlicer slicen.'));return}
    const xml=new DOMParser().parseFromString(await f.async('string'),'application/xml');
    const plates=[...xml.querySelectorAll('plate')].map((pl,i)=>{
      const meta={};pl.querySelectorAll(':scope > metadata').forEach(m=>meta[m.getAttribute('key')]=m.getAttribute('value'));
      const lines=[...pl.querySelectorAll('filament')].map(fl=>{const type=fl.getAttribute('type'),color=fl.getAttribute('color');
        return {slot:'#'+fl.getAttribute('id'),type,color:color||'#888888',grams:+(+fl.getAttribute('used_g')||0).toFixed(2),fil:matchFil(type,color)}});
      const objs=pl.querySelectorAll('object').length;
      return {name:+(meta.index||i+1),hours:+((+meta.prediction||0)/3600).toFixed(2),ppp:Math.max(1,objs||1),purge:0,lines};
    }).filter(p=>p.lines.length);
    if(!plates.length){toast(t('Datei enthält keine geslicten Platten'));return}
    Object.assign(S.job,{file:file.name,plates,plate:0,manual:false,kind:'import',nPlates:plates.length});
    renderHead();renderPlate();renderResult();toast(t('3MF importiert'));
  }catch(err){toast(t('Datei konnte nicht gelesen werden: {e}',{e:err.message}))}
}

async function start(){
  captureStatic();
  try{store=await openStore();applyData(await store.load())}catch(err){console.error(err);toast(t('Daten konnten nicht geladen werden: {e}',{e:err.message||err}))}
  applyStatic();renderAll();setSaveState('saved');
  $('#savestate').title=store?t(store.kind==='server'?'Gespeichert auf dem Server':store.kind==='file'?'Gespeichert in der lokalen Datei':'Gespeichert im Browser'):'';
  try{const tab=sessionStorage.getItem('ppc-tab');if(tab&&tab!=='calc')document.querySelector(`[data-tab="${tab}"]`)?.click()}catch(e){}
  if(isTauri())document.documentElement.classList.add('desktop');
}
start();
