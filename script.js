/* ======= script.js (module) ======= */
/* Firebase modular v12 imports */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getDatabase, ref, get, set, update, remove, onValue, runTransaction
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";

/* ========== FIREBASE CONFIG - replace if you want ========== */
const firebaseConfig = {
  apiKey: "AIzaSyCF-3Zu4tuhrrhH9PTx6-pfyJDLszRIqOk",
  authDomain: "halloween-fashion-walk.firebaseapp.com",
  databaseURL: "https://halloween-fashion-walk-default-rtdb.firebaseio.com",
  projectId: "halloween-fashion-walk",
  storageBucket: "halloween-fashion-walk.firebasestorage.app",
  messagingSenderId: "110631989563",
  appId: "1:110631989563:web:b0317f8fe823507bd4071e",
  measurementId: "G-YWWSQ63KN5"
};

/* ========== INIT ========== */
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* ========== UI elements ========== */
const voteCard = document.getElementById("voteCard");
const voteRegEl = document.getElementById("voteReg");
const currentParticipantEl = document.getElementById("currentParticipant");
const voteBtns = Array.from(document.querySelectorAll(".voteBtn"));
const voteMsg = document.getElementById("voteMsg");

const leaderCard = document.getElementById("leaderboardCard");
const leaderList = document.getElementById("leaderList");

const adminPanel = document.getElementById("adminPanel");
const adminCurrent = document.getElementById("adminCurrent");
const adminMsg = document.getElementById("adminMsg");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const nextBtn = document.getElementById("nextBtn");
const resetBtn = document.getElementById("resetBtn");
const showBtn = document.getElementById("showBtn");
const hideBtn = document.getElementById("hideBtn");

/* ========== Config / state ========== */
const ADMIN_PIN = "1989";           // change here if you want a different PIN
const TOTAL = 30;
let controlUnsub = null;
let liveUnsub = null;
let liveChart = null;
let leaderChart = null;

/* ========== utility helpers ========== */
const pad = n => String(n).padStart(3, "0");
const deviceId = (() => {
  const k = "fw_device_id_v1";
  let id = localStorage.getItem(k);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(k, id); }
  return id;
})();

/* ========== create participants 001-030 if missing ========== */
async function ensureParticipants() {
  const promises = [];
  for (let i = 1; i <= TOTAL; i++) {
    const id = pad(i);
    const pRef = ref(db, `participants/${id}`);
    promises.push(
      get(pRef).then(snap => {
        if (!snap.exists()) {
          return set(pRef, {
            votes: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
            totalVotes: 0,
            weightedSum: 0,
            avg: 0
          });
        }
      })
    );
  }
  await Promise.all(promises);
}
ensureParticipants().catch(console.error);

/* ========== control node listener ========== */
/*
 control structure:
 /control
   activeParticipant: "001" | null
   pollActive: true | false
   showLeaderboard: true|false
*/
const controlRef = ref(db, "control");
controlUnsub = onValue(controlRef, (snap) => {
  const data = snap.exists() ? snap.val() : {};
  const active = data.activeParticipant || null;
  const pollActive = Boolean(data.pollActive);
  const showLB = Boolean(data.showLeaderboard);

  // update UI text
  if (active) {
    currentParticipantEl.textContent = `Now performing: ${active}`;
    voteRegEl.textContent = active;
    adminCurrent.textContent = active;
  } else {
    currentParticipantEl.textContent = `Awaiting next performance…`;
    voteRegEl.textContent = "---";
    adminCurrent.textContent = "—";
  }

  // show/hide leaderboard
  if (showLB) {
    leaderCard.classList.remove("hidden");
    voteCard.classList.add("hidden");
  } else {
    leaderCard.classList.add("hidden");
  }

  // show/hide voting card depending on pollActive
  if (active && pollActive && !showLB) {
    voteCard.classList.remove("hidden");
  } else {
    voteCard.classList.add("hidden");
  }

  // attach live chart to the active participant (if any)
  if (active && pollActive && !showLB) {
    attachLiveChart(active);
  } else {
    detachLiveChart();
  }

  // update admin current label
  adminCurrent.textContent = active ? active : "—";
});

/* ========== live chart handling ========== */
importChartDefaults();

