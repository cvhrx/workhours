// BUILD: MOBILE_PDF_OK
const $ = s => document.querySelector(s);
const pad2 = n => String(n).padStart(2,'0');
const fmtIT = iso => { const [y,m,d] = iso.split('-'); return `${d}/${m}/${y}`; };

const state = { user:null, company:{}, clients:[], tariffs:{ord:12,str:25,km:0.4,trasf:50,pern:80,strFest:35} };

const auth = firebase.auth();
const db   = firebase.firestore();

auth.onAuthStateChanged(async (u)=>{
  if(u){
    state.user = u;
    $('#authCard').classList.add('hidden');
    $('#app').classList.remove('hidden');
    initApp();
  }else{
    $('#authCard').classList.remove('hidden');
    $('#app').classList.add('hidden');
  }
});

document.addEventListener('DOMContentLoaded', ()=>{
  $('#btnShowRegister').onclick = ()=> $('#registerBox').classList.toggle('hidden');
  $('#btnCancelRegister').onclick = ()=> $('#registerBox').classList.add('hidden');

  $('#btnLogin').onclick = async ()=>{
    try{
      const email=$('#loginEmail').value.trim(); const pass=$('#loginPass').value;
      if(!email||!pass){ alert('Inserisci email e password'); return; }
      await auth.signInWithEmailAndPassword(email, pass);
    }catch(e){ console.error('LOGIN ERROR', e); alert(e.message||e.code); }
  };
  $('#btnDoRegister').onclick = async ()=>{
    try{
      const email=$('#regEmail').value.trim(); const pass=$('#regPass').value;
      if(!email||!pass){ alert('Email e password richieste'); return; }
      const cred = await auth.createUserWithEmailAndPassword(email, pass);
      await db.collection('users').doc(cred.user.uid).set({
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        company: {
          ragione: $('#regRagione').value || '',
          piva: $('#regPiva').value || '',
          indirizzo: $('#regIndirizzo').value || '',
          telefono: $('#regTelefono').value || '',
          email: $('#regEmailAzi').value || '',
          sdi: $('#regSdi').value || ''
        },
        tariffs: state.tariffs
      }, { merge: true });
      alert('Registrazione completata');
      $('#registerBox').classList.add('hidden');
    }catch(e){ console.error('REG ERROR', e); alert(e.message||e.code); }
  };

  $('#chipTrasf').onclick = ()=> $('#chipTrasf').classList.toggle('active');
  $('#chipPern').onclick  = ()=> $('#chipPern').classList.toggle('active');
  setupTravelControls();
  const settingsBtn = document.getElementById('btnSettings');
  if(settingsBtn) settingsBtn.onclick = ()=> showMainPage('settingsPage');
  const closeSettings = document.getElementById('closeSettings');
  if(closeSettings) closeSettings.onclick = ()=> document.getElementById('settingsDlg')?.close();
  const tabTar = document.getElementById('tabTar');
  if(tabTar) tabTar.onclick = ()=> togglePane('Tar');
  const tabCli = document.getElementById('tabCli');
  if(tabCli) tabCli.onclick = ()=> togglePane('Cli');
  const saveTarBtn = document.getElementById('btnSaveTar');
  if(saveTarBtn) saveTarBtn.onclick = saveTariffs;
  const tsel = document.getElementById('tarClientSelect');
  if(tsel){ tsel.onchange = ()=> loadTariffsSelection(); }

  const addBtn = document.getElementById('btnAddCli');
  if(addBtn) addBtn.classList.add('hidden');
  const delCliBtn = document.getElementById('btnDelCli');
  if(delCliBtn) delCliBtn.onclick = delClient;
  const saveCliBtn = document.getElementById('btnSaveCli');
  if(saveCliBtn) saveCliBtn.onclick = saveClientUpsert;
  const newCliBtn = document.getElementById('btnNewCli');
  if(newCliBtn) newCliBtn.onclick = ()=>{ const sel=document.getElementById('cliSelect'); if(sel) sel.value='-1'; clearClientForm(); };
  const dupBtn = document.getElementById('btnDupYesterday');
  if(dupBtn) dupBtn.onclick = duplicateYesterday;
  $('#btnSaveDay').onclick = saveDay;
  $('#btnExportPdf').onclick = exportPdf;
  const tabList = document.getElementById('tabList');
  if(tabList) tabList.onclick = ()=> switchView('list');
  const tabCal = document.getElementById('tabCal');
  if(tabCal) tabCal.onclick  = ()=> switchView('cal');
  $('#closeDayDlg').onclick = ()=> $('#dayDlg').close();
  initShellNav();
});

function initShellNav(){
  document.querySelectorAll('[data-page]').forEach(btn=>{
    btn.addEventListener('click',()=>showMainPage(btn.dataset.page));
  });
  document.querySelectorAll('[data-page-jump]').forEach(btn=>{
    btn.addEventListener('click',()=>showMainPage(btn.dataset.pageJump));
  });
  document.querySelectorAll('[data-action="settings"]').forEach(btn=>btn.addEventListener('click',()=>showMainPage('settingsPage')));
  document.querySelectorAll('[data-action="clients"]').forEach(btn=>btn.addEventListener('click',()=>showMainPage('clientiPage')));
  document.querySelectorAll('[data-action="export"]').forEach(btn=>btn.addEventListener('click',()=>exportPdf()));
  const logout = ()=> auth.signOut();
  const b1=document.getElementById('btnLogout'); if(b1) b1.onclick=logout;
  const b2=document.getElementById('btnLogoutMobile'); if(b2) b2.onclick=logout;
}

function showMainPage(pageId){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('page-active'));
  const p=document.getElementById(pageId);
  if(p) p.classList.add('page-active');
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active', b.dataset.page===pageId));
  const titles={dashboardPage:'Dashboard',rapportiniPage:'Rapportini',calendarioPage:'Calendario',clientiPage:'Clienti',pdfPage:'Riepiloghi / PDF',finanzePage:'Finanze',settingsPage:'Impostazioni'};
  const title=document.getElementById('pageTitle'); if(title) title.textContent=titles[pageId]||'WorkHours';
  if(pageId==='calendarioPage'){
    const dp=document.getElementById('dayPicker');
    if(dp && dp.value && typeof loadMonth==='function') loadMonth(dp.value.slice(0,7));
  }
}

function syncMobileDate(){
  const d=document.getElementById('dayPicker');
  const m=document.getElementById('dayPickerMobile');
  if(!d || !m) return;
  if(!m.value) m.value=d.value;
  m.onchange=async ()=>{ d.value=m.value; await loadDay(d.value); await loadMonth(d.value.slice(0,7)); };
  d.addEventListener('change',()=>{ m.value=d.value; });
}


function setupTravelControls(){
  document.querySelectorAll('.work-mode-chip').forEach(btn=>{
    btn.addEventListener('click',()=> setWorkMode(btn.dataset.workMode || 'locale'));
  });
  document.querySelectorAll('.travel-vehicle-chip').forEach(btn=>{
    btn.addEventListener('click',()=> setTravelVehicle(btn.dataset.travelVehicle || 'auto'));
  });
  setWorkMode(getWorkMode());
  setTravelVehicle(getTravelVehicle());
}

function getWorkMode(){
  return document.querySelector('.work-mode-chip.active')?.dataset.workMode || 'locale';
}

