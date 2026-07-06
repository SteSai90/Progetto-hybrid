
const STORE_KEY = "performance_ibrida_v1";
let state = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
let view = "dashboard";
let activeMeso = 0;
let activeDay = 0;

const $ = (s) => document.querySelector(s);
const app = $("#app");

function save(){ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
function key(parts){ return parts.join("__").replace(/\s+/g,"_"); }
function val(k){ return state[k] || ""; }
function set(k,v){ state[k]=v; save(); updateDashboardStats(); }

function layout(title, content){
  app.innerHTML = `<div class="hero"><h1>${PROGRAM.appName}</h1><p>${PROGRAM.subtitle}</p></div>${content}`;
  document.querySelectorAll(".field").forEach(el=>{
    const k=el.dataset.key; el.value=val(k);
    el.addEventListener("input",()=>set(k,el.value));
  });
}

function renderDashboard(){
  const entries = Object.entries(state).filter(([k,v])=>v);
  const lastDuration = entries.find(([k])=>k.includes("duration"))?.[1] || "—";
  const lastRpe = entries.find(([k])=>k.includes("session_rpe"))?.[1] || "—";
  layout("Home", `
    <div class="card">
      <h2>Dashboard</h2>
      <div class="grid">
        <div class="tile"><b>Ultima durata</b><br><span id="dashDuration">${lastDuration}</span></div>
        <div class="tile"><b>Ultimo RPE</b><br><span id="dashRpe">${lastRpe}</span></div>
        <div class="tile"><b>Dati salvati</b><br>${entries.length}</div>
        <div class="tile"><b>Prossimo step</b><br>Completa 8 settimane e bilancio</div>
      </div>
    </div>
    <div class="card">
      <h2>Regole</h2>
      <p><b>Fondamentali:</b> progressione programmata + autoregolazione. Se chiudi almeno 0,5 RPE sotto target, aumenta nella seduta successiva.</p>
      <p><b>Accessori:</b> aumenta solo quando completi tutte le serie al RPE target con esecuzione pulita.</p>
      <table><tr><th>RPE</th><th>%1RM</th><th>RIR</th></tr>${PROGRAM.rpe.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join("")}</table>
    </div>`);
}

function renderProgram(){
  const mesoButtons = PROGRAM.mesocycles.map((m,i)=>`<button class="${i===activeMeso?'active':''}" onclick="activeMeso=${i};activeDay=0;renderProgram()">${m.title}</button>`).join("");
  const meso = PROGRAM.mesocycles[activeMeso];
  const dayButtons = meso.days.map((d,i)=>`<button class="${i===activeDay?'active':''}" onclick="activeDay=${i};renderProgram()">${d.title}</button>`).join("");
  layout("Programma", `
    <div class="tabs">${mesoButtons}</div>
    <div class="card"><h2>${meso.title}</h2><p>${meso.period} • ${meso.goal}</p></div>
    <div class="subtabs">${dayButtons}</div>
    ${renderWorkout(meso, meso.days[activeDay])}`);
}

function renderWorkout(meso, day){
  const mId=meso.id, dId=day.id;
  return `<article class="workout">
    <div class="day-title"><h2>${day.title}</h2><p>${day.subtitle}</p></div>
    <div class="meta"><span>Obiettivo: ${day.goal}</span><span>${day.duration}</span></div>
    <div class="session">
      <input class="field" data-key="${key([mId,dId,'duration'])}" placeholder="Durata es. 1:22:47">
      <input class="field" data-key="${key([mId,dId,'session_rpe'])}" placeholder="RPE seduta">
      <input class="field" data-key="${key([mId,dId,'bodyweight'])}" placeholder="Peso corporeo">
      <textarea class="field" data-key="${key([mId,dId,'notes'])}" placeholder="Note seduta"></textarea>
    </div>
    ${day.blocks.map((b,bi)=>renderBlock(mId,dId,b,bi)).join("")}
  </article>`;
}

function renderBlock(mId,dId,b,bi){
  return `<div class="exercise">
    <div class="ex-head ${b.kind}"><span class="name">${b.kind} | ${b.name}</span><span class="rec">REC. ${b.rec}</span></div>
    ${b.rows.map((r,ri)=>{
      const deload = r[1].includes("Deload") ? "deload" : "";
      const base = key([mId,dId,bi,ri]);
      return `<div class="row ${deload}">
        <span class="w">${r[0]}</span><span>${r[1]}</span>
        <input class="field" data-key="${base}_load" placeholder="${b.unit || 'carico/note'}">
        <input class="field" data-key="${base}_rpe" placeholder="RPE">
      </div>`;
    }).join("")}
    ${b.focus ? `<div class="focus">Focus: ${b.focus}</div>` : ""}
  </div>`;
}

function renderHistory(){
  layout("Storico", `
    <div class="card">
      <h2>Export dati</h2>
      <p>Questi dati sono salvati nel browser del dispositivo. Copiali periodicamente come backup.</p>
      <textarea class="report" id="report" readonly>${JSON.stringify(state,null,2)}</textarea>
      <p><button class="primary" onclick="copyReport()">Copia report</button></p>
    </div>`);
}
function copyReport(){ navigator.clipboard?.writeText($("#report").value); alert("Report copiato."); }

function renderSettings(){
  layout("Impostazioni", `
    <div class="card">
      <h2>Impostazioni</h2>
      <button class="secondary" onclick="downloadBackup()">Scarica backup JSON</button>
      <button class="danger" onclick="resetAll()">Reset dati</button>
    </div>`);
}
function downloadBackup(){
  const blob = new Blob([JSON.stringify(state,null,2)], {type:"application/json"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "performance-ibrida-backup.json"; a.click();
}
function resetAll(){ if(confirm("Cancellare tutti i dati salvati?")){state={};save();renderDashboard();} }
function updateDashboardStats(){}

document.querySelectorAll(".bottom-nav button").forEach(btn=>{
  btn.addEventListener("click",()=>{
    view=btn.dataset.view;
    if(view==="dashboard") renderDashboard();
    if(view==="program") renderProgram();
    if(view==="history") renderHistory();
    if(view==="settings") renderSettings();
  });
});

if ("serviceWorker" in navigator) { navigator.serviceWorker.register("sw.js").catch(()=>{}); }
renderDashboard();