function attachLiveChart(reg) {
  // detach previous
  detachLiveChart();

  // listen votes for this participant
  const pvRef = ref(db, `participants/${reg}/votes`);
  liveUnsub = onValue(pvRef, (snap) => {
    const votes = snap.exists() ? snap.val() : { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
    renderLiveChart(votes, reg);
  });
}

function detachLiveChart() {
  if (typeof liveUnsub === "function") {
    liveUnsub();
    liveUnsub = null;
  }
  if (liveChart) {
    try { liveChart.destroy(); } catch(e){}
    liveChart = null;
  }
}

function renderLiveChart(votesObj, reg) {
  const total = Object.values(votesObj).reduce((a,b)=>a+(Number(b)||0),0) || 0;
  const perc = [1,2,3,4,5].map(n => total ? ((Number(votesObj[String(n)]||0) / total) * 100) : 0);

  const ctx = document.getElementById("liveChart").getContext("2d");
  if (liveChart) liveChart.destroy();

  liveChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["1 ⭐","2 ⭐","3 ⭐","4 ⭐","5 ⭐"],
      datasets: [{
        label: `Distribution — ${reg}`,
        data: perc.map(v => Number(v.toFixed(1))),
        backgroundColor: ["#ff4d4d","#ff944d","#ffd24d","#b7ff4d","#5dff9a"]
      }]
    },
    options: {
      responsive: true,
      animation: { duration: 200 },
      scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => v + "%" } } },
      plugins: { legend: { display: false } }
    }
  });
}

/* ========== vote button behavior ========== */
voteBtns.forEach(btn => {
  btn.addEventListener("click", async () => {
    voteMsg.textContent = "";
    const rating = String(btn.dataset.value);
    // check control node current state
    const ctrl = (await get(controlRef)).val() || {};
    const active = ctrl.activeParticipant || null;
    const pollActive = Boolean(ctrl.pollActive);
    if (!active || !pollActive) {
      voteMsg.textContent = "⏳ Voting not active right now.";
      return;
    }

    const reg = active;
    // check device vote record for this participant
    const deviceVoteRef = ref(db, `votes/${deviceId}/${reg}`);
    const dvSnap = await get(deviceVoteRef);
    if (dvSnap.exists()) {
      voteMsg.textContent = "⚠️ You already voted for this participant.";
      return;
    }

    // Use runTransaction to increment safely
    const partRef = ref(db, `participants/${reg}`);
    try {
      await runTransaction(partRef, (cur) => {
        if (cur === null) {
          // initialize if missing
          cur = { votes: { "1":0,"2":0,"3":0,"4":0,"5":0 }, totalVotes:0, weightedSum:0, avg:0 };
        }
        // ensure votes object exists
        cur.votes = cur.votes || { "1":0,"2":0,"3":0,"4":0,"5":0 };
        cur.votes[rating] = (Number(cur.votes[rating]||0)) + 1;
        cur.totalVotes = (Number(cur.totalVotes||0)) + 1;
        cur.weightedSum = (Number(cur.weightedSum||0)) + Number(rating);
        cur.avg = cur.totalVotes ? Number((cur.weightedSum / cur.totalVotes).toFixed(2)) : 0;
        return cur;
      });

      // mark this device as voted for this participant
      await set(ref(db, `votes/${deviceId}/${reg}`), { ts: Date.now() });

      voteMsg.textContent = "✅ Vote recorded — thank you!";
    } catch (err) {
      console.error("vote error", err);
      voteMsg.textContent = "❌ Error recording vote. Try again.";
    }
  });
});

/* ========== Admin keyboard shortcut (Ctrl + B) & PIN ========== */
window.addEventListener("keydown", async (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === "b") {
    const pin = prompt("Enter Admin PIN:");
    if (!pin) return;
    if (pin.trim() === ADMIN_PIN) {
      adminPanel.classList.toggle("hidden");
      adminPanel.setAttribute("aria-hidden", adminPanel.classList.contains("hidden"));
      if (!adminPanel.classList.contains("hidden")) adminMsg.textContent = "Admin unlocked";
      else adminMsg.textContent = "";
    } else {
      alert("Invalid PIN");
    }
  }
});

