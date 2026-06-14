"use strict";
// ===========================================================================
// Shared DLS diagram engine for the land-divisions pages (desktop + mobile).
// Pure drawing/builders: each function renders an interactive SVG into a host
// element looked up by id, so the same code serves both layouts. The section
// math is the SAME boustrophedon the Cottonwood map uses.
// ===========================================================================
const C = { ink:"#3a2a14", edge:"#8b5a2b", edgeSoft:"#b08a55", grid:"#7a4a1e",
  cpr:"#e06050", hbc:"#4a78c8", school:"#3f9e3f", settler:"#f5c544", water:"#5a82a8", paper:"#fffaf0" };
const SVGNS = "http://www.w3.org/2000/svg";

// Section -> {row (0=south), colFromWest (0=west)} using the DLS snake.
function secRowCol(sec){
  const row = Math.floor((sec - 1) / 6);
  const i = (sec - 1) % 6;
  const colE = (row % 2 === 0) ? i : 5 - i;   // columns counted from the EAST
  return { row, colW: 5 - colE };
}
function el(tag, attrs, parent){
  const n = document.createElementNS(SVGNS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}
function svgRoot(host, w, h){
  host.innerHTML = "";
  const s = el("svg", { viewBox:`0 0 ${w} ${h}`, class:"diag-svg" }, host);
  return s;
}

// ---- Meridian map --------------------------------------------------------
const MERIDIANS = [
  { n:"1st", lon:"97°27′ W", reg:"Southern Manitoba" },
  { n:"2nd", lon:"102° W", reg:"W. Manitoba / E. Saskatchewan" },
  { n:"3rd", lon:"106° W", reg:"Central Saskatchewan" },
  { n:"4th", lon:"110° W", reg:"Alberta–Saskatchewan boundary" },
  { n:"5th", lon:"114° W", reg:"Central Alberta — the study area" },
  { n:"6th", lon:"118° W", reg:"Western Alberta / NE B.C." }
];
let merActive = 4; // 5th by default
function drawMeridians(){
  const w=520, h=360, padL=40, padR=30, top=24, baseY=h-46;
  const s = svgRoot(document.getElementById("meridianDiag"), w, h);
  const xs = MERIDIANS.map((_,i)=> (w-padR) - i*((w-padL-padR)/(MERIDIANS.length-1))); // 1st = east (right)
  el("rect",{x:0,y:top,width:w,height:baseY-top,fill:"#eadfc4",opacity:.45},s);
  MERIDIANS.forEach((m,i)=>{
    const on = i===merActive;
    el("line",{x1:xs[i],y1:top,x2:xs[i],y2:baseY,stroke:on?C.edge:C.edgeSoft,
      "stroke-width":on?3.4:1.4,opacity:on?1:.6},s);
    const t=el("text",{x:xs[i],y:top-7,"text-anchor":"middle","font-size":12,
      fill:on?C.edge:"#9a7a4a","font-weight":on?"bold":"normal"},s); t.textContent=m.n;
  });
  el("line",{x1:0,y1:baseY,x2:w,y2:baseY,stroke:C.ink,"stroke-width":2.4},s);
  const bl=el("text",{x:w-6,y:baseY+18,"text-anchor":"end","font-size":11,fill:C.ink,"font-style":"italic"},s);
  bl.textContent="Baseline — 49th parallel (Canada–U.S. border)";
  el("line",{x1:padL-22,y1:baseY,x2:padL-22,y2:top+6,stroke:"#9a7a4a","stroke-width":1.2,"marker-end":"url(#arr)"},s);
  const defs=el("defs",{},s);
  const mk=el("marker",{id:"arr",markerWidth:8,markerHeight:8,refX:4,refY:4,orient:"auto"},defs);
  el("path",{d:"M0,0 L8,4 L0,8 z",fill:"#9a7a4a"},mk);
  const ta=el("text",{x:padL-26,y:(top+baseY)/2,"text-anchor":"middle","font-size":10,fill:"#9a7a4a",
    transform:`rotate(-90 ${padL-26} ${(top+baseY)/2})`},s); ta.textContent="townships count north →";
  const sx = xs[4] + (xs[5]-xs[4])*0.28, sy = top + (baseY-top)*0.30;
  star(s, sx, sy, 9, C.settler, C.edge);
  const st=el("text",{x:sx,y:sy-13,"text-anchor":"middle","font-size":11,fill:C.edge,"font-weight":"bold"},s);
  st.textContent="Cottonwood";
}
function star(s,cx,cy,r,fill,stroke){
  let d="";
  for(let i=0;i<10;i++){const ang=-Math.PI/2+i*Math.PI/5;const rr=i%2?r*0.45:r;
    d+=(i?"L":"M")+(cx+rr*Math.cos(ang)).toFixed(1)+","+(cy+rr*Math.sin(ang)).toFixed(1);}
  el("path",{d:d+"Z",fill,stroke,"stroke-width":1},s);
}
function buildMerButtons(){
  const host=document.getElementById("merBtns");
  MERIDIANS.forEach((m,i)=>{
    const b=document.createElement("button");
    b.textContent=m.n; b.className=i===merActive?"active":"";
    b.onclick=()=>{ merActive=i; drawMeridians();
      host.querySelectorAll("button").forEach((x,j)=>x.classList.toggle("active",j===i));
      updateMerCaption(); };
    host.appendChild(b);
  });
  const cap=document.createElement("div");
  cap.id="merCap"; cap.className="diag-caption";
  host.after(cap); updateMerCaption();
}
function updateMerCaption(){
  const m=MERIDIANS[merActive];
  document.getElementById("merCap").innerHTML=`<b>${m.n} Meridian</b> &middot; ${m.lon}<br>${m.reg}`;
}

// ---- Township grid + snake ----------------------------------------------
function townshipGrid(host, opts){
  const n=6, size=opts.size||420, pad=opts.pad||16;
  const cell=(size-2*pad)/n;
  const s=svgRoot(host, size, size + (opts.extraH||0));
  function pos(sec){ const {row,colW}=secRowCol(sec);
    return { x: pad+colW*cell, y: pad+(n-1-row)*cell }; }
  return { svg:s, cell, n, pad, size, pos,
    rectFor:sec=>{const p=pos(sec);return {x:p.x,y:p.y,w:cell,h:cell};},
    center:sec=>{const p=pos(sec);return {x:p.x+cell/2,y:p.y+cell/2};} };
}
function drawSnake(animate){
  const host=document.getElementById("snakeDiag");
  const g=townshipGrid(host,{size:420});
  for(let sec=1;sec<=36;sec++){
    const r=g.rectFor(sec);
    el("rect",{x:r.x,y:r.y,width:r.w,height:r.h,fill:"none",stroke:C.grid,"stroke-width":1},g.svg);
  }
  el("rect",{x:g.pad,y:g.pad,width:g.cell*6,height:g.cell*6,fill:"none",stroke:"#5c3a1e","stroke-width":2.5},g.svg);
  let d="";
  for(let sec=1;sec<=36;sec++){const c=g.center(sec);d+=(sec===1?"M":"L")+c.x.toFixed(1)+","+c.y.toFixed(1);}
  const path=el("path",{d,fill:"none",stroke:C.cpr,"stroke-width":2.2,opacity:.55,
    "stroke-linejoin":"round","stroke-linecap":"round"},g.svg);
  const labels=[];
  for(let sec=1;sec<=36;sec++){const c=g.center(sec);
    const t=el("text",{x:c.x,y:c.y+4,"text-anchor":"middle","font-size":14,fill:C.ink,opacity:animate?0:1},g.svg);
    t.textContent=sec; labels.push(t);}
  const c1=g.center(1);
  el("circle",{cx:c1.x,cy:c1.y,r:4,fill:C.cpr},g.svg);
  if(animate){
    const len=path.getTotalLength();
    path.style.strokeDasharray=len; path.style.strokeDashoffset=len; path.style.opacity=.85;
    const dur=2600, t0=performance.now();
    function step(t){
      const k=Math.min(1,(t-t0)/dur);
      path.style.strokeDashoffset=len*(1-k);
      const show=Math.floor(k*36+0.0001);
      for(let i=0;i<labels.length;i++) labels[i].style.opacity=(i<show)?1:0;
      if(k<1) requestAnimationFrame(step);
      else { labels.forEach(l=>l.style.opacity=1); path.style.opacity=.55; }
    }
    requestAnimationFrame(step);
  }
}

// ---- Subdivide (section / quarter / LSD) ---------------------------------
let subdivLevel="section";
function drawSubdiv(){
  const host=document.getElementById("subdivDiag");
  const size=400, pad=20, side=size-2*pad;
  const s=svgRoot(host,size,size);
  el("rect",{x:pad,y:pad,width:side,height:side,fill:"#f3ead4",stroke:"#5c3a1e","stroke-width":2.5},s);
  const cap=document.getElementById("subdivCap");
  if(subdivLevel==="section"){
    el("text",{x:size/2,y:size/2+6,"text-anchor":"middle","font-size":18,fill:C.ink},s).textContent="1 section";
    el("text",{x:size/2,y:size/2+30,"text-anchor":"middle","font-size":13,fill:"#7a5c3d","font-style":"italic"},s)
      .textContent="640 acres · 1 sq mile";
    if(cap) cap.innerHTML="One square mile &mdash; <b>640 acres</b>.";
  } else if(subdivLevel==="quarter"){
    const half=side/2;
    el("line",{x1:pad+half,y1:pad,x2:pad+half,y2:pad+side,stroke:C.grid,"stroke-width":1.5},s);
    el("line",{x1:pad,y1:pad+half,x2:pad+side,y2:pad+half,stroke:C.grid,"stroke-width":1.5},s);
    const q=[["NW",0,0],["NE",1,0],["SW",0,1],["SE",1,1]];
    q.forEach(([lab,cx,cy])=>{
      const x=pad+cx*half+half/2, y=pad+cy*half+half/2;
      el("rect",{x:pad+cx*half+4,y:pad+cy*half+4,width:half-8,height:half-8,fill:C.settler,"fill-opacity":.16},s);
      el("text",{x,y:y-2,"text-anchor":"middle","font-size":17,fill:C.ink,"font-weight":"bold"},s).textContent=lab;
      el("text",{x,y:y+18,"text-anchor":"middle","font-size":12,fill:"#7a5c3d"},s).textContent="160 ac";
    });
    if(cap) cap.innerHTML="Four <b>quarter-sections</b> &mdash; 160 acres each. The homestead unit.";
  } else {
    const q=side/4;
    for(let i=1;i<4;i++){
      el("line",{x1:pad+i*q,y1:pad,x2:pad+i*q,y2:pad+side,stroke:C.grid,"stroke-width":i===2?1.5:0.7,opacity:i===2?1:.6},s);
      el("line",{x1:pad,y1:pad+i*q,x2:pad+side,y2:pad+i*q,stroke:C.grid,"stroke-width":i===2?1.5:0.7,opacity:i===2?1:.6},s);
    }
    for(let lsd=1;lsd<=16;lsd++){
      const row=Math.floor((lsd-1)/4), i=(lsd-1)%4;
      const colE=(row%2===0)?i:3-i, colW=3-colE;
      const x=pad+colW*q+q/2, y=pad+(3-row)*q+q/2;
      el("rect",{x:pad+colW*q+2,y:pad+(3-row)*q+2,width:q-4,height:q-4,fill:C.hbc,"fill-opacity":.10},s);
      el("text",{x,y:y+4,"text-anchor":"middle","font-size":13,fill:C.ink},s).textContent=lsd;
    }
    if(cap) cap.innerHTML="Sixteen <b>Legal Subdivisions</b> &mdash; ~40 acres each. Used to locate oil &amp; gas wells.";
  }
}
function buildSubdivButtons(){
  const host=document.getElementById("subdivBtns");
  [["section","Section · 640 ac"],["quarter","Quarters · 160 ac"],["lsd","LSDs · 40 ac"]].forEach(([lvl,lab])=>{
    const b=document.createElement("button"); b.textContent=lab; b.className=lvl===subdivLevel?"active":"";
    b.onclick=()=>{ subdivLevel=lvl; drawSubdiv();
      host.querySelectorAll("button").forEach(x=>x.classList.remove("active")); b.classList.add("active"); };
    host.appendChild(b);
  });
}

// ---- Legal-description builder -------------------------------------------
const LB = { q:"SW", s:16, t:35, r:2, m:"W5" };
function fillSelect(id, items, val){
  const sel=document.getElementById(id);
  items.forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;sel.appendChild(o);});
  sel.value=val;
}
function buildLB(){
  fillSelect("lbQ",["NW","NE","SW","SE"],LB.q);
  fillSelect("lbS",Array.from({length:36},(_,i)=>i+1),LB.s);
  fillSelect("lbT",Array.from({length:11},(_,i)=>30+i),LB.t);
  fillSelect("lbR",Array.from({length:6},(_,i)=>i+1),LB.r);
  fillSelect("lbM",["W2","W3","W4","W5","W6"],LB.m);
  ["lbQ","lbS","lbT","lbR","lbM"].forEach(id=>{
    document.getElementById(id).addEventListener("change",e=>{
      const isStr = (id==="lbQ"||id==="lbM");
      const key = {lbQ:"q",lbS:"s",lbT:"t",lbR:"r",lbM:"m"}[id];
      LB[key] = isStr ? e.target.value : +e.target.value;
      renderLB();
    });
  });
  renderLB();
}
function renderLB(){
  const segs=[["q",LB.q],["s",LB.s],["t",LB.t],["r",LB.r],["m",LB.m]];
  document.getElementById("lbOut").innerHTML=
    segs.map(([k,v])=>`<span class="seg" data-k="${k}">${v}</span>`).join('<span class="dash">-</span>');
  document.getElementById("lbRead").innerHTML=
    `the <b>${({NW:"north-west",NE:"north-east",SW:"south-west",SE:"south-east"})[LB.q]}</b> quarter of `+
    `<b>section ${LB.s}</b>, <b>township ${LB.t}</b>, <b>range ${LB.r}</b>, west of the `+
    `<b>${({W2:"2nd",W3:"3rd",W4:"4th",W5:"5th",W6:"6th"})[LB.m]} Meridian</b>`;
  const g=townshipGrid(document.getElementById("lbTwpDiag"),{size:300,pad:12});
  for(let sec=1;sec<=36;sec++){const r=g.rectFor(sec);
    const hot=sec===LB.s;
    el("rect",{x:r.x,y:r.y,width:r.w,height:r.h,fill:hot?C.settler:"none","fill-opacity":hot?.5:0,
      stroke:C.grid,"stroke-width":hot?1.6:.8,opacity:hot?1:.7},g.svg);
    const c=g.center(sec);
    el("text",{x:c.x,y:c.y+3,"text-anchor":"middle","font-size":9,
      fill:hot?C.ink:"#a8895c","font-weight":hot?"bold":"normal"},g.svg).textContent=sec;
  }
  el("rect",{x:g.pad,y:g.pad,width:g.cell*6,height:g.cell*6,fill:"none",stroke:"#5c3a1e","stroke-width":2},g.svg);
  const size=300,pad=14,side=size-2*pad;
  const s=svgRoot(document.getElementById("lbSecDiag"),size,size);
  const half=side/2, qpos={NW:[0,0],NE:[1,0],SW:[0,1],SE:[1,1]};
  Object.entries(qpos).forEach(([lab,[cx,cy]])=>{
    const hot=lab===LB.q;
    el("rect",{x:pad+cx*half,y:pad+cy*half,width:half,height:half,
      fill:hot?C.settler:"#f3ead4","fill-opacity":hot?.55:1,stroke:C.grid,"stroke-width":1},s);
    el("text",{x:pad+cx*half+half/2,y:pad+cy*half+half/2+5,"text-anchor":"middle","font-size":16,
      fill:hot?C.ink:"#a8895c","font-weight":hot?"bold":"normal"},s).textContent=lab;
  });
  el("rect",{x:pad,y:pad,width:side,height:side,fill:"none",stroke:"#5c3a1e","stroke-width":2},s);
}

