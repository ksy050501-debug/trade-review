/* =========================================================
 * 무역 탐정단 — 화면(UI) 모듈
 * 시연 모드, 교사 화면, 학생 화면이 함께 사용합니다.
 * 데이터 저장(이 기기 / Firebase)은 backend 객체가 맡습니다.
 *   TradeUI.mount({ backend, mode, tabs, fixedView, roomKey, headerExtra, teacherExtra, joinInfo, onAction })
 *   TradeUI.update(S, cfg, extra)
 * ========================================================= */
(function (root) {
'use strict';
const L = root.TradeLogic, M = root.WorldMap;
const esc=(s)=>String(s==null?'':s).replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};

let S=null, cfg=null, extra={}, opts={}, view='teacher';
const ui={modal:null,busy:{},drafts:{},active:{},pop:null};

/* ---------- 그림 ---------- */
const ICON={
 banana:`<path d="M10 30c8 8 22 9 30-2 2-3 3-7 2-10-2 7-9 12-17 12-6 0-11-2-15-6z" fill="#f2c94c"/><path d="M10 30c8 8 22 9 30-2" stroke="#c9a227" stroke-width="2" fill="none"/><path d="M40 16l3-4 2 1-2 5z" fill="#6b4a2b"/>`,
 car:`<path d="M5 31v-5c0-2 1-3 3-3.5l5-1.5 5-6c1-1 2-1.5 4-1.5h9c2 0 3 .5 4 2l4 5.5 3 .8c2 .5 2 1.5 2 3.2v6c0 1-1 2-2 2H7c-1 0-2-1-2-2z" fill="#c2402f"/><path d="M15 21l4-5h6v5zM28 16h4l3.5 5H28z" fill="#fff" opacity=".85"/><circle cx="14" cy="34" r="5" fill="#14202c"/><circle cx="35" cy="34" r="5" fill="#14202c"/><circle cx="14" cy="34" r="2" fill="#fff"/><circle cx="35" cy="34" r="2" fill="#fff"/>`,
 salmon:`<path d="M6 24c6-9 16-12 26-8l10-7v30l-10-7C22 36 12 33 6 24z" fill="#f08a6c"/><path d="M14 19c3 3 3 7 0 10M20 18c3 4 3 8 0 12" stroke="#fff" stroke-width="2" opacity=".6" fill="none"/><circle cx="11" cy="22" r="2.2" fill="#14202c"/>`,
 chip:`<rect x="12" y="12" width="24" height="24" rx="3" fill="#2f4a6b"/><rect x="18" y="18" width="12" height="12" rx="1.5" fill="#7fa8d8"/><path d="M17 8v4M24 8v4M31 8v4M17 36v4M24 36v4M31 36v4M8 17h4M8 24h4M8 31h4M36 17h4M36 24h4M36 31h4" stroke="#8c98a3" stroke-width="2.4" stroke-linecap="round"/>`,
 grape:`<g fill="#7b4fa0"><circle cx="20" cy="18" r="5"/><circle cx="30" cy="18" r="5"/><circle cx="25" cy="26" r="5"/><circle cx="15" cy="26" r="5"/><circle cx="35" cy="26" r="5"/><circle cx="20" cy="34" r="5"/><circle cx="30" cy="34" r="5"/><circle cx="25" cy="41" r="4.5"/></g><path d="M25 13c0-4 2-6 5-7" stroke="#6b4a2b" stroke-width="2.4" fill="none"/><path d="M27 9c4-2 9-1 11 2-4 2-8 1-11-2z" fill="#4f9a45"/>`,
 ramen:`<path d="M6 22h36c0 10-8 18-18 18S6 32 6 22z" fill="#e05a3a"/><path d="M6 22h36" stroke="#14202c" stroke-width="2"/><path d="M12 22c2-6 4-6 6 0s4 6 6 0 4-6 6 0 4 6 6 0" stroke="#f2c94c" stroke-width="2.4" fill="none"/><path d="M30 6l6 16M36 5l3 17" stroke="#9a6a3a" stroke-width="2.2" stroke-linecap="round"/>`,
 oil:`<rect x="12" y="10" width="24" height="32" rx="3" fill="#3d4652"/><rect x="12" y="17" width="24" height="3" fill="#fff" opacity=".35"/><rect x="12" y="32" width="24" height="3" fill="#fff" opacity=".35"/><path d="M24 21c-3 4-4 6-4 7.5a4 4 0 0 0 8 0c0-1.5-1-3.5-4-7.5z" fill="#f2c94c"/>`,
 ship:`<path d="M4 30h40l-6 10H10z" fill="#2f5d8a"/><rect x="12" y="20" width="22" height="10" fill="#e9eef2"/><rect x="16" y="13" width="8" height="7" fill="#c2402f"/><rect x="26" y="16" width="5" height="4" fill="#f2c94c"/><path d="M4 42c4-2 6-2 10 0s6 2 10 0 6-2 10 0 6 2 10 0" stroke="#3a86b8" stroke-width="2" fill="none"/>`,
 ore:`<path d="M8 34l6-12 10-6 12 4 6 12-6 8H14z" fill="#8a5a44"/><path d="M14 22l8 6 14-8M22 28l2 12M36 20l-4 20" stroke="#5e3b2c" stroke-width="1.6" fill="none"/><circle cx="18" cy="31" r="2" fill="#c7a46a"/><circle cx="31" cy="27" r="1.6" fill="#c7a46a"/>`,
 lotion:`<rect x="15" y="16" width="18" height="26" rx="4" fill="#f4a7b9"/><rect x="19" y="8" width="10" height="8" rx="2" fill="#d47a92"/><rect x="18" y="24" width="12" height="9" rx="2" fill="#fff" opacity=".8"/>`
};
const icon=(id,s)=>`<svg width="${s||40}" height="${s||40}" viewBox="0 0 48 48" aria-hidden="true">${ICON[id]||'<rect x="8" y="8" width="32" height="32" rx="8" fill="var(--accent)"/>'}</svg>`;
function flag(c,w){
  w=w||54;const h=Math.round(w*2/3);const col=esc(c.color);let body='';
  if(c.flag==='circle')body=`<rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="5.5" fill="${col}"/>`;
  else if(c.flag==='cross')body=`<rect width="30" height="20" fill="${col}"/><rect x="9" width="4" height="20" fill="#fff"/><rect y="8" width="30" height="4" fill="#fff"/>`;
  else if(c.flag==='diagonal')body=`<rect width="30" height="20" fill="#fff"/><path d="M0 20L30 0V20z" fill="${col}"/><circle cx="8" cy="6" r="2.4" fill="${col}"/>`;
  else body=`<rect width="30" height="20" fill="${col}"/><rect y="6.7" width="30" height="6.6" fill="#fff"/><rect x="2" y="2" width="4" height="3" fill="#fff" opacity=".8"/>`;
  return `<svg class="flag" width="${w}" height="${h}" viewBox="0 0 30 20" role="img" aria-label="${esc(c.name)} 국기">${body}</svg>`;
}

/* ---------- 도우미 ---------- */
const C=(id)=>L.countryById(cfg,id);
const cst=(id)=>(S&&S.countries[id])||L.freshCountry();
const keyOf=(n)=>L.stageInfo(n).key;
function toast(msg,kind){const r=document.getElementById('toast-root');if(!r)return;r.innerHTML=`<div class="toast ${kind||''}">${esc(msg)}</div>`;clearTimeout(toast.t);toast.t=setTimeout(()=>{r.innerHTML=''},2600)}
function netError(e){
  const code=(e&&e.code)||'';
  if(code.includes('permission-denied'))return '권한이 없어요. 선생님께 말씀해 주세요.';
  if(code.includes('unavailable')||code.includes('network')||code.includes('deadline'))return '인터넷 연결을 확인하고 다시 눌러 주세요.';
  if(code.includes('aborted'))return '동시에 여러 요청이 몰렸어요. 다시 눌러 주세요.';
  return '처리하지 못했어요. 다시 눌러 주세요.';
}
async function run(key,fn,okMsg){
  if(ui.busy[key])return null;ui.busy[key]=true;render(true);
  let r;
  try{r=await fn()}catch(e){console.error(e);r={ok:false,error:netError(e)}}
  ui.busy[key]=false;
  if(r&&!r.ok)toast(r.error||'처리하지 못했어요.','warn');else if(okMsg)toast(typeof okMsg==='function'?okMsg(r):okMsg);
  render(true);return r;
}
function ask(title,body,okLabel,onOk,danger){ui.modal={title,body,okLabel,onOk,danger};renderModal()}
function renderModal(){const r=document.getElementById('modal-root');if(!r)return;if(!ui.modal){r.innerHTML='';return}
  const m=ui.modal;r.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-labelledby="mt"><div class="box"><h2 id="mt" style="font-size:22px">${esc(m.title)}</h2><div>${m.body}</div><div class="row" style="justify-content:flex-end"><button class="btn ghost small" data-a="modal-no">취소</button><button class="btn small ${m.danger?'warn':'accent'}" data-a="modal-yes">${esc(m.okLabel)}</button></div></div></div>`;
  r.querySelector('[data-a="modal-yes"]').focus()}

/* ----- 제출 전 답(초안): 새로고침해도 남도록 이 기기에 저장 ----- */
const draftKey=(cid,key)=>`review.draft.${opts.roomKey||'demo'}.${cid}.${key}`;
function draft(cid,key){
  const k=cid+'.'+key;
  if(!ui.drafts[k]){
    let d=null;try{d=JSON.parse(store.get(draftKey(cid,key)))}catch(e){}
    const saved=cst(cid).ans&&cst(cid).ans[key];
    ui.drafts[k]=d||(saved?L.clone(saved):(key==='s5'?L.clone(cst(cid).curious||{}):{}));
  }
  return ui.drafts[k];
}
function saveDraft(cid,key){store.set(draftKey(cid,key),JSON.stringify(ui.drafts[cid+'.'+key]))}

const STAGE_INTRO={
 1:'오늘 우리 모둠은 무역 탐정단이에요. 태블릿은 하나, 머리는 여럿! 함께 의논해서 사건을 풀어요.',
 2:'무역·수출·수입의 뜻을 떠올리며, 문장이 진짜인지 가짜인지 모둠이 함께 판정해 주세요.',
 3:'카드에 적힌 일이 우리나라 입장에서 수출인지 수입인지 골라 주세요.',
 4:'물건마다 어느 나라와 오가는지 지도에서 찾고, 수출인지 수입인지 골라 주세요.',
 5:'이상한 사실 카드를 하나 골라 "왜 그럴까?" 모둠의 추측과 더 알고 싶은 질문을 적어요.',
 6:'오늘의 수사 보고예요. 우리가 남긴 질문의 답은 내일 직접 알아봐요.'
};
const TEACHER_GUIDE={
 1:['입장 3분','입장 코드를 띄우고 모둠 태블릿 하나로 나라를 고르게 합니다. 모둠 이름은 내일 수업의 나라 이름과 같아요.'],
 2:['사건 1 · 7분','문장 8개 진짜/가짜 판정(진짜 4, 가짜 4). 서비스 무역, 돈의 흐름, 상대 나라 입장, 나라 안 거래를 따져야 풀립니다. 처음 제출한 답으로 점수를 매기고, 틀린 것은 고쳐서 다시 내야 해결됩니다.'],
 3:['사건 2 · 9분','상황 카드 10장 분류(수출 5, 수입 5). 카드마다 5점. "우리나라 입장에서" 생각하도록 안내해 주세요.'],
 4:['사건 3 · 10분','물건 7개의 상대 나라와 방향 찾기. 나라 5점 + 방향 5점. 사건 기록(배송 이야기)의 지리 단서로 나라를, 이야기의 흐름으로 방향을 찾습니다.'],
 5:['마지막 사건 · 7분','점수가 없는 생각 시간입니다. 답(이유)은 알려 주지 말고, 모둠의 추측과 질문을 모읍니다.'],
 6:['수사 보고 · 4분','발표 화면에 네 모둠의 질문이 모입니다. "나라들은 왜 무역을 할까? 내일 국왕이 되어 직접 알아봐요"로 마무리합니다.']
};

/* ---------- 상단 ---------- */
function renderTop(){
  const st=L.stageInfo(S.stage);
  const sc=document.getElementById('stagechip');if(sc){sc.hidden=opts.mode==='student';sc.textContent=`${L.stageNo(S.stage)}단계 · ${st.title}`}
  const tabs=opts.tabs||[];
  const name=(id)=>id==='teacher'?'교사 관제':id==='projector'?'발표 화면':(C(id)||{}).name;
  const label=opts.mode==='demo'?'<span class="demo-tag">시연 모드</span>':'';
  const vw=document.getElementById('views');if(vw)vw.innerHTML=tabs.length>1?label+tabs.map(id=>{const c=C(id);return `<button data-a="view" data-v="${id}" aria-pressed="${view===id}">${c?flag(c,20):''}${esc(name(id))}</button>`}).join(''):'';
  const hx=document.getElementById('hdr-extra');if(hx)hx.innerHTML=opts.headerExtra?opts.headerExtra():'';
  const off=document.getElementById('offline');if(off)off.hidden=extra.online!==false;
}

/* ---------- 학생 화면 ---------- */
function nationHead(c){
  const sc=L.score(S,c.id);const rk=L.ranking(S,cfg).find(r=>r.id===c.id);
  const showScore=S.stage>=2&&S.stage!==5;
  return `<section class="panel case-head" style="--nc:${esc(c.color)}"><div class="nation">${flag(c,64)}<div style="min-width:0;flex:1">${opts.mode!=='student'?'<div class="label">교사가 이 모둠 화면을 보고 있어요</div>':''}<div class="label">${esc(c.name)} 탐정단 · ${L.stageNo(S.stage)}단계</div><h2>${esc(L.stageInfo(S.stage).title)}</h2><p class="guide" style="margin:0">${esc(STAGE_INTRO[S.stage]||'')}</p></div>
   ${showScore?`<div class="scorechip"><span class="label">우리 점수</span><b class="num">${sc.total}</b><span class="muted num">${rk.rank}위</span></div>`:''}</div></section>`;
}
function submitBar(cid,key,ready,firstTime,msg){
  const busy=!!ui.busy['sub-'+cid];
  return `<div class="submitbar">${msg?`<span class="muted">${msg}</span>`:'<span></span>'}<button class="btn accent" data-a="submit" data-c="${cid}" data-k="${key}" ${!ready||busy?'disabled':''}>${busy?'제출하는 중…':firstTime?'모둠 답 제출하기':'고친 답 다시 제출하기'}</button></div>`;
}
function resultBanner(cid,key){
  const c=cst(cid);if(!c.first||!c.first[key])return '';
  const pts=L.stagePoints(key,c.first[key]),max=L.stageMax(key),st=L.status(S,cid,key);
  return `<div class="result ${st}"><b>${st==='done'?'사건 해결!':'틀린 곳이 있어요.'}</b> 처음 제출한 답으로 <b class="num">${pts}/${max}점</b>을 받았어요.${st==='done'?'':' 빨간 표시가 있는 곳을 고쳐서 다시 제출하면 사건이 해결돼요. (점수는 그대로예요)'}</div>`;
}
// 사건 1: 진짜일까, 가짜일까?
function case1(cid){
  const key='s2',d=draft(cid,key),c=cst(cid);const sub=c.first&&c.first[key];const chk=sub?L.check(key,c.ans[key]):null;
  const solved=L.status(S,cid,key)==='done';const n=L.S2.cards.filter(x=>d[x.id]).length;
  return `<section class="panel">${resultBanner(cid,key)}
   <div class="ccards">${L.stmtOrder(cid).map((x,i)=>{const v=d[x.id];const mark=chk&&c.ans[key][x.id]===v?(chk[x.id]?'ok':'no'):'';
     return `<div class="ccard${mark?' '+mark:''}"><div class="ctop"><span class="num cno">${i+1}</span><p class="stmt">${esc(x.text)}</p>${mark==='ok'?'<i class="mk">✓</i>':mark==='no'?'<i class="mk">✗</i>':''}</div>
       <div class="choice"><button class="ch o${v==='o'?' on':''}" data-a="s2" data-c="${cid}" data-i="${x.id}" data-v="o" ${solved?'disabled':''} aria-pressed="${v==='o'}">진짜 (O)</button><button class="ch x${v==='x'?' on':''}" data-a="s2" data-c="${cid}" data-i="${x.id}" data-v="x" ${solved?'disabled':''} aria-pressed="${v==='x'}">가짜 (X)</button></div></div>`}).join('')}</div>
   ${solved?'':submitBar(cid,key,n===L.S2.cards.length,!sub,`<span class="num">${n}/${L.S2.cards.length}</span>개 골랐어요`)}</section>`;
}
// 사건 2: 수출일까, 수입일까?
function case2(cid){
  const key='s3',d=draft(cid,key),c=cst(cid);const sub=c.first&&c.first[key];const chk=sub?L.check(key,c.ans[key]):null;
  const solved=L.status(S,cid,key)==='done';const n=L.S3.cards.filter(x=>d[x.id]).length;
  return `<section class="panel">${resultBanner(cid,key)}
   <div class="ccards">${L.cardOrder(cid).map((x,i)=>{const v=d[x.id];const mark=chk&&c.ans[key][x.id]===v?(chk[x.id]?'ok':'no'):'';
     return `<div class="ccard${mark?' '+mark:''}"><div class="ctop"><span class="num cno">${i+1}</span>${icon(x.icon,44)}<p>${esc(x.text)}</p>${mark==='ok'?'<i class="mk">✓</i>':mark==='no'?'<i class="mk">✗</i>':''}</div>
       <div class="choice"><button class="ch ex${v==='ex'?' on':''}" data-a="s3" data-c="${cid}" data-i="${x.id}" data-v="ex" ${solved?'disabled':''} aria-pressed="${v==='ex'}">수출</button><button class="ch im${v==='im'?' on':''}" data-a="s3" data-c="${cid}" data-i="${x.id}" data-v="im" ${solved?'disabled':''} aria-pressed="${v==='im'}">수입</button></div></div>`}).join('')}</div>
   ${solved?'':submitBar(cid,key,n===L.S3.cards.length,!sub,`<span class="num">${n}/${L.S3.cards.length}</span>장 골랐어요`)}</section>`;
}
// 사건 3: 물건의 여행 지도
function mapSVG(cid,d,act,chk,interactive){
  const kr=L.PLACES.find(p=>p.home);
  const arrows=L.S4.items.filter(it=>d[it.id]&&d[it.id].place).map(it=>{const v=d[it.id],p=L.placeById(v.place);if(!p)return '';
    const from=v.dir==='ex'?kr:p,to=v.dir==='ex'?p:kr;const a=M.arc(from,to,v.dir?0.2:0.2);
    const cls=v.dir==='ex'?'ex':v.dir==='im'?'im':'nd';const on=it.id===act;
    return `<g class="arrow ${cls}${on?' on':''}"><path d="${a.d}" marker-end="url(#ah-${cls})"/></g>`}).join('');
  const pins=L.PLACES.map(p=>{const x=M.px(p.lon),y=M.py(p.lat);const sel=act&&d[act]&&d[act].place===p.id;const lx=p.id==='sa'||p.id==='no'?x+14:x+14;
    return p.home?`<g class="pin home"><circle cx="${x}" cy="${y}" r="11"/><text x="${x+15}" y="${y-8}">대한민국</text></g>`
      :`<g class="pin${sel?' sel':''}"${interactive?` data-a="s4-place" data-c="${cid}" data-v="${p.id}" role="button" tabindex="0" aria-label="${esc(p.name)}"`:''}><circle cx="${x}" cy="${y}" r="22" class="hit"/><circle cx="${x}" cy="${y}" r="10"/><text x="${lx}" y="${y+22}">${esc(p.name)}</text></g>`}).join('');
  return `<svg class="worldmap" viewBox="0 0 ${M.W} ${M.H}" role="img" aria-label="세계 지도"><defs>
     <marker id="ah-ex" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="mk-ex"/></marker>
     <marker id="ah-im" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="mk-im"/></marker>
     <marker id="ah-nd" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="1" markerHeight="1"><path d="M0 0z"/></marker></defs>
    <rect width="${M.W}" height="${M.H}" class="sea"/><path d="${M.LAND_PATH}" class="land"/>${arrows}${pins}</svg>`;
}
function case3(cid){
  const key='s4',d=draft(cid,key),c=cst(cid);const sub=c.first&&c.first[key];const chk=sub?L.check(key,c.ans[key]):null;
  const solved=L.status(S,cid,key)==='done';
  let act=ui.active[cid+'.s4'];if(!act)act=(L.S4.items.find(it=>!(d[it.id]&&d[it.id].place&&d[it.id].dir))||L.S4.items[0]).id;
  const it=L.S4.items.find(x=>x.id===act);const v=d[act]||{};const pl=v.place?L.placeById(v.place):null;
  const done=L.S4.items.filter(x=>d[x.id]&&d[x.id].place&&d[x.id].dir).length;
  const same=(x)=>c.ans&&c.ans[key]&&c.ans[key][x.id]&&d[x.id]&&c.ans[key][x.id].place===d[x.id].place&&c.ans[key][x.id].dir===d[x.id].dir;
  return `<section class="panel">${resultBanner(cid,key)}
   <div class="items4">${L.S4.items.map(x=>{const vv=d[x.id]||{};const r=chk&&same(x)?chk[x.id]:null;const bad=r&&!(r.place&&r.dir);
     return `<button class="it4${x.id===act?' on':''}${r?(bad?' no':' ok'):''}" data-a="s4-item" data-c="${cid}" data-v="${x.id}">${icon(x.icon,34)}<span><b>${esc(x.name)}</b><small>${vv.place?esc(L.placeById(vv.place).name):'나라?'} · ${vv.dir==='ex'?'수출':vv.dir==='im'?'수입':'방향?'}</small></span>${r?(bad?'<i class="mk">✗</i>':'<i class="mk">✓</i>'):''}</button>`}).join('')}</div>
   <div class="mapwrap">${mapSVG(cid,d,act,chk,!solved)}</div>
   <div class="focus4">${icon(it.icon,52)}<div style="flex:1;min-width:0"><div class="label">지금 고르는 물건</div><h3 style="margin:0">${esc(it.name)}</h3><p class="hint"><b>사건 기록</b> ${esc(it.hint)}</p>
     ${(()=>{const r=chk&&same(it)?chk[it.id]:null;return r&&!(r.place&&r.dir)?`<p class="warnline">${!r.place?'나라를 다시 생각해 보세요. ':''}${!r.dir?'방향(수출·수입)을 다시 생각해 보세요.':''}</p>`:''})()}
     <div class="row" style="gap:8px;margin-top:6px"><span class="pickedp">${pl?`<b>${esc(pl.name)}</b>`:'지도에서 나라를 눌러 주세요'}</span>
       <div class="choice small"><button class="ch im${v.dir==='im'?' on':''}" data-a="s4-dir" data-c="${cid}" data-v="im" ${solved?'disabled':''}>수입 (그 나라 → 우리나라)</button><button class="ch ex${v.dir==='ex'?' on':''}" data-a="s4-dir" data-c="${cid}" data-v="ex" ${solved?'disabled':''}>수출 (우리나라 → 그 나라)</button></div></div></div></div>
   ${solved?'':submitBar(cid,key,done===L.S4.items.length,!sub,`<span class="num">${done}/${L.S4.items.length}</span>개 완성`)}</section>`;
}
// 마지막 사건: 이상한 사실
function case4(cid){
  const key='s5',d=draft(cid,key),c=cst(cid);const sent=c.curious&&c.curious.card;
  const busy=!!ui.busy['sub-'+cid];
  return `<section class="panel">
   ${sent?`<div class="result done"><b>모둠의 생각을 보냈어요.</b> 발표 화면에 모여요. 고치고 싶으면 다시 보내도 돼요.</div>`:''}
   <div class="label" style="margin-bottom:8px">① 가장 궁금한 카드를 하나 고르세요</div>
   <div class="facts">${L.S5.cards.map(f=>`<button class="fact${d.card===f.id?' on':''}" data-a="s5-card" data-c="${cid}" data-v="${f.id}" aria-pressed="${d.card===f.id}">${icon(f.icon,44)}<b>${esc(f.title)}</b><span>${esc(f.text)}</span></button>`).join('')}</div>
   <div class="qform"><label for="guess-${cid}">② 왜 그럴까요? 우리 모둠의 추측</label><textarea id="guess-${cid}" data-a="s5-text" data-c="${cid}" data-f="guess" maxlength="${L.S5.maxLen}" placeholder="예: ~해서 그런 것 같아요.">${esc(d.guess||'')}</textarea>
     <label for="question-${cid}">③ 더 알고 싶은 질문 (선택)</label><textarea id="question-${cid}" data-a="s5-text" data-c="${cid}" data-f="question" maxlength="${L.S5.maxLen}" placeholder="예: 왜 ~할까요?">${esc(d.question||'')}</textarea></div>
   <div class="submitbar"><span class="muted">정답은 없어요. 모둠이 함께 이야기한 생각을 적어요.</span><button class="btn accent" data-a="s5-send" data-c="${cid}" ${!d.card||!(d.guess||'').trim()||busy?'disabled':''}>${busy?'보내는 중…':sent?'다시 보내기':'모둠 생각 보내기'}</button></div></section>`;
}
function closing(cid){
  const c=cst(cid);const sc=L.score(S,cid);const rk=L.ranking(S,cfg);const me=rk.find(r=>r.id===cid);
  const f=c.curious&&c.curious.card?L.S5.cards.find(x=>x.id===c.curious.card):null;
  return `<section class="panel hook"><p class="label">오늘의 마지막 질문</p><h2>나라들은 왜 서로 무역을 할까요?</h2><p>내일, 우리 모둠은 <b>${esc(C(cid).name)}</b>의 국왕이 되어 직접 알아봐요.</p></section>
   <section class="grid2"><div class="panel"><h2>우리 모둠 수사 기록</h2><div class="final-score"><b class="num">${sc.total}</b><span class="muted">/ ${L.MAX_SCORE}점 · ${me.rank}위</span></div>
     <div class="perstage">${['s2','s3','s4'].map((k,i)=>`<div><span class="label">사건 ${i+1}</span><b class="num">${sc.per[k]==null?'-':sc.per[k]}</b><span class="muted num">/${L.stageMax(k)}</span></div>`).join('')}</div></div>
    <div class="panel"><h2>우리가 남긴 질문</h2>${f?`<div class="qnote">${icon(f.icon,36)}<div><b>${esc(f.title)}</b><p>추측: ${esc(c.curious.guess)}</p>${c.curious.question?`<p>질문: ${esc(c.curious.question)}</p>`:''}</div></div>`:'<p class="muted" style="margin:0">아직 보낸 생각이 없어요.</p>'}</div></section>`;
}
function welcome(){
  return `<section class="panel"><h2>탐정단 약속</h2><ul class="rules"><li>태블릿은 모둠에 <b>한 대</b>예요. 누르기 전에 <b>모둠이 함께 의논</b>해요.</li><li>사건마다 <b>누르는 사람을 바꿔요.</b></li><li><b>처음 제출한 답</b>으로 점수를 매겨요. 틀린 것은 고쳐서 다시 내면 사건이 해결돼요.</li><li>막히면 오른쪽 아래 <b>갈매기 선장</b>을 눌러 보세요.</li></ul></section>
   <section class="panel"><h2>오늘의 사건</h2><ol class="caselist">${L.STAGES.filter(s=>s.n>1&&s.n<6).map(s=>`<li><b>${esc(s.title)}</b>${s.n===5?' <span class="muted">(점수 없음)</span>':''}</li>`).join('')}</ol></section>`;
}
function studentView(cid){
  const s=S.stage;let h=nationHead(C(cid));
  if(s===1)h+=welcome();else if(s===2)h+=case1(cid);else if(s===3)h+=case2(cid);else if(s===4)h+=case3(cid);else if(s===5)h+=case4(cid);else h+=closing(cid);
  return h;
}

/* ---------- 교사 화면 ---------- */
const STATUS_LABEL={todo:'<span class="st todo">아직</span>',fix:'<span class="st fix">고치는 중</span>',done:'<span class="st done">해결</span>'};
function scoreTable(){
  const rk=L.ranking(S,cfg);const seats=extra.seats||null;
  return `<div class="tablewrap"><table class="mgrid"><thead><tr><th>순위</th><th>모둠</th>${seats?'<th>기기</th>':''}<th>사건 1<br><small>/${L.stageMax('s2')}</small></th><th>사건 2<br><small>/${L.stageMax('s3')}</small></th><th>사건 3<br><small>/${L.stageMax('s4')}</small></th><th>합계<br><small>/${L.MAX_SCORE}</small></th><th>마지막 사건</th></tr></thead><tbody>
   ${rk.map(r=>{const c=C(r.id),sc=L.score(S,r.id),seat=seats?seats[r.id]:null;
     const cell=(k)=>`<td class="${keyOf(S.stage)===k?'cur':''}"><b class="num">${sc.per[k]==null?'-':sc.per[k]}</b><br>${STATUS_LABEL[L.status(S,r.id,k)]}</td>`;
     return `<tr><td class="num"><b>${r.rank}</b></td><td><span class="itemhead">${flag(c,22)}<b>${esc(c.name)}</b></span></td>${seats?`<td>${seat?`<span class="dot ${seat.online?'':'off'}"></span> ${seat.online?'접속 중':'끊김'}`:'<span class="dot idle"></span> 비어 있음'}</td>`:''}${cell('s2')}${cell('s3')}${cell('s4')}<td class="num"><b style="font-size:18px">${sc.total}</b></td><td class="${S.stage===5?'cur':''}">${STATUS_LABEL[L.status(S,r.id,'s5')]}</td></tr>`}).join('')}
   </tbody></table></div>`;
}
function curiousList(){
  return `<div class="qwall">${cfg.countries.map(c=>{const q=cst(c.id).curious;const f=q&&q.card?L.S5.cards.find(x=>x.id===q.card):null;
    return `<div class="qnote" style="--nc:${esc(c.color)}">${flag(c,30)}<div>${f?`<b>${esc(c.name)} · ${esc(f.title)}</b><p>추측: ${esc(q.guess)}</p>${q.question?`<p>질문: ${esc(q.question)}</p>`:''}`:`<b>${esc(c.name)}</b><p class="muted">아직 보내지 않았어요.</p>`}</div></div>`}).join('')}</div>`;
}
function teacherView(){
  const g=TEACHER_GUIDE[S.stage]||['',''];
  const stages=`<div class="stepper-stages">${L.STAGES.map((s,i)=>`<button data-a="stage" data-n="${s.n}" ${s.n===S.stage?'aria-current="step"':''}><b>${i+1}단계 · ${s.min}분</b>${esc(s.title)}</button>`).join('')}</div>`;
  const demoTail=opts.mode==='demo'?`<section class="panel"><h2>시연 모드</h2><p class="muted" style="margin:0">이 기기 안에서만 저장됩니다. 위쪽 탭으로 모둠을 바꿔 가며 미리 해 볼 수 있어요.</p><div class="row" style="margin-top:12px"><button class="btn warn small" data-a="reset">처음부터 다시</button></div></section>`:'';
  return `${opts.teacherExtra?opts.teacherExtra():''}<section class="panel"><h2>수업 단계</h2>${stages}
    <div class="row" style="margin-top:12px"><button class="btn ghost small" data-a="stage" data-n="${L.nextStage(S.stage,-1)}" ${L.nextStage(S.stage,-1)?'':'disabled'}>◀ 이전 단계</button><button class="btn accent small" data-a="stage" data-n="${L.nextStage(S.stage,1)}" ${L.nextStage(S.stage,1)?'':'disabled'}>다음 단계 ▶</button></div>
    <div class="callout" style="margin-top:12px"><b>${esc(g[0])}</b> · ${esc(g[1])}</div></section>
   <section class="panel"><h2>모둠별 점수와 진행</h2>${scoreTable()}<p class="muted" style="margin:8px 0 0;font-size:13px">점수는 처음 제출한 답으로 매깁니다. '고치는 중'은 제출했지만 아직 틀린 곳이 있는 모둠이에요.</p></section>
   ${S.stage>=5?`<section class="panel"><h2>모둠의 추측과 질문</h2>${curiousList()}</section>`:''}
   <section class="panel"><details><summary><h2 style="font-size:19px;display:inline">정답 보기 (교사용)</h2></summary><div class="grid2" style="margin-top:12px">
     <div><h3>사건 1</h3><ul class="anslist">${L.S2.cards.map(x=>`<li>${esc(x.text)} → <b>${x.answer==='o'?'진짜':'가짜'}</b><br><span class="muted">${esc(x.why)}</span></li>`).join('')}</ul>
       <h3>사건 2</h3><ul class="anslist">${L.S3.cards.map((x,i)=>`<li>${i+1}. ${esc(x.text)} → <b>${x.answer==='ex'?'수출':'수입'}</b></li>`).join('')}</ul></div>
     <div><h3>사건 3</h3><ul class="anslist">${L.S4.items.map(x=>`<li><b>${esc(x.name)}</b>: ${esc(L.placeById(x.place).name)} · ${x.dir==='ex'?'수출':'수입'}</li>`).join('')}</ul></div></div></details></section>
   ${demoTail}`;
}

/* ---------- 발표 화면 ---------- */
function projectorView(){
  const st=L.stageInfo(S.stage);const rk=L.ranking(S,cfg);
  const board=`<section class="panel"><h2>${S.stage===6?'최종 점수':'점수판'}</h2><div class="board">${rk.map(r=>{const c=C(r.id);const key=keyOf(S.stage);const stt=key?L.status(S,r.id,key):null;
    return `<div class="brow" style="--nc:${esc(c.color)}"><span class="brank num">${r.rank}</span>${flag(c,40)}<b class="bname">${esc(c.name)}</b><div class="bbar"><i style="width:${r.total/L.MAX_SCORE*100}%"></i></div><b class="num bpts">${r.total}</b>${stt&&S.stage<5?STATUS_LABEL[stt]:''}</div>`}).join('')}</div></section>`;
  let body='';
  if(S.stage===1)body=(opts.joinInfo?opts.joinInfo():'')+`<section class="panel"><h2>오늘의 사건</h2><ol class="caselist big">${L.STAGES.filter(s=>s.n>1&&s.n<6).map(s=>`<li>${esc(s.title)}</li>`).join('')}</ol></section>`;
  else if(S.stage<5)body=board;
  else if(S.stage===5){const sent=cfg.countries.filter(c=>L.status(S,c.id,'s5')==='done').length;
    body=`<section class="facts big">${L.S5.cards.map(f=>`<div class="fact">${icon(f.icon,56)}<b>${esc(f.title)}</b><span>${esc(f.text)}</span></div>`).join('')}</section><section class="panel"><h2>모둠 생각 모으는 중 <span class="mcount num">${sent}/${cfg.countries.length}</span></h2><p class="muted" style="margin:0">정답은 없어요. 모둠이 함께 이야기한 생각을 적어요.</p></section>`}
  else body=`<section class="panel"><h2>탐정단이 남긴 질문</h2>${curiousList()}</section><section class="panel hook"><h2>나라들은 왜 서로 무역을 할까요?</h2><p>내일, 여러분은 가온국·나래국·다온국·라온국의 국왕이 되어 직접 알아봅니다.</p></section>${board}`;
  return `<div class="proj"><div class="hero"><div class="row" style="justify-content:space-between"><span style="opacity:.7">${L.stageNo(S.stage)}단계 · ${st.min}분</span>${document.fullscreenEnabled?`<button class="btn ghost small" data-a="fullscreen" style="color:var(--bg);box-shadow:inset 0 0 0 1.5px currentColor">전체 화면</button>`:''}</div><h2>${esc(st.title)}</h2><p>${esc(STAGE_INTRO[S.stage]||'')}</p></div>${body}</div>`;
}

/* ---------- 도우미 갈매기 ---------- */
const HELPER_NAME='갈매기 선장';
const HELPER_SVG=`<svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
 <circle cx="32" cy="32" r="32" fill="#bfe3f2"/><path d="M0 44c8-4 14-4 22 0s14 4 22 0 14-4 20 0v20H0z" fill="#3d9bc4"/>
 <ellipse cx="32" cy="46" rx="15" ry="11" fill="#fff"/><path d="M18 44c-5-2-9 0-11 4 5 0 8 1 11 0z" fill="#d7e1e8"/><path d="M46 44c5-2 9 0 11 4-5 0-8 1-11 0z" fill="#d7e1e8"/>
 <circle cx="32" cy="31" r="13" fill="#fff"/><path d="M30 34l14 3-14 3z" fill="#f2a33a"/><path d="M30 37l14 0-14 3z" fill="#d9832a"/>
 <circle cx="27" cy="29" r="2.6" fill="#14202c"/><circle cx="27.8" cy="28.2" r=".9" fill="#fff"/><circle cx="23" cy="34" r="2.2" fill="#f6b4b4" opacity=".7"/>
 <path d="M17 21c2-7 9-10 15-10s13 3 15 10z" fill="#1f3a5f"/><rect x="15" y="20" width="34" height="5" rx="2.5" fill="#fff"/><path d="M15 23h34" stroke="#1f3a5f" stroke-width="1.2"/>
 <path d="M32 13.5l1.4 2.8 3 .4-2.2 2.1.5 3-2.7-1.4-2.7 1.4.5-3-2.2-2.1 3-.4z" fill="#f2c94c"/><path d="M26 54l-2 6M38 54l2 6" stroke="#f2a33a" stroke-width="2.4" stroke-linecap="round"/></svg>`;
function helperHint(){
  if(!S||!cfg||view==='projector')return null;const st=S.stage;
  if(view==='teacher'){const key=keyOf(st);
    if(!key||st===6)return st===1?'네 모둠이 모두 들어오면 [다음 단계 ▶]로 사건 1을 시작하세요.':'발표 화면 탭에서 네 모둠의 질문을 함께 읽고, 내일 수업으로 이어 주세요.';
    const left=cfg.countries.filter(c=>L.status(S,c.id,key)!=='done').map(c=>c.name);
    return left.length?`아직 사건을 푸는 모둠: ${left.join(', ')}.`:'모든 모둠이 해결했어요. [다음 단계 ▶]로 넘어가세요.'}
  const cid=view;if(!C(cid))return null;const key=keyOf(st);const stt=key?L.status(S,cid,key):null;
  if(st===1)return '탐정단 약속을 함께 읽어요. 선생님이 사건 1을 열면 시작해요.';
  if(st===6)return '오늘 남긴 질문을 기억해 두세요. 내일 국왕이 되어 직접 실험해 보면 답을 찾을 수 있어요!';
  if(stt==='done')return st===5?'모둠 생각을 보냈어요. 다른 카드에 대해서도 이야기해 봐요.':'사건 해결! 다음 사건이 열릴 때까지 다른 모둠 차례를 기다려요.';
  if(st===2)return stt==='fix'?'✗ 문장을 다시 천천히 읽어 보세요. 물건만인지, 돈은 어느 쪽으로 가는지, 나라와 나라 사이인지 따져 봐요.':'문장을 한 사람이 소리 내어 읽고, 모둠이 진짜인지 가짜인지 의논한 뒤 눌러요.';
  if(st===3)return stt==='fix'?'✗ 카드를 다시 읽어 보세요. 우리나라에서 나가면 수출, 우리나라로 들어오면 수입이에요.':'"우리나라 입장에서" 생각해요. 물건이 우리나라에서 나가나요, 들어오나요?';
  if(st===4){const d=draft(cid,'s4');const it=L.S4.items.find(x=>!(d[x.id]&&d[x.id].place&&d[x.id].dir));
    if(stt==='fix')return '✗ 물건을 눌러 사건 기록을 다시 읽고, 나라나 방향을 고쳐 보세요.';
    return it?`위에서 물건을 고르고 사건 기록을 읽어요. 어느 나라인지 지도에서 누르고, 물건이 우리나라로 들어왔는지 나갔는지 골라요. (아직: ${it.name})`:'7개를 모두 골랐어요. 화살표 방향을 확인하고 제출해요!'}
  if(st===5)return '정답은 없어요! 카드를 하나 고르고, 모둠 친구들의 생각을 모아 "~때문일 것 같아요"라고 적어 보세요.';
  return null;
}
function renderHelper(){
  let root=document.getElementById('helper-root');
  if(!root){root=document.createElement('div');root.id='helper-root';document.body.appendChild(root)}
  const hint=helperHint();
  if(!hint){root.innerHTML='';ui.helperOpen=false;return}
  if(ui.helperLast!==undefined&&hint!==ui.helperLast&&!ui.helperOpen)ui.helperNew=true;
  ui.helperLast=hint;
  root.innerHTML=`<div class="helper${ui.helperOpen?' open':''}">${ui.helperOpen?`<div class="helper-bubble" role="status"><div class="helper-name">${esc(HELPER_NAME)}</div><p>${esc(hint)}</p><button class="helper-x" data-a="helper-close" aria-label="힌트 닫기">×</button></div>`:''}
    <button class="helper-btn${ui.helperNew?' new':''}" data-a="helper" aria-expanded="${!!ui.helperOpen}" aria-label="${esc(HELPER_NAME)}에게 힌트 듣기" title="힌트 보기">${HELPER_SVG}</button></div>`;
}

/* ---------- 렌더링 ---------- */
function editing(){const ae=document.activeElement;return ae&&ae.closest&&ae.closest('#main')&&(ae.tagName==='TEXTAREA'||(ae.tagName==='INPUT'&&ae.type!=='checkbox'))}
function render(force){
  if(!S||!cfg)return;
  if(!force&&editing()){ui.deferred=true;renderTop();return}
  ui.deferred=false;renderTop();
  const main=document.getElementById('main');const sy=window.scrollY;
  try{main.innerHTML=view==='teacher'?teacherView():view==='projector'?projectorView():studentView(view)}
  catch(err){console.error(err);main.innerHTML=`<section class="panel"><h2>화면을 그리지 못했어요</h2><p style="margin:0">새로고침해 보고, 계속되면 ${opts.mode==='teacher'?'[다른 방 열기]에서 새 방을 만들어 주세요.':'선생님께 말씀해 주세요.'}</p></section>`}
  if(Math.abs(window.scrollY-sy)>2)window.scrollTo(0,sy);
  renderHelper();
}
function setView(v){view=v;try{history.replaceState(null,'','#'+v)}catch(e){}store.set('review.view.'+opts.mode,v);render(true);window.scrollTo(0,0)}

/* ---------- 이벤트 ---------- */
function onClick(e){
  const b=e.target.closest('[data-a]');if(!b||b.disabled)return;const a=b.dataset.a,cid=b.dataset.c;const B=opts.backend;
  if(a==='modal-no'){ui.modal=null;return renderModal()}
  if(a==='modal-yes'){const m=ui.modal;ui.modal=null;renderModal();return m.onOk()}
  if(a==='helper'){ui.helperOpen=!ui.helperOpen;ui.helperNew=false;return renderHelper()}
  if(a==='helper-close'){ui.helperOpen=false;renderHelper();return}
  if(opts.onAction&&opts.onAction(a,b))return;
  if(!B||!S)return;
  if(a==='view')return setView(b.dataset.v);
  if(a==='fullscreen'){try{document.documentElement.requestFullscreen().catch(()=>{})}catch(err){}return}
  if(a==='s2'){const d=draft(cid,'s2');d[b.dataset.i]=b.dataset.v;saveDraft(cid,'s2');return render(true)}
  if(a==='s3'){const d=draft(cid,'s3');d[b.dataset.i]=b.dataset.v;saveDraft(cid,'s3');return render(true)}
  if(a==='s4-item'){ui.active[cid+'.s4']=b.dataset.v;return render(true)}
  if(a==='s4-place'||a==='s4-dir'){const d=draft(cid,'s4');const act=ui.active[cid+'.s4']||(L.S4.items.find(it=>!(d[it.id]&&d[it.id].place&&d[it.id].dir))||L.S4.items[0]).id;ui.active[cid+'.s4']=act;
    d[act]=Object.assign({},d[act],a==='s4-place'?{place:b.dataset.v}:{dir:b.dataset.v});saveDraft(cid,'s4');
    if(d[act].place&&d[act].dir){const nx=L.S4.items.find(it=>!(d[it.id]&&d[it.id].place&&d[it.id].dir));if(nx)ui.active[cid+'.s4']=nx.id}
    return render(true)}
  if(a==='submit'){const key=b.dataset.k;const d=L.clone(draft(cid,key));
    return run('sub-'+cid,()=>B.submit(cid,key,d),(r)=>r.firstTime?(r.allCorrect?`모두 맞았어요! +${r.points}점`:`+${r.points}점! 틀린 곳을 고쳐서 다시 제출해 보세요.`):(r.allCorrect?'사건 해결!':'아직 틀린 곳이 있어요.'))}
  if(a==='s5-card'){const d=draft(cid,'s5');d.card=b.dataset.v;saveDraft(cid,'s5');return render(true)}
  if(a==='s5-send'){const d=draft(cid,'s5');return run('sub-'+cid,()=>B.curious(cid,{card:d.card,guess:d.guess||'',question:d.question||''}),'모둠 생각을 보냈어요!')}
  if(a==='stage'){const n=Number(b.dataset.n);if(n===S.stage||!L.STAGES.some(x=>x.n===n))return;return run('stage',()=>B.setStage(n),`${L.stageNo(n)}단계로 바꿨습니다.`)}
  if(a==='reset')return ask('처음부터 다시 할까요?','모든 모둠의 답과 점수를 지우고 1단계로 돌아갑니다. 학생 접속은 유지됩니다.','처음부터 다시',()=>{ui.drafts={};run('reset',()=>B.reset(),'초기화했습니다.')},true);
}
function onInput(e){const el=e.target;if(el.dataset.a!=='s5-text')return;const d=draft(el.dataset.c,'s5');d[el.dataset.f]=el.value.slice(0,L.S5.maxLen);saveDraft(el.dataset.c,'s5');
  const btn=document.querySelector(`[data-a="s5-send"][data-c="${el.dataset.c}"]`);if(btn&&!ui.busy['sub-'+el.dataset.c])btn.disabled=!d.card||!(d.guess||'').trim()}
function onKey(e){if(e.key==='Escape'&&ui.modal){ui.modal=null;renderModal()}else if(e.key==='Escape'&&ui.helperOpen){ui.helperOpen=false;renderHelper()}
  else if((e.key==='Enter'||e.key===' ')&&e.target.closest&&e.target.closest('g[data-a]')){e.preventDefault();e.target.closest('g[data-a]').dispatchEvent(new MouseEvent('click',{bubbles:true}))}}

const TradeUI={
  mount(o){
    opts=o;const ok=(v)=>(o.tabs||[]).includes(v);
    if(o.fixedView)view=o.fixedView;
    else{const h=location.hash.slice(1);const sv=store.get('review.view.'+o.mode);view=ok(h)?h:ok(sv)?sv:(o.tabs||['teacher'])[0]}
    ui.busy={};ui.drafts={};ui.active={};
  },
  update(state,config,ex){
    // 교사가 처음부터 다시 하면 이 기기에 남은 초안도 지움
    if(S&&state&&state.stage===1&&S.stage!==1){Object.keys(ui.drafts).forEach(k=>{const [c,key]=k.split('.');store.del(draftKey(c,key))});ui.drafts={}}
    S=state;cfg=config;extra=ex||{};render()},
  render(){render(true)},
  toast, ask, esc, flag, icon,
  get view(){return view}
};
document.addEventListener('click',onClick);
document.addEventListener('input',onInput);
document.addEventListener('keydown',onKey);
document.addEventListener('focusout',()=>{setTimeout(()=>{if(ui.deferred&&!editing())render(true)},0)});
root.TradeUI=TradeUI;
})(window);
