
const STORE_KEY = "performance_ibrida_v1_1";
let state = {};
try { state = JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); } catch(e) { state = {}; }

let view = "dashboard";
let activeMeso = 0;
let activeDay = 0;
let activeWeek = "W1";

const $ = (s) => document.querySelector(s);
const app = $("#app");

function save(){
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    localStorage.setItem(STORE_KEY + "_lastSave", new Date().toISOString());
  } catch(e) {
    console.warn("Save failed", e);
  }
}

function get(k){ return state[k] || ""; }
function set(k,v){ state[k] = v; save(); updateSaveStatus(); }
function k(parts){ return parts.join("__").replace(/\s+/g,"_"); }

function layout(content){
  app.innerHTML = `
    <div class="hero">
      <h1>${PROGRAM.appName}</h1>
      <p>${PROGRAM.subtitle} • v1.3</p>
      <div id="saveStatus" class="saveStatus">Salvataggio automatico attivo</div>
    </div>
    ${content}`;
  bindFields();
  updateSaveStatus();
}

function bindFields(){
  document.querySelectorAll("[data-key]").forEach(el => {
    const key = el.dataset.key;
    el.value = get(key);
    el.addEventListener("input", () => set(key, el.value));
    el.addEventListener("change", () => set(key, el.value));
  });
}

function updateSaveStatus(){
  const el = document.getElementById("saveStatus");
  if(!el) return;
  const last = localStorage.getItem(STORE_KEY + "_lastSave");
  if(!last){ el.textContent = "Nessun dato salvato"; return; }
  const d = new Date(last);
  el.textContent = "Salvato alle " + d.toLocaleTimeString("it-IT", {hour:"2-digit", minute:"2-digit"});
}

function currentPrefix(){
  const m = PROGRAM.mesocycles[activeMeso];
  const d = m.days[activeDay];
  return k([m.id, d.id, activeWeek]);
}

function renderDashboard(){
  const all = Object.entries(state).filter(([_,v]) => v !== "");
  const last = localStorage.getItem(STORE_KEY + "_lastSave");
  layout(`
    <div class="card">
      <h2>Dashboard</h2>
      <div class="grid">
        <div class="tile"><b>Settimana attiva</b><br>${activeWeek}</div>
        <div class="tile"><b>Dati salvati</b><br>${all.length}</div>
        <div class="tile"><b>Ultimo salvataggio</b><br>${last ? new Date(last).toLocaleString("it-IT") : "—"}</div>
        <div class="tile"><b>Bilancio</b><br>Dopo 8 settimane</div>
      </div>
    </div>
    <div class="card">
      <h2>Nota importante</h2>
      <p>Da questa versione durata, RPE seduta, peso e note sono salvati <b>per settimana</b>, non più solo per giorno.</p>
      <p>Usa il selettore settimana nella pagina Programma prima di compilare l’allenamento.</p>
    </div>
  `);
}

function renderProgram(){
  const mesoButtons = PROGRAM.mesocycles.map((m,i)=>`<button class="${i===activeMeso?'active':''}" onclick="activeMeso=${i};activeDay=0;renderProgram()">${m.title}</button>`).join("");
  const meso = PROGRAM.mesocycles[activeMeso];
  const dayButtons = meso.days.map((d,i)=>`<button class="${i===activeDay?'active':''}" onclick="activeDay=${i};renderProgram()">${d.title}</button>`).join("");
  const weekButtons = ["W1","W2","W3","W4","W5","W6","W7","W8"].map(w=>`<button class="${w===activeWeek?'active':''}" onclick="activeWeek='${w}';renderProgram()">${w}</button>`).join("");
  layout(`
    <div class="tabs">${mesoButtons}</div>
    <div class="card">
      <h2>${meso.title}</h2>
      <p>${meso.period} • ${meso.goal}</p>
    </div>
    <div class="subtabs">${dayButtons}</div>
    <div class="subtabs weekbar">${weekButtons}</div>
    ${renderWorkout(meso, meso.days[activeDay])}
  `);
}

function findWeekText(rows){
  // Mostra righe specifiche della settimana, intervalli tipo W1-2/W1-8
  // e righe non settimanali tipo "Min 1", "Min 2" usate nei conditioning.
  return rows.filter(r => {
    const wk = r[0];
    if (wk === activeWeek) return true;
    if (wk === "W1-8") return true;

    const n = Number(activeWeek.replace("W",""));
    const m = wk.match(/^W(\d+)-(\d+)$/);
    if (m) return n >= Number(m[1]) && n <= Number(m[2]);

    // Se la label non inizia con W, è una riga sempre valida
    // esempio: Min 1, Min 2, Note, Circuito.
    if (!wk.startsWith("W")) return true;

    return false;
  });
}