// ---- Road allowances ------------------------------------------------------
function drawRoads(){
  const host=document.getElementById("roadDiag");
  const size=420,pad=30,n=3,cell=(size-2*pad)/n;
  const s=svgRoot(host,size,size);
  const road=cell*0.12;
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){
    const x=pad+c*cell, y=pad+r*cell;
    el("rect",{x:x+road,y:y,width:cell-road,height:cell-road,fill:"#f3ead4",stroke:C.grid,"stroke-width":1},s);
    el("rect",{x:x,y:y,width:road,height:cell,fill:"#cdb98e"},s);
    el("rect",{x:x,y:y+cell-road,width:cell,height:road,fill:"#cdb98e"},s);
  }
  el("rect",{x:pad,y:pad,width:cell*n,height:cell*n,fill:"none",stroke:"#5c3a1e","stroke-width":2},s);
  el("text",{x:pad+cell*n/2,y:size-8,"text-anchor":"middle","font-size":12,fill:"#7a5c3d","font-style":"italic"},s)
    .textContent="← township road (E–W) · 66 ft allowance →";
  const vt=el("text",{x:14,y:pad+cell*n/2,"text-anchor":"middle","font-size":12,fill:"#7a5c3d","font-style":"italic",
    transform:`rotate(-90 14 ${pad+cell*n/2})`},s); vt.textContent="← range road (N–S) →";
}