/* ========== Admin buttons ========== */
startBtn.addEventListener("click", async () => {
  // start poll on current activeParticipant (if exists) -> set pollActive true
  const ctrlSnap = await get(controlRef);
  const ctrl = ctrlSnap.exists() ? ctrlSnap.val() : {};
  const active = ctrl.activeParticipant || pad(1);
  await update(controlRef, { activeParticipant: active, pollActive: true, showLeaderboard: false });
  adminMsg.textContent = `Started poll ${active}`;
});

stopBtn.addEventListener("click", async () => {
  const ctrlSnap = await get(controlRef);
  const ctrl = ctrlSnap.exists() ? ctrlSnap.val() : {};
  const active = ctrl.activeParticipant || null;
  if (!active) { adminMsg.textContent = "No active participant"; return; }
  await update(controlRef, { pollActive: false });
  adminMsg.textContent = `Stopped poll ${active}`;
});

nextBtn.addEventListener("click", async () => {
  const ctrlSnap = await get(controlRef);
  const ctrl = ctrlSnap.exists() ? ctrlSnap.val() : {};
  const active = ctrl.activeParticipant || null;
  let nextNum = 1;
  if (active) nextNum = (Number(active) % TOTAL) + 1;
  const nextId = pad(nextNum);
  await update(controlRef, { activeParticipant: nextId, pollActive: false, showLeaderboard: false });
  adminMsg.textContent = `Ready: ${nextId} (poll stopped)`;
  // detach livechart so UI hides
  detachLiveChart();
});

resetBtn.addEventListener("click", async () => {
  if (!confirm("⚠️ Reset ALL data? This will clear all votes and set participant back to 001.")) return;
  // remove participants, votes, control
  await remove(ref(db));
  // re-create control and participants
  await set(controlRef, { activeParticipant: "001", pollActive: false, showLeaderboard: false });
  await ensureParticipants();
  // clear local device vote keys
  Object.keys(localStorage).filter(k => k.startsWith("fw_device")).forEach(k => localStorage.removeItem(k));
  adminMsg.textContent = "System reset to 001";
});

showBtn.addEventListener("click", async () => {
  await update(controlRef, { showLeaderboard: true, pollActive: false });
  adminMsg.textContent = "Showing Final Leaderboard";
  showBtn.style.display = "none";
  hideBtn.style.display = "inline-block";
});

hideBtn.addEventListener("click", async () => {
  await update(controlRef, { showLeaderboard: false });
  adminMsg.textContent = "Hid Final Leaderboard";
  hideBtn.style.display = "none";
  showBtn.style.display = "inline-block";
});

/* ========== Leaderboard live updates (and final chart) ========== */
const participantsRef = ref(db, "participants");
onValue(participantsRef, (snap) => {
  const data = snap.exists() ? snap.val() : {};
  // build list sorted by avg desc
  const list = Object.entries(data).map(([id, v]) => ({
    id,
    avg: Number(v?.avg || 0),
    total: Number(v?.totalVotes || 0)
  })).sort((a,b) => b.avg - a.avg || b.total - a.total);

  // update table
  leaderList.innerHTML = "";
  list.forEach((p, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${i+1}</td><td>${p.id}</td><td>${p.avg.toFixed(2)}</td><td>${p.total}</td>`;
    leaderList.appendChild(tr);
  });

  // draw leaderboard chart if leaderboard visible
  get(controlRef).then(cSnap => {
    if (cSnap.exists() && cSnap.val().showLeaderboard) {
      renderLeaderboardChart(list);
      leaderCard.classList.remove("hidden");
    }
  });
});

function renderLeaderboardChart(list) {
  try { if (leaderChart) leaderChart.destroy(); } catch(e){}
  const ctx = document.getElementById("leaderboardChart").getContext("2d");
  leaderChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: list.map(x=>x.id),
      datasets: [{
        label: "Avg % (out of 5)",
        data: list.map(x => Number(((x.avg/5)*100).toFixed(1))),
        backgroundColor: list.map((_,i) => i===0? "#ffd700" : i===1? "#c0c0c0" : i===2? "#cd7f32" : "#ff944d")
      }]
    },
    options: { scales:{ y:{ beginAtZero:true, max:100, title:{display:true,text:"%"} } }, plugins:{legend:{display:false}} }
  });
}

/* ========== small Chart defaults (optional) ========== */
function importChartDefaults(){
  // minimal safe defaults if needed; left intentionally simple
}