function getTravelVehicle(){
  return document.querySelector('.travel-vehicle-chip.active')?.dataset.travelVehicle || 'auto';
}

function setWorkMode(mode){
  mode = ['locale','italia','estero'].includes(mode) ? mode : 'locale';
  document.querySelectorAll('.work-mode-chip').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.workMode === mode);
  });
  const travelOptions = document.getElementById('travelOptions');
  if(travelOptions){
    travelOptions.classList.toggle('hidden', mode === 'locale');
  }
  // Locale: niente mezzo e niente ore viaggio
  if(mode === 'locale'){
    const travelH = document.getElementById('travelH');
    if(travelH) travelH.value = '0';
  }
}

function setTravelVehicle(vehicle){
  vehicle = ['auto','aereo','mezzo_fornito'].includes(vehicle) ? vehicle : 'auto';
  document.querySelectorAll('.travel-vehicle-chip').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.travelVehicle === vehicle);
  });
}

function getTravelHoursForPayload(){
  const mode = getWorkMode();
  if(mode === 'locale') return 0;
  const n = parseFloat((document.getElementById('travelH')?.value || '0').toString().replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function applyTravelFields(v){
  const mode = v?.workMode || (v?.trasf ? 'italia' : 'locale');
  setWorkMode(mode);
  setTravelVehicle(v?.travelVehicle || 'auto');
  const travelH = document.getElementById('travelH');
  if(travelH) travelH.value = (mode === 'locale') ? '0' : (v?.travelH ?? 0);
}

function updateDashboard(arr){
  const filled=arr.filter(v=>(v.totalH||0)>0 || (v.km||0)>0 || v.note);
  const ord=arr.reduce((s,v)=>s+(v.ordH||0),0);
  const str=arr.reduce((s,v)=>s+(v.strH||0),0);
  const travel=arr.reduce((s,v)=>s+(v.travelH||0),0);
  const km=arr.reduce((s,v)=>s+(v.km||0),0);
  const total=ord+str+travel;
  const t=state.tariffs || {ord:0,str:0,km:0,trasf:0,pern:0};
  const stimato = (ord*(t.ord||0)) + (str*(t.str||0)) + (km*(t.km||0));
  const set=(id,val)=>{const el=document.getElementById(id); if(el) el.textContent=val;};
  set('dashOreMese', total.toFixed(1)+'h');
  set('dashKmMese', Math.round(km));
  set('dashGiornate', filled.length);
  set('dashClienti', (state.clients||[]).filter(c=>!isEmptyClient(c)).length);
  set('dashTotaleStimato', '€' + stimato.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2}));
  set('dashOrd', ord.toFixed(1)+'h');
  set('dashStr', str.toFixed(1)+'h');
  set('dashTravel', travel.toFixed(1)+'h');
  set('dashDonutTotal', total.toFixed(1)+'h');
  set('dashOrdMini', ord.toFixed(1)+'h');
  set('dashStrMini', str.toFixed(1)+'h');
  set('dashTravelMini', travel.toFixed(1)+'h');
  const donut=document.getElementById('dashDonut');
  if(donut){
    const a=total?ord/total*360:0; const b=total?travel/total*360:0;
    donut.style.background=`conic-gradient(var(--primary) 0deg ${a}deg, #38bdf8 ${a}deg ${a+b}deg, #f97316 ${a+b}deg 360deg)`;
  }
  updatePdfPreview(arr, {ord, str, travel, km, total, filled, stimato});
}