// ---- Correction line ------------------------------------------------------
function drawCorrection(conv){
  const host=document.getElementById("corrDiag");
  const w=480,h=380,pad=24;
  const s=svgRoot(host,w,h);
  const corrY=h*0.5;
  const k=conv/100*0.5;
  const cols=6, span=w-2*pad, base=span/cols;
  el("rect",{x:pad,y:pad,width:span,height:h-2*pad,fill:"#eadfc4",opacity:.4},s);
  for(let i=0;i<=cols;i++){
    const xBottom=pad+i*base;
    el("line",{x1:xBottom,y1:corrY,x2:xBottom,y2:h-pad,stroke:C.grid,"stroke-width":1.1,opacity:.8},s);
    const mid=pad+span/2;
    const xTop=xBottom+(mid-xBottom)*k;
    el("line",{x1:xBottom,y1:corrY,x2:xTop,y2:pad,stroke:C.grid,"stroke-width":1.1,opacity:.8},s);
    if(i>0&&i<cols&&k>0.02){ el("circle",{cx:xBottom,cy:corrY,r:2.6,fill:C.cpr},s); }
  }
  [pad, corrY, h-pad].forEach((y,idx)=>{
    el("line",{x1:pad,y1:y,x2:w-pad,y2:y,stroke:idx===1?C.cpr:C.grid,"stroke-width":idx===1?2.6:1.1,
      opacity:idx===1?1:.7},s);
  });
  el("line",{x1:pad,y1:(pad+corrY)/2,x2:w-pad,y2:(pad+corrY)/2,stroke:C.grid,"stroke-width":.8,opacity:.5},s);
  el("line",{x1:pad,y1:(corrY+h-pad)/2,x2:w-pad,y2:(corrY+h-pad)/2,stroke:C.grid,"stroke-width":.8,opacity:.5},s);
  el("text",{x:w-pad,y:corrY-7,"text-anchor":"end","font-size":12,fill:C.cpr,"font-weight":"bold"},s)
    .textContent="correction line (every 24 mi)";
  el("text",{x:pad+4,y:pad+14,"font-size":11,fill:"#7a5c3d","font-style":"italic"},s)
    .textContent="lines converge ↑";
}