function renderWorkout(meso, day){
  const prefix = currentPrefix();
  return `
    <article class="workout">
      <div class="day-title"><h2>${day.title}</h2><p>${day.subtitle}</p></div>
      <div class="meta"><span>Obiettivo: ${day.goal}</span><span>${day.duration}</span></div>
      <div class="session">
        <input data-key="${k([prefix,'duration'])}" placeholder="Durata es. 1:22:47">
        <input data-key="${k([prefix,'session_rpe'])}" placeholder="RPE seduta">
        <input data-key="${k([prefix,'bodyweight'])}" placeholder="Peso corporeo">
        <textarea data-key="${k([prefix,'notes'])}" placeholder="Note seduta ${activeWeek}"></textarea>
      </div>
      ${day.blocks.map((b,bi)=>renderBlock(meso.id, day.id, b, bi)).join("")}
      <button class="primary wide" onclick="manualSave()">💾 Salva ora</button>
      <button class="secondary wide" onclick="generateSessionReport()">Genera report seduta</button>
    </article>
  `;
}

function renderBlock(mId, dId, b, bi){
  const rows = findWeekText(b.rows);
  const rowsHtml = rows.map((r,ri) => {
    const label = r[0], work = r[1];
    const deload = work.includes("Deload") ? "deload" : "";
    const rowKey = k([mId,dId,activeWeek,bi,ri,label]);
    return `
      <div class="row ${deload}">
        <span class="w">${label}</span><span>${work}</span>
        <input data-key="${rowKey}_load" placeholder="${b.unit || 'carico/note'}">
        <input data-key="${rowKey}_rpe" placeholder="RPE">
      </div>`;
  }).join("");
  return `
    <div class="exercise">
      <div class="ex-head ${b.kind}"><span class="name">${b.kind} | ${b.name}</span><span class="rec">REC. ${b.rec}</span></div>
      ${rowsHtml || `<div class="focus">Nessuna riga specifica per ${activeWeek}.</div>`}
      ${b.focus ? `<div class="focus">Focus: ${b.focus}</div>` : ""}
    </div>`;
}

function manualSave(){
  save();
  localStorage.setItem(STORE_KEY + "_save_test", "ok_" + Date.now()); alert("Dati salvati alle " + new Date().toLocaleTimeString("it-IT") + ". Se non restano dopo riapertura, il browser sta caricando una versione in cache.");
}

function generateSessionReport(){
  save();
  const m = PROGRAM.mesocycles[activeMeso];
  const d = m.days[activeDay];
  let lines = [`${m.title} - ${activeWeek} - ${d.title}`, ""];
  const prefix = currentPrefix();
  lines.push(`Durata: ${get(k([prefix,'duration'])) || "—"}`);
  lines.push(`RPE seduta: ${get(k([prefix,'session_rpe'])) || "—"}`);
  lines.push(`Peso: ${get(k([prefix,'bodyweight'])) || "—"}`);
  lines.push("");
  d.blocks.forEach((b,bi)=>{
    lines.push(`${b.name}`);
    findWeekText(b.rows).forEach((r,ri)=>{
      const rowKey = k([m.id,d.id,activeWeek,bi,ri,r[0]]);
      lines.push(`- ${r[0]} ${r[1]} | carico: ${get(rowKey+'_load') || "—"} | RPE: ${get(rowKey+'_rpe') || "—"}`);
    });
    lines.push("");
  });
  lines.push(`Note: ${get(k([prefix,'notes'])) || "—"}`);
  const report = lines.join("\n");
  view = "history";
  renderHistory(report);
}

function renderHistory(reportText){
  const text = reportText || JSON.stringify(state,null,2);
  layout(`
    <div class="card">
      <h2>Storico / Report</h2>
      <textarea class="report" id="report" readonly>${text}</textarea>
      <p><button class="primary" onclick="copyReport()">Copia report</button></p>
    </div>
  `);
}

function copyReport(){
  const txt = document.getElementById("report").value;
  navigator.clipboard?.writeText(txt);
  alert("Report copiato.");
}

function renderSettings(){
  layout(`
    <div class="card">
      <h2>Impostazioni</h2>
      <p>Se i dati non restano dopo la chiusura, verifica di usare il link GitHub Pages in Safari normale, non navigazione privata.</p>
      <button class="secondary" onclick="downloadBackup()">Scarica backup JSON</button>
      <button class="danger" onclick="resetAll()">Reset dati</button>
    </div>
  `);
}

function downloadBackup(){
  const blob = new Blob([JSON.stringify(state,null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "performance-ibrida-backup.json";
  a.click();
}

function resetAll(){
  if(confirm("Cancellare tutti i dati salvati?")){
    state = {};
    localStorage.removeItem(STORE_KEY);
    renderDashboard();
  }
}

document.querySelectorAll(".bottom-nav button").forEach(btn=>{
  btn.addEventListener("click",()=>{
    view = btn.dataset.view;
    if(view==="dashboard") renderDashboard();
    if(view==="program") renderProgram();
    if(view==="history") renderHistory();
    if(view==="settings") renderSettings();
  });
});

window.addEventListener("beforeunload", save);
document.addEventListener("visibilitychange", () => { if(document.hidden) save(); });

if ("serviceWorker" in navigator) { navigator.serviceWorker.register("sw.js").catch(()=>{}); }
renderDashboard();