function updatePdfPreview(arr, summary){
  const set=(id,val)=>{const el=document.getElementById(id); if(el) el.textContent=val;};
  const euro=v=>'€'+(v||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  const dp=document.getElementById('dayPicker');
  const ym=(dp && dp.value ? dp.value.slice(0,7) : new Date().toISOString().slice(0,7));
  try{
    const [yy,mm]=ym.split('-').map(Number);
    set('pdfPreviewMonth', new Date(yy, mm-1, 1).toLocaleDateString('it-IT',{month:'long',year:'numeric'}));
  }catch(_){ set('pdfPreviewMonth', ym); }
  set('pdfPreviewOre', (summary.total||0).toFixed(1)+'h');
  set('pdfPreviewKm', Math.round(summary.km||0));
  set('pdfPreviewGiorni', summary.filled?.length || 0);
  set('pdfPreviewTotale', euro(summary.stimato||0));

  const tbody=document.getElementById('pdfClientPreviewRows');
  if(!tbody) return;
  const t=state.tariffs || {ord:0,str:0,km:0};
  const groups={};
  (arr||[]).forEach(v=>{
    const compiled=(v.totalH||0)>0 || (v.ordH||0)>0 || (v.strH||0)>0 || (v.km||0)>0 || v.note;
    if(!compiled) return;
    const idx=(v.clientIndex==null ? -1 : v.clientIndex);
    const name=idx>=0 ? (state.clients?.[idx]?.ragione || ('Cliente '+(idx+1))) : 'Senza cliente';
    if(!groups[name]) groups[name]={ore:0,km:0,stimato:0};
    groups[name].ore += (v.totalH||v.ordH||0) + (v.strH||0);
    groups[name].km += v.km||0;
    const ct = idx>=0 && state.clients?.[idx]?.tariffs ? state.clients[idx].tariffs : t;
    groups[name].stimato += (v.ordH||0)*(ct.ord||0) + (v.strH||0)*(ct.str||0) + (v.km||0)*(ct.km||0);
  });
  const rows=Object.entries(groups).sort((a,b)=>b[1].stimato-a[1].stimato);
  if(!rows.length){
    tbody.innerHTML='<tr><td colspan="4">Nessun dato disponibile</td></tr>';
    return;
  }
  tbody.innerHTML=rows.map(([name,g])=>`<tr><td>${name}</td><td>${g.ore.toFixed(1)}h</td><td>${Math.round(g.km)}</td><td>${euro(g.stimato)}</td></tr>`).join('');
}

function numVal(id, fallback=0){
  const el = document.getElementById(id);
  const n = parseFloat((el?.value ?? '').toString().replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}
function setVal(id, value){
  const el = document.getElementById(id);
  if(el) el.value = (value ?? '');
}
function setSelectVal(id, value){
  const el = document.getElementById(id);
  if(el && value) el.value = value;
}
function setTariffInputs(t){
  t = t || {};
  const loc = t.locale || {};
  const it = t.italy || {};
  const ab = t.abroad || {};

  const locOrd = loc.ord ?? t.ord ?? 0;
  const locKm = loc.km ?? t.km ?? 0;
  const locOver = loc.overtimePct ?? (locOrd ? Math.max(0, (((t.str ?? locOrd) / locOrd) - 1) * 100) : 25);
  const locHol = loc.holidayPct ?? (locOrd ? Math.max(0, (((t.strFest ?? locOrd) / locOrd) - 1) * 100) : 25);

  setVal('tarOrd', locOrd);
  setVal('tarKm', locKm);
  setVal('tarLocOverPct', Math.round(locOver*100)/100);
  setVal('tarLocHolidayPct', Math.round(locHol*100)/100);

  const itTravelDay = it.travelDay ?? it.hotel ?? t.pern ?? t.trasf ?? 0;
  setVal('tarItOrd', it.ord ?? t.ord ?? 0);
  setVal('tarItKm', it.km ?? t.km ?? 0);
  setVal('tarPern', itTravelDay);
  setSelectVal('tarItTravelMode', it.travelMode || 'none');
  setVal('tarItTravelPct', it.travelPct ?? 75);
  setVal('tarItTravelFixed', it.travelFixed ?? 0);
  setVal('tarItOverPct', it.overtimePct ?? locOver ?? 25);
  setVal('tarItHolidayPct', it.holidayPct ?? locHol ?? 25);

  const abTravelDay = ab.travelDay ?? ab.hotel ?? t.pern ?? t.trasf ?? 0;
  setVal('tarAbroadOrd', ab.ord ?? t.strFest ?? t.ord ?? 0);
  setVal('tarAbroadKm', ab.km ?? t.km ?? 0);
  setVal('tarAbroadPern', abTravelDay);
  setSelectVal('tarAbroadTravelMode', ab.travelMode || 'none');
  setVal('tarAbroadTravelPct', ab.travelPct ?? 75);
  setVal('tarAbroadTravelFixed', ab.travelFixed ?? 0);
  setVal('tarAbroadOverPct', ab.overtimePct ?? locOver ?? 25);
  setVal('tarAbroadHolidayPct', ab.holidayPct ?? locHol ?? 25);
}

function getTariffInputs(){
  const locOrd = numVal('tarOrd');
  const locKm = numVal('tarKm');
  const locOverPct = numVal('tarLocOverPct', 25);
  const locHolidayPct = numVal('tarLocHolidayPct', 25);
  const legacyStr = locOrd * (1 + locOverPct / 100);
  const legacyStrFest = locOrd * (1 + locHolidayPct / 100);

  return {
    ord: locOrd,
    str: legacyStr,
    strFest: legacyStrFest,
    km: locKm,
    trasf: 0,
    pern: numVal('tarPern'),
    locale: {
      ord: locOrd,
      km: locKm,
      overtimePct: locOverPct,
      holidayPct: locHolidayPct
    },
    italy: {
      ord: numVal('tarItOrd', locOrd),
      km: numVal('tarItKm', locKm),
      travelDay: numVal('tarPern'),
      hotel: numVal('tarPern'),
      travelMode: document.getElementById('tarItTravelMode')?.value || 'none',
      travelPct: numVal('tarItTravelPct', 75),
      travelFixed: numVal('tarItTravelFixed', 0),
      overtimePct: numVal('tarItOverPct', locOverPct),
      holidayPct: numVal('tarItHolidayPct', locHolidayPct)
    },
    abroad: {
      ord: numVal('tarAbroadOrd', locOrd),
      km: numVal('tarAbroadKm', locKm),
      travelDay: numVal('tarAbroadPern'),
      hotel: numVal('tarAbroadPern'),
      travelMode: document.getElementById('tarAbroadTravelMode')?.value || 'none',
      travelPct: numVal('tarAbroadTravelPct', 75),
      travelFixed: numVal('tarAbroadTravelFixed', 0),
      overtimePct: numVal('tarAbroadOverPct', locOverPct),
      holidayPct: numVal('tarAbroadHolidayPct', locHolidayPct)
    }
  };
}

function renderTarClientSelect(){
  const sel = document.getElementById('tarClientSelect');
  if(!sel) return;
  const cur = sel.value ?? '-1';
  const opts = ['<option value="-1">Globali (default)</option>','<option value="-2">Senza cliente</option>']
    .concat((state.clients||[]).map((c,i)=>({c,i})).filter(x=>!isEmptyClient(x.c))
      .map(x=>`<option value="${x.i}">${x.c.ragione || ('Cliente '+(x.i+1))}</option>`));
  sel.innerHTML = opts.join('');
  // mantieni selezione se possibile
  if([...sel.options].some(o=>o.value===cur)) sel.value = cur;
}

function loadTariffsSelection(){
  const sel = document.getElementById('tarClientSelect');
  if(!sel) return;
  const v = parseInt(sel.value,10);
  if(isNaN(v) || v === -1){
    setTariffInputs(state.tariffs || {});
    return;
  }
  if(v === -2){
    setTariffInputs(state.tariffsNoClient || state.tariffs || {});
    return;
  }
  const c = state.clients?.[v];
  setTariffInputs((c && c.tariffs) ? c.tariffs : (state.tariffs||{}));
}

function syncTariffSelectionToClient(i){
  const sel = document.getElementById('tarClientSelect');
  if(!sel) return;
  if(i >= 0 && [...sel.options].some(o=>o.value===String(i))){
    sel.value = String(i);
    loadTariffsSelection();
  }
}
function togglePane(which){
  const tar = which==='Tar';
  const paneTariffe=document.getElementById('paneTariffe');
  const paneClienti=document.getElementById('paneClienti');
  const tabTar=document.getElementById('tabTar');
  const tabCli=document.getElementById('tabCli');
  if(paneTariffe) paneTariffe.classList.toggle('hidden', !tar);
  if(paneClienti) paneClienti.classList.toggle('hidden', tar);
  if(tabTar) tabTar.classList.toggle('active', tar);
  if(tabCli) tabCli.classList.toggle('active', !tar);
}

function switchView(which){
  if(which==='cal'){
    const dp = $('#dayPicker');
    if(dp && dp.value) loadMonth(dp.value.slice(0,7));
    $('#tabCal').classList.add('active'); $('#tabList').classList.remove('active');
    $('#calView').classList.remove('hidden'); $('#listView').classList.add('hidden');
  }else{
    $('#tabList').classList.add('active'); $('#tabCal').classList.remove('active');
    $('#listView').classList.remove('hidden'); $('#calView').classList.add('hidden');
  }
}

function buildTimeSelectors(){
  const hours = Array.from({length:24},(_,i)=>pad2(i));
  const mins  = ['00','15','30','45'];
  [['#in1h','#in1m'],['#out1h','#out1m'],['#in2h','#in2m'],['#out2h','#out2m']].forEach(([hSel,mSel])=>{
    document.querySelector(hSel).innerHTML = hours.map(h=>'<option>'+h+'</option>').join('');
    document.querySelector(mSel).innerHTML = mins.map(m=>'<option>'+m+'</option>').join('');
  });
}

function timeDiff(a,b){
  if(!a||!b) return 0;
  const [ah,am]=a.split(':').map(Number), [bh,bm]=b.split(':').map(Number);
  const d=((bh*60+bm)-(ah*60+am))/60;
  return Math.max(0, d);
}
function getPayload(){
  const h=(sel)=>document.querySelector(sel).value;
  const mk = (hh,mm)=> (hh+':'+mm);
  const in1 = mk(h('#in1h'),h('#in1m'));
  const out1= mk(h('#out1h'),h('#out1m'));
  const in2 = mk(h('#in2h'),h('#in2m'));
  const out2= mk(h('#out2h'),h('#out2m'));
  const seg1 = timeDiff(in1,out1);
  const seg2 = timeDiff(in2,out2);
  const total = (seg1+seg2);
  const ord = Math.min(8, total);
  const str = Math.max(0, total-8);
  const clientIndex = Math.max(-1, (document.getElementById('clientSelect').selectedIndex||0) - 1);
  return {
    in1, out1, in2, out2,
    ordH: Number(ord.toFixed(2)),
    strH: Number(str.toFixed(2)),
    totalH: Number(total.toFixed(2)),
    km: parseFloat(document.getElementById('km').value||'0')||0,
    workMode: getWorkMode(),
    travelVehicle: getWorkMode() === 'locale' ? '' : getTravelVehicle(),
    travelH: Number(getTravelHoursForPayload().toFixed(2)),
    trasf: document.getElementById('chipTrasf').classList.contains('active') || getWorkMode() !== 'locale',
    pern:  document.getElementById('chipPern').classList.contains('active'),
    trasfertaNonLavorata: document.getElementById('chipPern').classList.contains('active'),
    note: document.getElementById('note').value||'',
    clientIndex
  };
}

async function initApp(){
  buildTimeSelectors();
  await loadClientsAndTariffs();

  const cliSel = document.getElementById('cliSelect');
  if(cliSel){
    cliSel.onchange = ()=>{
      const i = getSelectedClientIndex();
      if(i>=0) fillClientForm(i);
      else clearClientForm();
    };
  }
  if((state.clients||[]).length>0){
    if(cliSel) cliSel.value = '0';
    fillClientForm(0);
  } else {
    if(cliSel) cliSel.value = '-1';
    clearClientForm();
  }


  const dp = document.getElementById('dayPicker');
  const today = new Date().toISOString().slice(0,10);
  dp.value = dp.value || today;
  syncMobileDate();
  dp.addEventListener('change', async e=>{
    await loadDay(e.target.value);
    await loadMonth(e.target.value.slice(0,7));
    const dm=document.getElementById('dashMonth');
    if(dm) dm.value=e.target.value.slice(0,7);
  });

  const dm=document.getElementById('dashMonth');
  if(dm){
    dm.value=dp.value.slice(0,7);
    dm.onchange=async ()=>{
      if(!dm.value) return;
      const day=dm.value+'-01';
      dp.value=day;
      const mobile=document.getElementById('dayPickerMobile');
      if(mobile) mobile.value=day;
      await loadDay(day);
      await loadMonth(dm.value);
    };
  }

  await loadDay(dp.value);
  await loadMonth(dp.value.slice(0,7));
}

async function loadClientsAndTariffs(){
  const uref = db.collection('users').doc(state.user.uid);
  const ut = await uref.get();
  if(ut.exists){
    const data = ut.data();
    state.tariffs = data.tariffs || state.tariffs;
    state.company = data.company || {};
    state.tariffsNoClient = data.tariffsNoClient || null;
    setTariffInputs(state.tariffs);
  }
  const cs = await uref.collection('clients').get();
  state.clients = cs.docs.map(d=>({id:d.id, ...d.data()}));
  renderClients();
  renderTarClientSelect();
  loadTariffsSelection();
}

function isEmptyClient(c){
  if(!c) return true;
  return !(c.ragione||c.piva||c.email||c.tel||c.indirizzo||c.sdi);
}

function getNoClientIndex(){
  return (state.clients||[]).findIndex(isEmptyClient);
}


function clientInitials(c, fallback){
  const name = (c && (c.ragione || c.email || c.piva)) || fallback || 'WH';
  return String(name).trim().split(/\s+/).slice(0,2).map(s=>s[0]||'').join('').toUpperCase() || 'WH';
}

function updateClientHero(i){
  const c = i>=0 ? state.clients?.[i] : null;
  const nameEl=document.getElementById('clientNameHero');
  const subEl=document.getElementById('clientSubHero');
  const avEl=document.getElementById('clientAvatar');
  if(nameEl) nameEl.textContent = c?.ragione || 'Nuovo cliente';
  if(subEl) subEl.textContent = c ? ((c.piva ? 'P.IVA: '+c.piva : 'Cliente salvato') + (c.email ? ' · '+c.email : '')) : 'Compila i dati principali e salva.';
  if(avEl) avEl.textContent = clientInitials(c, 'WH');
}

function renderClients(){
  const selDay  = document.getElementById('clientSelect'); // usato in Compila giornata (clientIndex numerico)
  const selSet  = document.getElementById('cliSelect');    // usato in Clienti (usa ID Firestore)
  const rowsBox = document.getElementById('clientDirectoryRows');

  const real = (state.clients||[]).map((c,i)=>({c,i})).filter(x=>!isEmptyClient(x.c));

  const optsDay = real
    .map(x=>'<option value="'+x.i+'">'+(x.c.ragione||('Cliente '+(x.i+1)))+'</option>').join('');

  const optsSet = real
    .map(x=>'<option value="'+(x.c.id||x.i)+'">'+(x.c.ragione||('Cliente '+(x.i+1)))+'</option>').join('');

  if(selDay){ selDay.innerHTML = '<option>—</option>' + optsDay; }

  if(selSet){
    const oldValue = selSet.value;
    selSet.innerHTML = '<option value="-1">➕ Nuovo cliente</option>' + optsSet;

    if(![...selSet.options].some(o=>o.value==='-1')){
      const o=document.createElement('option');
      o.value='-1';
      o.textContent='➕ Nuovo cliente';
      selSet.insertBefore(o, selSet.firstChild);
    }
    if([...selSet.options].some(o=>o.value===oldValue)) selSet.value = oldValue;
  }

  if(rowsBox){
    if(real.length===0){
      rowsBox.innerHTML = '<div class="client-empty-row">Nessun cliente caricato</div>';
    }else{
      rowsBox.innerHTML = real.map(x=>{
        const c=x.c;
        const value=String(c.id||x.i);
        return `<button type="button" class="client-row" data-client-value="${value}">
          <span class="client-row-avatar">${clientInitials(c,'CL')}</span>
          <span><strong>${c.ragione || ('Cliente '+(x.i+1))}</strong><em>${c.email || c.piva || 'Dati cliente'}</em></span>
        </button>`;
      }).join('');
      rowsBox.querySelectorAll('[data-client-value]').forEach(btn=>{
        btn.addEventListener('click',()=>{
          if(selSet){ selSet.value = btn.dataset.clientValue; }
          const i=getSelectedClientIndex();
          if(i>=0) fillClientForm(i); else clearClientForm();
          rowsBox.querySelectorAll('.client-row').forEach(b=>b.classList.toggle('active', b===btn));
          updateClientHero(i);
        });
      });
    }
  }

  renderTarClientSelect();
  updateClientHero(getSelectedClientIndex());
}

function getSelectedClientIndex(){
  const sel = document.getElementById('cliSelect');
  if(!sel) return -1;
  const v = sel.value;
  if(v === '-1') return -1;
  // Prefer mapping by Firestore doc id (stable)
  const idxById = (state.clients||[]).findIndex(c=>String(c.id||'') === String(v));
  if(idxById >= 0) return idxById;
  // Fallback legacy: numeric index
  const i = parseInt(v,10);
  return isNaN(i) ? -1 : i;
}

function clearClientForm(){
  document.getElementById('cliRagione').value = '';
  document.getElementById('cliPiva').value = '';
  document.getElementById('cliEmail').value = '';
  document.getElementById('cliTel').value = '';
  document.getElementById('cliIndirizzo').value = '';
  document.getElementById('cliSdi').value = '';
  updateClientHero(-1);
}

function fillClientForm(i){
  const c = state.clients?.[i];
  document.getElementById('cliRagione').value = c?.ragione || '';
  document.getElementById('cliPiva').value = c?.piva || '';
  document.getElementById('cliEmail').value = c?.email || '';
  document.getElementById('cliTel').value = c?.tel || '';
  document.getElementById('cliIndirizzo').value = c?.indirizzo || '';
  document.getElementById('cliSdi').value = c?.sdi || '';
  updateClientHero(i);
  syncTariffSelectionToClient(i);
}

function readClientForm(){
  return {
    ragione: document.getElementById('cliRagione').value || '',
    piva: document.getElementById('cliPiva').value || '',
    email: document.getElementById('cliEmail').value || '',
    tel: document.getElementById('cliTel').value || '',
    indirizzo: document.getElementById('cliIndirizzo').value || '',
    sdi: document.getElementById('cliSdi').value || ''
  };
}



async function saveClientUpsert(){
  const i = getSelectedClientIndex();
  const data = readClientForm();

  // blocca clienti vuoti
  if(isEmptyClient(data)){
    alert('Compila almeno Ragione sociale o P.IVA (cliente vuoto non salvabile)');
    return;
  }

  const col = db.collection('users').doc(state.user.uid).collection('clients');

  // update existing
  if(i >= 0 && state.clients?.[i]){
    Object.assign(state.clients[i], data);
    if(state.clients[i].id){
      await col.doc(state.clients[i].id).set(data, {merge:true});
    }else{
      const ref = await col.add(data);
      state.clients[i].id = ref.id;
    }
    renderClients();
    // mantieni selezione
    const sel = document.getElementById('cliSelect');
    if(sel && state.clients[i].id) sel.value = state.clients[i].id;
    alert('Salvataggio effettuato');
    return;
  }

  // create new
  data.tariffs = data.tariffs || (state.tariffs ? JSON.parse(JSON.stringify(state.tariffs)) : undefined);
  const ref = await col.add(data);
  state.clients.push({id: ref.id, ...data});
  renderClients();
  const sel = document.getElementById('cliSelect');
  if(sel) sel.value = ref.id;
  const newIdx = state.clients.findIndex(c=>c.id===ref.id);
  syncTariffSelectionToClient(newIdx);
  alert('Salvataggio effettuato');
}

function addClient(){
  state.clients.push({
    ragione: document.getElementById('cliRagione').value || '',
    piva: document.getElementById('cliPiva').value || '',
    email: document.getElementById('cliEmail').value || '',
    tel: document.getElementById('cliTel').value || '',
    indirizzo: document.getElementById('cliIndirizzo').value || '',
    sdi: document.getElementById('cliSdi').value || ''
  });
  renderClients();
  alert('Salvataggio effettuato');
}
async function delClient(){
  const sel = document.getElementById('cliSelect');
  if(!sel) return;
  const v = sel.value;
  if(v === '-1'){ alert('Seleziona un cliente da eliminare'); return; }

  const i = getSelectedClientIndex();
  const c = state.clients?.[i];
  if(!c){ alert('Cliente non trovato'); return; }

  if(!confirm(`Eliminare cliente: ${c.ragione || 'Cliente'}?`)) return;

  // delete from Firestore by id (stable)
  if(c.id){
    await db.collection('users').doc(state.user.uid).collection('clients').doc(c.id).delete();
  }
  // update local state
  state.clients.splice(i,1);
  renderClients();
  clearClientForm();
  const sel2 = document.getElementById('cliSelect');
  if(sel2) sel2.value = '-1';
}
async function saveClients(){
  const col = db.collection('users').doc(state.user.uid).collection('clients');
  const snap = await col.get();
  const batch = db.batch();
  snap.forEach(d=>batch.delete(d.ref));
  await batch.commit();
  const b2 = db.batch();
  state.clients.forEach(c=> b2.set(col.doc(), c));
  await b2.commit();
  alert('Clienti salvati');
}

function setTime(hSel,mSel,hhmm){
  const [h,m] = (hhmm||'00:00').split(':');
  document.querySelector(hSel).value=h; document.querySelector(mSel).value=m;
}


async function duplicateYesterday(){
  const dp = document.getElementById('dayPicker');
  if(!dp || !dp.value){ alert('Seleziona prima una data'); return; }
  const cur = new Date(dp.value + 'T00:00:00');
  cur.setDate(cur.getDate() - 1);
  const prev = cur.toISOString().slice(0,10);
  const ref = db.collection('users').doc(state.user.uid).collection('days').doc(prev);
  const snap = await ref.get();
  if(!snap.exists){ alert('Ieri non ha dati da duplicare'); return; }
  const v = snap.data();
  setTime('#in1h','#in1m', v.in1||'00:00');
  setTime('#out1h','#out1m', v.out1||'00:00');
  setTime('#in2h','#in2m', v.in2||'00:00');
  setTime('#out2h','#out2m', v.out2||'00:00');
  document.getElementById('km').value = v.km||0;
  document.getElementById('note').value = v.note||'';
  document.getElementById('chipTrasf').classList.toggle('active', !!v.trasf);
  document.getElementById('chipPern').classList.toggle('active', !!(v.trasfertaNonLavorata ?? v.pern));
  applyTravelFields(v);
  document.getElementById('clientSelect').selectedIndex = (v.clientIndex??-1)+1;
  alert('Dati di ieri copiati. Controlla e salva la giornata.');
}

async function saveDay(){
  const d = document.getElementById('dayPicker').value;
  const data = getPayload();
  try{
    await db.collection('users').doc(state.user.uid).collection('days').doc(d).set(data, {merge:true});
    await loadMonth(d.slice(0,7));
    alert('Giornata salvata');
  }catch(e){
    console.error('SAVE DAY ERROR', e);
    alert('Errore salvataggio: ' + (e.message || e.code));
  }
}

async function loadDay(d){
  const ref = db.collection('users').doc(state.user.uid).collection('days').doc(d);
  const snap = await ref.get();
  if(snap.exists){
    const v = snap.data();
    setTime('#in1h','#in1m', v.in1||'00:00');
    setTime('#out1h','#out1m', v.out1||'00:00');
    setTime('#in2h','#in2m', v.in2||'00:00');
    setTime('#out2h','#out2m', v.out2||'00:00');
    document.getElementById('km').value = v.km||0;
    document.getElementById('note').value = v.note||'';
    document.getElementById('chipTrasf').classList.toggle('active', !!v.trasf);
    document.getElementById('chipPern').classList.toggle('active', !!(v.trasfertaNonLavorata ?? v.pern));
    applyTravelFields(v);
    document.getElementById('clientSelect').selectedIndex = (v.clientIndex??-1)+1;
  }else{
    // reset form when day is empty
    setTime('#in1h','#in1m','00:00');
    setTime('#out1h','#out1m','00:00');
    setTime('#in2h','#in2m','00:00');
    setTime('#out2h','#out2m','00:00');
    document.getElementById('km').value = 0;
    document.getElementById('note').value = '';
    document.getElementById('chipTrasf').classList.remove('active');
    document.getElementById('chipPern').classList.remove('active');
    const fest = document.getElementById('chipFestivo');
    if(fest) fest.classList.remove('active');
    applyTravelFields({workMode:'locale', travelVehicle:'auto', travelH:0});
    document.getElementById('clientSelect').selectedIndex = 0;
  }
}

async function loadMonth(yyyyMM){
  const [y,m] = yyyyMM.split('-').map(Number);
  const list = document.getElementById('listView'); const grid = document.getElementById('calGrid');
  if(list) list.innerHTML=''; if(grid) grid.innerHTML='';
  const daysInMonth = new Date(y, m, 0).getDate();
  const daysMap = {};
  for(let d=1; d<=daysInMonth; d++){
    const id = `${y}-${pad2(m)}-${pad2(d)}`;
    daysMap[id] = { id, in1:'', out1:'', in2:'', out2:'', ordH:0, strH:0, totalH:0, km:0, note:'', trasf:false, pern:false, clientIndex:-1 };
  }
  try{
    const snap = await db.collection('users').doc(state.user.uid).collection('days')
      .where(firebase.firestore.FieldPath.documentId(), '>=', `${yyyyMM}-01`)
      .where(firebase.firestore.FieldPath.documentId(), '<=', `${yyyyMM}-${pad2(daysInMonth)}`)
      .get();
    snap.forEach(doc=>{ daysMap[doc.id] = Object.assign(daysMap[doc.id], doc.data()); });
  }catch(e){
    console.error('LOAD MONTH ERROR', e);
    alert('Errore lettura mese: ' + (e.message||e.code));
  }
  const arr = Object.values(daysMap).sort((a,b)=>a.id.localeCompare(b.id));
  updateDashboard(arr);

  if(list){
    arr.forEach(v=>{
      const cli = (state.clients||[])[v.clientIndex]?.ragione || '—';
      const row = document.createElement('div');
      row.className='list-item';
      row.innerHTML = `<div><strong>${fmtIT(v.id)}</strong> · ${cli}</div>
        <div><span class="badge ok">${(v.ordH||0).toFixed(1)}h</span> <span class="badge warn">${(v.strH||0).toFixed(1)}h</span></div>`;
      row.onclick = ()=>{
        const exp = document.createElement('div');
        exp.className='card';
        exp.innerHTML = `<p>In1: ${v.in1||'-'} Out1: ${v.out1||'-'} · In2: ${v.in2||'-'} Out2: ${v.out2||'-'} · KM: ${v.km||0}</p>
                         <p>Trasferta: ${v.trasf?'Sì':'No'} · Trasferta non lavorata: ${v.pern?'Sì':'No'}</p>
                         <p>Note: ${v.note||''}</p>`;
        if(row.nextSibling && row.nextSibling.className==='card') row.parentNode.removeChild(row.nextSibling);
        else row.parentNode.insertBefore(exp, row.nextSibling);
      };
      list.appendChild(row);
    });
  }

  if(grid){
    const firstDay = new Date(y, m-1, 1);
    const offset = (firstDay.getDay()+6)%7;
    const weekDays = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
    weekDays.forEach(w=>{
      const h=document.createElement('div');
      h.className='cal-weekday';
      h.textContent=w;
      grid.appendChild(h);
    });
    for(let i=0;i<offset;i++){
      const empty=document.createElement('div');
      empty.className='day cal-empty-slot';
      grid.appendChild(empty);
    }
    arr.forEach(v=>{
      const dNum = Number(v.id.slice(-2));
      const isCompiled = (v.totalH||0)>0 || (v.ordH||0)>0 || (v.strH||0)>0 || (v.km||0)>0;
      const isDraft = !isCompiled && !!(v.note || v.trasf || v.pern);
      const status = isCompiled ? 'compiled' : (isDraft ? 'draft' : 'empty');
      const cell=document.createElement('button');
      cell.type='button';
      cell.className='day cal-day-clean ' + status;
      cell.dataset.date=v.id;
      cell.innerHTML = `<span class="cal-day-num">${dNum}</span><span class="cal-status-dot ${status}"></span>`;
      cell.onclick = ()=> showDayDetail(v);
      grid.appendChild(cell);
    });
  }
}

function showDayDetail(v){
  const cli = (state.clients||[])[v.clientIndex]?.ragione || '—';
  const detailHtml = `<div class="detail-date"><strong>${fmtIT(v.id)}</strong><span>${cli}</span></div>
    <div class="detail-grid">
      <div><span>Ordinarie</span><strong>${(v.ordH||0).toFixed(2)}h</strong></div>
      <div><span>Straordinarie</span><strong>${(v.strH||0).toFixed(2)}h</strong></div>
      <div><span>KM</span><strong>${v.km||0}</strong></div>
      <div><span>Totale ore</span><strong>${(v.totalH||0).toFixed(2)}h</strong></div>
    </div>
    <div class="detail-lines">
      <p><b>Orari:</b> ${v.in1||'-'} → ${v.out1||'-'} · ${v.in2||'-'} → ${v.out2||'-'}</p>
      <p><b>Extra:</b> Trasferta ${v.trasf?'Sì':'No'} · Trasferta non lavorata ${v.pern?'Sì':'No'}</p>
      <p><b>Note:</b> ${v.note||'—'}</p>
    </div>
    <button type="button" class="btn primary" id="btnEditCalendarDay">Modifica</button>`;
  const panel=document.getElementById('calendarDayDetail');
  if(panel && document.getElementById('calendarioPage')?.classList.contains('page-active')){
    panel.innerHTML = detailHtml;
    const btn=document.getElementById('btnEditCalendarDay');
    if(btn){
      btn.onclick = async ()=>{
        const dp=document.getElementById('dayPicker');
        if(dp) dp.value=v.id;
        await loadDay(v.id);
        showMainPage('rapportiniPage');
      };
    }
    document.querySelectorAll('.cal-day-clean').forEach(el=>el.classList.toggle('selected', el.dataset.date===v.id));
    return;
  }
  document.getElementById('dayDetail').innerHTML = detailHtml;
  document.getElementById('dayDlg').showModal();
}

async function saveTariffs(){
  const t = getTariffInputs();
  const sel = document.getElementById('tarClientSelect');
  const v = sel ? parseInt(sel.value,10) : -1;

  if(!sel || isNaN(v) || v === -1){
    state.tariffs = t;
    await db.collection('users').doc(state.user.uid).set({tariffs: t}, {merge:true});
    alert('Tariffe globali salvate');
    return;
  }

  if(v === -2){
    state.tariffsNoClient = t;
    await db.collection('users').doc(state.user.uid).set({tariffsNoClient: t}, {merge:true});
    alert('Tariffe "Senza cliente" salvate');
    return;
  }

  const c = state.clients?.[v];
  if(!c){
    alert('Cliente non valido');
    return;
  }
  c.tariffs = t;

  if(c.id){
    await db.collection('users').doc(state.user.uid).collection('clients').doc(c.id).set({tariffs: t}, {merge:true});
    alert('Tariffe cliente salvate');
  }else{
    await saveClients();
    alert('Tariffe cliente salvate (salvataggio completo)');
  }
}

async function imgToDataURL(url){
  const r = await fetch(url);
  const b = await r.blob();
  return await new Promise(res=>{ const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.readAsDataURL(b); });
}


async function choosePdfClientIndex(){
  // returns number (clientIndex) or null if cancelled
  const clients = state.clients || [];
  const clientLabel = (c,i)=>{
    const empty = !c || (!c.ragione && !c.piva && !c.email && !c.tel && !c.indirizzo && !c.sdi);
    return empty ? 'Senza cliente' : (c.ragione || ('Cliente ' + (i+1)));
  };
  if(clients.length <= 1) return (clients.length === 1 ? 0 : -1);

  // Use <dialog> if available
  if(typeof HTMLDialogElement !== 'undefined'){
    return await new Promise((resolve)=>{
      const dlg = document.createElement('dialog');
      dlg.style.maxWidth = '420px';
      dlg.style.width = '92vw';
      dlg.innerHTML = `
        <form method="dialog" style="margin:0">
          <h3 style="margin:0 0 10px 0;font-size:16px">Esporta PDF</h3>
          <div style="display:flex;flex-direction:column;gap:8px">
            <label style="font-size:13px;opacity:.9">Seleziona cliente</label>
            <select id="__pdfClientSel" style="padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:rgba(0,0,0,.15);color:inherit">
              <option value="-1">Tutti i clienti</option><option value="-2">Senza cliente</option>
              ${clients.map((c,i)=>({c,i})).filter(x=>!isEmptyClient(x.c)).map(x=>`<option value="${x.i}">${x.c.ragione || ('Cliente '+(x.i+1))}</option>`).join('')}
            </select>
          </div>
          <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px">
            <button value="cancel" style="padding:10px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:transparent;color:inherit">Annulla</button>
            <button value="ok" style="padding:10px 14px;border-radius:10px;border:0;background:#ff0a09;color:white">Esporta</button>
          </div>
        </form>
      `;
      document.body.appendChild(dlg);
      dlg.addEventListener('close', ()=>{
        try{
          const v = dlg.returnValue;
          if(v !== 'ok'){ dlg.remove(); return resolve(null); }
          const sel = dlg.querySelector('#__pdfClientSel');
          const idx = parseInt(sel.value,10);
          dlg.remove();
          resolve(isNaN(idx)?-1:idx);
        }catch(e){
          dlg.remove();
          resolve(null);
        }
      }, {once:true});
      dlg.showModal();
    });
  }

  // Fallback prompt
  const names = clients.map((c,i)=> i + ': ' + (c.ragione || ('Cliente ' + (i+1))) ).join('\n');
  const ans = prompt('Esporta PDF per:\n- Tutti = -1\n' + names + '\nInserisci indice o -1:', '-1');
  const idx = parseInt(ans||'-1',10);
  return (isNaN(idx)?-1:idx);
}

async function exportPdf(){
  let clientIndex = await choosePdfClientIndex();
  if(clientIndex === null) return;

  const yyyyMM = (document.getElementById('dayPicker').value || new Date().toISOString().slice(0,10)).slice(0,7);
  const [y,m] = yyyyMM.split('-').map(Number);
  const last = new Date(y,m,0).getDate();

  const map = {};
  for(let d=1; d<=last; d++){
    const id = `${yyyyMM}-${pad2(d)}`;
    map[id] = { id, in1:'', out1:'', in2:'', out2:'', ordH:0, strH:0, totalH:0, km:0, note:'', trasf:false, pern:false, clientIndex:-1 };
  }
  try{
    const snap = await db.collection('users').doc(state.user.uid).collection('days')
      .where(firebase.firestore.FieldPath.documentId(), '>=', `${yyyyMM}-01`)
      .where(firebase.firestore.FieldPath.documentId(), '<=', `${yyyyMM}-${pad2(last)}`)
      .get();
    snap.forEach(d=>{ map[d.id] = Object.assign(map[d.id], d.data()); });
  }catch(e){
    console.error('PDF LOAD ERROR', e);
    alert('Errore lettura dati per PDF: ' + (e.message||e.code));
  }

  const days = Object.values(map)
    .filter(v => clientIndex < 0 || v.clientIndex === clientIndex)
    .sort((a,b)=>a.id.localeCompare(b.id));

  // Ora: Data = solo giorno, colonne Ord e Str separate
  const getClientName = (idx)=>{
    const noIdx = getNoClientIndex();
    if(idx==null || idx<0 || idx===noIdx) return 'Senza cliente';
    const c = state.clients?.[idx];
    return (c?.ragione) || ('Cliente ' + (idx+1));
  };

  const rows = days.map(v => {
    const base = [
      v.id.slice(-2),
      v.in1||'-', v.out1||'-', v.in2||'-', v.out2||'-',
      (v.ordH||0).toFixed(2), (v.strH||0).toFixed(2),
      v.trasf?'SI':'', v.pern?'SI':'', String(v.km||0),
      v.note?String(v.note):''
    ];
    // Se export 'Tutti', aggiungo colonna Cliente subito dopo il giorno
    if(clientIndex < 0){
      base.splice(1, 0, getClientName(v.clientIndex));
    }
    return base;
  });
const t = (clientIndex>=0 && state.clients?.[clientIndex]?.tariffs) ? state.clients[clientIndex].tariffs : (state.tariffs||{ord:0,str:0,strFest:0,km:0,trasf:0,pern:0});
  let totOrd=0, totStr=0, totStrFest=0, totKm=0, nTrasf=0, nPern=0;
  days.forEach(v=>{ totOrd+=v.ordH||0; totStr+=v.strH||0; totStrFest+=v.strFestH||0; totKm+=v.km||0; if(v.trasf) nTrasf++; if(v.pern) nPern++; });

  if(!window.jspdf || !window.jspdf.jsPDF){
    alert('jsPDF non caricato. Controlla script in index.html.');
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({unit:'pt', format:'a4'});
  const pageW = doc.internal.pageSize.getWidth();

  // header con banda e logo
  doc.setFillColor(30,42,56);
  doc.rect(0,0,pageW,70,'F');
  try{
    const logo = await imgToDataURL('assets/logo-workhours-dark.png');
    const imgWidth = 160;
const imgProps = doc.getImageProperties(logo);
const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

doc.addImage(
  logo,
  'PNG',
  (pageW - imgWidth) / 2,
  8,
  imgWidth,
  imgHeight
);
  }catch(_){}
  const co = state.company || {};
  const cli = (typeof clientIndex === 'number' && clientIndex >= 0) ? (state.clients?.[clientIndex] || null) : null;

  const leftLines = [
    co.ragione||'',
    co.piva ? `P.IVA: ${co.piva}` : '',
    co.sdi ? `SDI: ${co.sdi}` : '',
    co.indirizzo||'',
    co.telefono ? `Tel: ${co.telefono}` : '',
    co.email||''
  ].filter(Boolean);

  const rightLines = cli ? [
    cli.ragione||'',
    cli.piva ? `P.IVA: ${cli.piva}` : '',
    cli.indirizzo||'',
    cli.tel ? `Tel: ${cli.tel}` : '',
    cli.email||''
  ].filter(Boolean) : (clientIndex < 0 ? ['Tutti i clienti'] : []);

  doc.setFontSize(10);
  let yHeader = 86;

  if(leftLines.length){
    doc.text(leftLines, 18, yHeader, {align:'left'});
  }
  if(rightLines.length){
    doc.text(rightLines, pageW - 18, yHeader, {align:'right'});
  }

  // spazio usato dal blocco header (prendo il max fra SX e DX)
  yHeader += 12 * Math.max(leftLines.length, rightLines.length);
  // titolo e spostamento più in basso
  const title = clientIndex<0 ? `Rapportini ${yyyyMM}` : `Rapportini ${yyyyMM} — ${(state.clients[clientIndex]?.ragione)||''}`;
  doc.setFontSize(12);
  const startY = Math.max(130, yHeader + 20);
  doc.text(title, 20, startY);

  // tabella giornaliera
  if(typeof doc.autoTable === 'function'){
    
  const headDays = (clientIndex < 0)
    ? [['Giorno','Cliente','In1','Out1','In2','Out2','Ord','Str','Trsf.','Trsf. non lav.','KM','Note']]
    : [['Giorno','In1','Out1','In2','Out2','Ord','Str','Trsf.','Trsf. non lav.','KM','Note']];

  const colDays = (clientIndex < 0)
    ? {
        0:{cellWidth:28, halign:'center'},
        1:{cellWidth:90},
        2:{cellWidth:30}, 3:{cellWidth:30}, 4:{cellWidth:30}, 5:{cellWidth:30},
        6:{cellWidth:34, halign:'right'}, 7:{cellWidth:34, halign:'right'},
        8:{cellWidth:36}, 9:{cellWidth:36}, 10:{cellWidth:30, halign:'right'},
        11:{cellWidth:'auto'}
      }
    : {
        0:{cellWidth:34, halign:'center'},
        1:{cellWidth:32}, 2:{cellWidth:32}, 3:{cellWidth:32}, 4:{cellWidth:32},
        5:{cellWidth:36, halign:'right'}, 6:{cellWidth:36, halign:'right'},
        7:{cellWidth:40}, 8:{cellWidth:44}, 9:{cellWidth:32, halign:'right'},
        10:{cellWidth:'auto'}
      };
doc.autoTable({
      startY: startY + 10,
      styles:{valign:'middle',fontSize:9,cellPadding:4,overflow:'linebreak'},
      headStyles:{fillColor:[30,42,56],textColor:255,fontStyle:'bold'},
      head: headDays,
      body:rows,
      theme:'grid',
      margin:{left:18,right:18},
      columnStyles: colDays
    });
  }else{
    doc.setFontSize(11);
    let yPos = startY + 26;
    rows.forEach(r => { doc.text(r.join(' | '), 20, yPos); yPos+=16; if(yPos>800){ doc.addPage(); yPos=40; } });
  }

  // riepilogo finale
  const getTar = (idx)=>{
    const noIdx = getNoClientIndex();
    if(idx>=0 && state.clients?.[idx]?.tariffs) return state.clients[idx].tariffs;
    if(idx===-2 || idx===noIdx) return state.tariffsNoClient || state.tariffs || {ord:0,str:0,strFest:0,km:0,trasf:0,pern:0};
    return state.tariffs || {ord:0,str:0,strFest:0,km:0,trasf:0,pern:0};
  };

  if(clientIndex < 0){
    // Riepilogo PER CLIENTE con tariffari diversi
    const groups = {};
    days.forEach(v=>{
      const noIdx = getNoClientIndex();
      const idx0 = (v.clientIndex==null ? -2 : v.clientIndex);
      const idx = (idx0===noIdx || idx0<0) ? -2 : idx0;
      if(!groups[idx]) groups[idx] = {ord:0,str:0,km:0,trasf:0,pern:0};
      groups[idx].ord += v.ordH||0;
      groups[idx].str += v.strH||0;
      groups[idx].km  += v.km||0;
      if(v.trasf) groups[idx].trasf += 1;
      if(v.pern)  groups[idx].pern  += 1;
    });

    const rowsCli = [];
    let grand = 0;

    Object.keys(groups).sort((a,b)=>Number(a)-Number(b)).forEach(k=>{
      const idx = Number(k);
      const g = groups[idx];
      const t = getTar(idx);

      const imp =
        g.ord * (t.ord||0) +
        g.str * (t.str||0) +
        g.km  * (t.km||0) +
        g.trasf * (t.trasf||0) +
        g.pern  * (t.pern||0);

      grand += imp;

      const name = (idx>=0 ? (state.clients?.[idx]?.ragione || ('Cliente '+(idx+1))) : 'Senza cliente');
      rowsCli.push([
        name,
        g.ord.toFixed(2),
        g.str.toFixed(2),
        String(Math.round(g.km)),
        String(g.trasf),
        String(g.pern),
        imp.toFixed(2)
      ]);
    });

    const ySum = (doc.lastAutoTable && doc.lastAutoTable.finalY ? doc.lastAutoTable.finalY : startY+220) + 18;
    doc.autoTable({
      startY: ySum,
      styles:{valign:'middle',fontSize:10,cellPadding:4},
      headStyles:{fillColor:[30,42,56],textColor:255,fontStyle:'bold'},
      head:[['Cliente','Ord(h)','Str(h)','KM','Trsf','Pern','Subtot €']],
      body: rowsCli,
      theme:'grid',
      margin:{left:18,right:18},
      columnStyles:{
        0:{cellWidth:'auto'},
        1:{cellWidth:60,halign:'right'},
        2:{cellWidth:60,halign:'right'},
        3:{cellWidth:46,halign:'right'},
        4:{cellWidth:40,halign:'center'},
        5:{cellWidth:40,halign:'center'},
        6:{cellWidth:80,halign:'right'}
      }
    });

    doc.setFontSize(12);
    doc.text(`Totale generale: € ${grand.toFixed(2)}`, pageW-18, doc.lastAutoTable.finalY+24, {align:'right'});

  } else {
    // Riepilogo singolo cliente (come prima)
    const t = getTar(clientIndex);
    const items = [
      ['Ore ordinarie', totOrd.toFixed(2), (t.ord||0).toFixed(2), (totOrd*(t.ord||0)).toFixed(2)],
      ['Ore straordinarie', totStr.toFixed(2), (t.str||0).toFixed(2), (totStr*(t.str||0)).toFixed(2)],
      ['KM', String(Math.round(totKm)), (t.km||0).toFixed(2), (totKm*(t.km||0)).toFixed(2)],
      ['Trasferte', String(nTrasf), (t.trasf||0).toFixed(2), (nTrasf*(t.trasf||0)).toFixed(2)],
      ['Trasferte non lavorate', String(nPern), (t.pern||0).toFixed(2), (nPern*(t.pern||0)).toFixed(2)]
    ];
    const totBase = items.reduce((s, r)=> s + parseFloat(r[3]), 0);
    const sogliaBollo = 77.47;
    const bollo = (totBase >= sogliaBollo) ? 2.00 : 0;
    if(bollo > 0){
      items.push(['Imposta di bollo', '1', '2.00', '2.00']);
    }

    const ySum = (doc.lastAutoTable && doc.lastAutoTable.finalY ? doc.lastAutoTable.finalY : startY+220) + 18;
    doc.autoTable({
      startY: ySum,
      styles:{valign:'middle',fontSize:10,cellPadding:4},
      headStyles:{fillColor:[30,42,56],textColor:255,fontStyle:'bold'},
      head:[['Descrizione','Q.tà','Prezzo','Importo']],
      body: items,
      theme:'grid',
      margin:{left:18,right:18},
      columnStyles:{0:{cellWidth:'auto'},1:{cellWidth:60,halign:'right'},2:{cellWidth:60,halign:'right'},3:{cellWidth:80,halign:'right'}}
    });
    const tot = totBase + bollo;
    doc.setFontSize(12);
    doc.text('Totale: € ' + tot.toFixed(2), pageW-18, doc.lastAutoTable.finalY+24, {align:'right'});
  }

  const suffix = clientIndex<0 ? '' : '_' + (state.clients[clientIndex]?.ragione||'cliente').replace(/\s+/g,'_');
  doc.save(`rapportini_${yyyyMM}${suffix}.pdf`);

}