// ---- Reserved-lands checkerboard -----------------------------------------
const RES = { school:true, hbc:true, cpr:true };
const SCHOOL_SECS=[11,29], HBC_SECS=[8,26];
function classify(sec){
  if(RES.school && SCHOOL_SECS.includes(sec)) return "school";
  if(RES.hbc && HBC_SECS.includes(sec)) return "hbc";
  if(RES.cpr && sec%2===1) return "cpr";
  return "settler";
}
function drawCheck(){
  const host=document.getElementById("checkDiag");
  const g=townshipGrid(host,{size:420});
  const COL={school:C.school,hbc:C.hbc,cpr:C.cpr,settler:C.settler};
  for(let sec=1;sec<=36;sec++){
    const r=g.rectFor(sec), kind=classify(sec);
    el("rect",{x:r.x,y:r.y,width:r.w,height:r.h,fill:COL[kind],"fill-opacity":kind==="settler"?.18:.42,
      stroke:C.grid,"stroke-width":1},g.svg);
    const c=g.center(sec);
    el("text",{x:c.x,y:c.y+4,"text-anchor":"middle","font-size":12,fill:C.ink},g.svg).textContent=sec;
  }
  el("rect",{x:g.pad,y:g.pad,width:g.cell*6,height:g.cell*6,fill:"none",stroke:"#5c3a1e","stroke-width":2.5},g.svg);
}
function buildCheckButtons(){
  const host=document.getElementById("checkBtns");
  const defs=[["school","School (11 & 29)",C.school],["hbc","H.B.C. (8 & 26)",C.hbc],
    ["cpr","Railway / odd sections",C.cpr]];
  defs.forEach(([key,lab,col])=>{
    const b=document.createElement("button"); b.className="chip active";
    b.innerHTML=`<span class="sw" style="background:${col}"></span>${lab}`;
    b.onclick=()=>{ RES[key]=!RES[key]; b.classList.toggle("active",RES[key]); drawCheck(); };
    host.appendChild(b);
  });
  const leg=document.createElement("span"); leg.className="chip static";
  leg.innerHTML=`<span class="sw" style="background:${C.settler}"></span>Open for homestead`;
  host.appendChild(leg);
}

// ===========================================================================
// HISTORY DIAGRAMS (for dls-history pages) — timeline, township-size compare,
// DLS/PLSS numbering, homestead-entries chart, metes-and-bounds vs grid.
// ===========================================================================

// ---- Interactive timeline (HTML; click an event to expand) ---------------
const TIMELINE = [
  ["1670","The HBC charter","Charles II grants the Hudson’s Bay Company every land draining into Hudson Bay — Rupert’s Land, about 3.9 million km², roughly 40% of modern Canada. For two centuries it is run for furs, not farms: no townships, no section lines."],
  ["1867","Confederation","The British North America Act creates the Dominion of Canada — but the vast prairie interior is still the Company’s private domain."],
  ["1868","Rupert’s Land Act","The UK Parliament authorizes the transfer of Rupert’s Land to Canada. Terms come in the Deed of Surrender: £300,000, the HBC keeps its posts, and one-twentieth of the “fertile belt.”"],
  ["1869","Red River resists","Dennis’s first survey — on an American-style 8-mile township plan — is halted when Métis under Louis Riel stop a survey crew on André Nault’s farm (11 Oct). The survey is disbanded that December."],
  ["1870","The transfer","Rupert’s Land and the North-Western Territory formally pass to Canada on 15 July. Manitoba becomes a province."],
  ["1871","The system is set","Dennis fixes the final design — 6-mile townships of 36 sections, 640 acres each. The first survey post is driven near Headingley on 10 July."],
  ["1872","Dominion Lands Act","Royal assent, 14 April. 160 acres for a $10 fee to any household head or man 18+, patented after three years’ residence, 30 acres broken, and a dwelling built."],
  ["1873","Department of the Interior","A new department is created to run Dominion Lands, Indian Affairs, the Geological Survey and more. The homestead age drops from 21 to 18."],
  ["1876","Women admitted","Women who are the sole head of a family become eligible to file for a homestead."],
  ["1881","Road allowances trimmed","System 3: road allowances are narrowed to one chain (66 ft) and several cross-township allowances are dropped."],
  ["1885","The CPR is completed","The transcontinental railway is finished — the missing piece that finally made prairie farming viable."],
  ["1896","Sifton arrives","Clifford Sifton becomes Minister of the Interior and launches the aggressive “Last Best West” immigration campaign across Europe and the American mid-west."],
  ["1905","Two new provinces","Alberta and Saskatchewan are created. Immigration has surged from ~17,000 (1896) to ~141,000 (1905)."],
  ["1911","Peak homesteading","44,479 homestead entries in a single year — the high-water mark of the settlement flood."],
  ["1930","Lands to the provinces","The Natural Resources Transfer Acts hand the Crown lands to the prairie provinces; the federal homestead era ends. The grid remains — and still governs every title today."]
];
function buildTimeline(hostId){
  const host=document.getElementById(hostId||"timeline"); if(!host) return;
  host.innerHTML = TIMELINE.map((e,i)=>
    `<button class="tl-item" data-i="${i}" aria-expanded="false">
       <span class="tl-dot"></span>
       <span class="tl-head"><span class="tl-year">${e[0]}</span><span class="tl-title">${e[1]}</span></span>
       <span class="tl-detail">${e[2]}</span>
     </button>`).join("");
  host.querySelectorAll(".tl-item").forEach(b=>{
    b.addEventListener("click",()=>{
      const open=b.classList.toggle("open");
      b.setAttribute("aria-expanded", open?"true":"false");
    });
  });
}

// ---- generic n x n grid of squares ---------------------------------------
function gridSquares(svg, x0, y0, side, n, opts){
  opts=opts||{};
  const cell=side/n;
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){
    el("rect",{x:x0+c*cell,y:y0+r*cell,width:cell,height:cell,fill:"none",
      stroke:C.grid,"stroke-width":0.7,opacity:.75},svg);
  }
  el("rect",{x:x0,y:y0,width:side,height:side,fill:opts.fill||"none",
    "fill-opacity":opts.fillOp||0,stroke:"#5c3a1e","stroke-width":2},svg);
}

// ---- Dennis's 8-mile vs adopted 6-mile township --------------------------
let sizeWhich="6";
function drawSizeCompare(which){
  sizeWhich = which || sizeWhich;
  const host=document.getElementById("sizeDiag"); if(!host) return;
  const size=360, pad=26, top=12;
  const s=svgRoot(host,size,size+30);
  const side=size-2*pad;
  const n = sizeWhich==="8" ? 8 : 6;
  const tint = sizeWhich==="8" ? C.cpr : C.school;
  gridSquares(s, pad, top, side, n, {fill:tint, fillOp:.10});
  const secs=n*n, acres = sizeWhich==="8" ? 800 : 640;
  el("text",{x:size/2,y:size+8,"text-anchor":"middle","font-size":15,fill:C.ink,"font-weight":"bold"},s)
    .textContent = `${n}-mile township`;
  el("text",{x:size/2,y:size+26,"text-anchor":"middle","font-size":13,fill:"#7a5c3d"},s)
    .textContent = `${secs} sections · ${acres} acres each`;
}
function buildSizeButtons(){
  const host=document.getElementById("sizeBtns"); if(!host) return;
  [["8","Dennis’s 8-mile (64 sec)"],["6","Adopted 6-mile (36 sec)"]].forEach(([k,lab])=>{
    const b=document.createElement("button"); b.textContent=lab; b.className=(k===sizeWhich)?"active":"";
    b.onclick=()=>{ drawSizeCompare(k);
      host.querySelectorAll("button").forEach(x=>x.classList.remove("active")); b.classList.add("active"); };
    host.appendChild(b);
  });
}

// ---- DLS vs PLSS section numbering (side by side) -------------------------
function townNumbers(svg, x0, y0, side, system){
  const n=6, cell=side/n;
  for(let sec=1;sec<=36;sec++){
    let row, colW;
    if(system==="DLS"){ const rc=secRowCol(sec); row=5-rc.row; colW=rc.colW; } // row from top
    else { const rt=Math.floor((sec-1)/6), i=(sec-1)%6;
      const colE=(rt%2===0)? i : 5-i; colW=5-colE; row=rt; }              // PLSS: Sec 1 = NE
    const x=x0+colW*cell, y=y0+row*cell, first=(sec===1);
    el("rect",{x,y,width:cell,height:cell,fill:first?C.settler:"none","fill-opacity":first?.55:0,
      stroke:C.grid,"stroke-width":first?1.7:0.7,opacity:first?1:.8},svg);
    el("text",{x:x+cell/2,y:y+cell/2+4,"text-anchor":"middle","font-size":11,
      fill:C.ink,"font-weight":first?"bold":"normal"},svg).textContent=sec;
  }
  el("rect",{x:x0,y:y0,width:side,height:side,fill:"none",stroke:"#5c3a1e","stroke-width":2},svg);
}
function drawNumberingCompare(){
  const host=document.getElementById("numDiag"); if(!host) return;
  const W=520,H=320,pad=16,gap=44,topG=30;
  const s=svgRoot(host,W,H);
  const side=(W-2*pad-gap)/2;
  el("text",{x:pad+side/2,y:16,"text-anchor":"middle","font-size":13,fill:C.ink,"font-weight":"bold"},s).textContent="Canada — D.L.S.";
  el("text",{x:pad+side+gap+side/2,y:16,"text-anchor":"middle","font-size":13,fill:C.ink,"font-weight":"bold"},s).textContent="United States — P.L.S.S.";
  townNumbers(s,pad,topG,side,"DLS");
  townNumbers(s,pad+side+gap,topG,side,"PLSS");
  el("text",{x:pad+side/2,y:topG+side+20,"text-anchor":"middle","font-size":11.5,fill:C.edge,"font-style":"italic"},s).textContent="Sec 1 → south-east";
  el("text",{x:pad+side+gap+side/2,y:topG+side+20,"text-anchor":"middle","font-size":11.5,fill:C.edge,"font-style":"italic"},s).textContent="Sec 1 → north-east";
}

// ---- Homestead entries 1874-1930 (national series, Canada Year Book 1931)--
const HS_DATA=[[1874,1376],[1875,499],[1876,347],[1877,845],[1878,1788],[1879,4068],
[1880,2074],[1881,2753],[1882,7483],[1883,6063],[1884,3753],[1885,1858],[1886,2657],
[1887,2036],[1888,2655],[1889,4416],[1890,2955],[1891,3523],[1892,4840],[1893,4067],
[1894,3209],[1895,2394],[1896,1857],[1897,2384],[1898,4848],[1899,6689],[1900,7426],
[1901,8167],[1902,14633],[1903,31383],[1904,26073],[1905,30819],[1906,41869],[1907,21647],
[1908,30424],[1909,39081],[1910,41568],[1911,44479],[1912,39151],[1913,33699],[1914,31829],
[1915,24088],[1916,17030],[1917,11199],[1918,8319],[1919,4227],[1920,6732],[1921,5389],
[1922,7349],[1923,5343],[1924,3843],[1925,3653],[1926,4685],[1927,5760],[1928,7233],
[1929,16157],[1930,17504]];
function drawHomesteadChart(){
  const host=document.getElementById("chartDiag"); if(!host) return;
  const W=640,H=300,padL=8,padR=8,padT=14,padB=36;
  const s=svgRoot(host,W,H);
  const max=Math.max(...HS_DATA.map(d=>d[1]));
  const n=HS_DATA.length, bw=(W-padL-padR)/n, plotH=H-padT-padB;
  const boom=y=>y>=1896 && y<=1913;
  HS_DATA.forEach(([y,v],i)=>{
    const h=v/max*plotH, x=padL+i*bw, yy=padT+plotH-h;
    const bar=el("rect",{x:x+0.5,y:yy,width:Math.max(1,bw-1),height:h,
      fill: boom(y)?C.cpr:C.edgeSoft, "fill-opacity": boom(y)?.85:.7, class:"hs-bar"},s);
    bar.setAttribute("data-y",y); bar.setAttribute("data-v",v); bar.style.cursor="pointer";
    const show=()=>{ const cap=document.getElementById("chartCap");
      if(cap) cap.innerHTML=`<b>${y}</b> &middot; ${v.toLocaleString()} homestead entries`;
      bar.setAttribute("fill-opacity","1"); };
    const rst=()=>{ bar.setAttribute("fill-opacity", boom(y)?".85":".7"); };
    bar.addEventListener("mouseenter",show); bar.addEventListener("mouseleave",rst);
    bar.addEventListener("touchstart",show,{passive:true});
  });
  el("line",{x1:padL,y1:padT+plotH,x2:W-padR,y2:padT+plotH,stroke:C.grid,"stroke-width":1},s);
  [1874,1885,1896,1905,1911,1920,1930].forEach(y=>{
    const i=HS_DATA.findIndex(d=>d[0]===y); if(i<0) return;
    const x=padL+i*bw+bw/2;
    el("line",{x1:x,y1:padT+plotH,x2:x,y2:padT+plotH+4,stroke:"#7a5c3d","stroke-width":1},s);
    el("text",{x,y:H-14,"text-anchor":"middle","font-size":10,fill:"#7a5c3d"},s).textContent=y;
  });
  // peak callout
  const pi=HS_DATA.findIndex(d=>d[0]===1911);
  const px=padL+pi*bw+bw/2;
  el("text",{x:px,y:padT-2,"text-anchor":"middle","font-size":10,fill:C.cpr,"font-weight":"bold"},s).textContent="44,479";
}

// ---- Metes-and-bounds vs the rectangular grid ----------------------------
function drawMetesGrid(){
  const host=document.getElementById("metesDiag"); if(!host) return;
  const W=520,H=300,pad=14,gap=40,topG=28;
  const s=svgRoot(host,W,H);
  const side=(W-2*pad-gap)/2;
  // headings
  el("text",{x:pad+side/2,y:16,"text-anchor":"middle","font-size":13,fill:C.ink,"font-weight":"bold"},s).textContent="Metes & bounds";
  el("text",{x:pad+side+gap+side/2,y:16,"text-anchor":"middle","font-size":13,fill:C.ink,"font-weight":"bold"},s).textContent="Rectangular survey";
  // LEFT: irregular parcels following a river + ridge
  const x0=pad, y0=topG;
  el("rect",{x:x0,y:y0,width:side,height:side,fill:"#eadfc4","fill-opacity":.4,stroke:"#5c3a1e","stroke-width":2},s);
  const clip=el("clipPath",{id:"mclip"},s);
  el("rect",{x:x0,y:y0,width:side,height:side},clip);
  const g=el("g",{"clip-path":"url(#mclip)"},s);
  // a winding river
  const rv=`M${x0},${y0+side*0.62} C${x0+side*0.3},${y0+side*0.45} ${x0+side*0.45},${y0+side*0.9} ${x0+side*0.7},${y0+side*0.62} S${x0+side},${y0+side*0.5} ${x0+side},${y0+side*0.5}`;
  // irregular parcel polygons
  const polys=[
    [[0,0],[0.5,0],[0.46,0.34],[0.2,0.4],[0,0.3]],
    [[0.5,0],[1,0],[1,0.28],[0.7,0.4],[0.46,0.34]],
    [[0,0.3],[0.2,0.4],[0.34,0.66],[0.1,0.78],[0,0.7]],
    [[0.46,0.34],[0.7,0.4],[0.78,0.66],[0.5,0.7],[0.34,0.66]],
    [[0,0.7],[0.1,0.78],[0.34,0.66],[0.5,0.7],[0.45,1],[0,1]],
    [[0.78,0.66],[1,0.5],[1,1],[0.45,1],[0.5,0.7]]
  ];
  const tints=[C.settler,C.hbc,C.school,C.cpr,C.ssb,C.edgeSoft];
  polys.forEach((p,i)=>{
    const d="M"+p.map(q=>`${(x0+q[0]*side).toFixed(1)},${(y0+q[1]*side).toFixed(1)}`).join("L")+"Z";
    el("path",{d,fill:tints[i%tints.length],"fill-opacity":.22,stroke:"#7a4a1e","stroke-width":1},g);
  });
  el("path",{d:rv,fill:"none",stroke:C.water,"stroke-width":3,opacity:.7},g);
  // a couple of "witness tree" markers
  [[0.2,0.4],[0.7,0.4],[0.34,0.66]].forEach(q=>
    el("circle",{cx:x0+q[0]*side,cy:y0+q[1]*side,r:2.4,fill:"#3f6b2a"},g));
  el("text",{x:x0+side/2,y:y0+side+18,"text-anchor":"middle","font-size":11,fill:C.edge,"font-style":"italic"},s).textContent="trees, creeks, ridgelines";
  // RIGHT: clean grid
  const gx=pad+side+gap;
  gridSquares(s,gx,topG,side,6,{fill:C.school,fillOp:.06});
  el("text",{x:gx+side/2,y:topG+side+18,"text-anchor":"middle","font-size":11,fill:C.edge,"font-style":"italic"},s).textContent="identical squares, surveyed first";
}
