/* ====== Firebase (v12 modular) ====== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { 
  getDatabase, ref, set, update, get, onValue, remove 
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";

/* ====== Firebase Config ====== */
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

/* ====== Init Firebase ====== */
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* ====== HTML Elements ====== */
const voteSection = document.getElementById("voteSection");
const voteMsg = document.getElementById("voteMsg");
const voteRegNumber = document.getElementById("voteRegNumber");
const currentParticipant = document.getElementById("currentParticipant");
const adminPanel = document.getElementById("adminPanel");
const adminCurrent = document.getElementById("adminCurrent");
const leaderboardSection = document.getElementById("leaderboard");
const leaderList = document.getElementById("leaderList");

/* Admin buttons */
const startPollBtn = document.getElementById("startPollBtn");
const stopPollBtn = document.getElementById("stopPollBtn");
const nextBtn = document.getElementById("nextBtn");
const resetBtn = document.getElementById("resetBtn");
const showLeaderboardBtn = document.getElementById("showLeaderboardBtn");

/* ====== Chart Setup ====== */
let liveChart, leaderboardChart;
const ctxLive = document.getElementById("liveChart");
const ctxLeader = document.getElementById("leaderboardChart");

/* ====== Constants ====== */
let activeParticipant = null;
let pollActive = false;
let isAdmin = false;
let totalParticipants = 30;

/* ====== Detect Admin ====== */
window.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === "b") {
    const pin = prompt("Enter Admin PIN:");
    if (pin === "1234") {
      isAdmin = true;
      adminPanel.classList.remove("hidden");
      voteSection.classList.add("hidden");
      alert("✅ Admin mode activated!");
    } else {
      alert("❌ Wrong PIN");
    }
  }
});

/* ====== Initialize participants ====== */
async function setupParticipants() {
  for (let i = 1; i <= totalParticipants; i++) {
    const id = String(i).padStart(3, "0");
    const pRef = ref(db, "participants/" + id);
    const snap = await get(pRef);
    if (!snap.exists()) {
      await set(pRef, {
        votes: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        avg: 0,
        total: 0
      });
    }
  }
}
setupParticipants();

/* ====== Real-time Poll Listener ====== */
onValue(ref(db, "control"), (snap) => {
  if (!snap.exists()) return;
  const data = snap.val();
  activeParticipant = data.activeParticipant || null;
  pollActive = data.pollActive || false;

  if (activeParticipant) {
    currentParticipant.textContent = `Participant ${activeParticipant}`;
    voteRegNumber.textContent = activeParticipant;
    adminCurrent.textContent = activeParticipant;
  }

  if (pollActive) {
    voteSection.classList.remove("hidden");
    leaderboardSection.classList.add("hidden");
  } else {
    voteSection.classList.add("hidden");
  }

  // Start listening to live chart data
  if (activeParticipant) listenLiveChart(activeParticipant);
});

/* ====== Voting ====== */
document.querySelectorAll(".voteBtn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    if (!pollActive || !activeParticipant) {
      voteMsg.textContent = "⏳ Wait for next performance.";
      return;
    }

    const value = parseInt(btn.dataset.value);
    const deviceId = localStorage.getItem("deviceId") || crypto.randomUUID();
    localStorage.setItem("deviceId", deviceId);

    const userRef = ref(db, "votes/" + deviceId);
    const snap = await get(userRef);
    if (snap.exists() && snap.val().lastVotedFor === activeParticipant) {
      voteMsg.textContent = "✅ You already voted for this participant.";
      return;
    }

    // Update votes
    const voteRef = ref(db, `participants/${activeParticipant}/votes/${value}`);
    const currSnap = await get(voteRef);
    const currVal = currSnap.exists() ? currSnap.val() : 0;
    await set(voteRef, currVal + 1);

    // Update user vote
    await set(userRef, { lastVotedFor: activeParticipant });

    voteMsg.textContent = `⭐ Thanks for voting ${value}!`;

    // Update averages
    updateAverages(activeParticipant);
  });
});

/* ====== Update Averages ====== */
async function updateAverages(id) {
  const pSnap = await get(ref(db, "participants/" + id + "/votes"));
  if (!pSnap.exists()) return;
  const votes = pSnap.val();
  let totalVotes = 0, weighted = 0;
  for (let k = 1; k <= 5; k++) {
    totalVotes += votes[k];
    weighted += votes[k] * k;
  }
  const avg = totalVotes ? (weighted / totalVotes).toFixed(2) : 0;
  await update(ref(db, "participants/" + id), { avg, total: totalVotes });
}

/* ====== Live Chart (Real-time Voting Graph) ====== */
function listenLiveChart(id) {
  if (liveChart) liveChart.destroy();
  liveChart = new Chart(ctxLive, {
    type: "bar",
    data: {
      labels: ["1 ⭐", "2 ⭐", "3 ⭐", "4 ⭐", "5 ⭐"],
      datasets: [{
        label: `Participant ${id} — Live Votes`,
        data: [0, 0, 0, 0, 0],
        backgroundColor: [
          "#ff0000", "#ff6600", "#ffaa00", "#aaff00", "#00ff55"
        ]
      }]
    },
    options: {
      scales: { y: { beginAtZero: true, max: 100 } },
      animation: false,
      plugins: { legend: { display: false } }
    }
  });

  const pRef = ref(db, `participants/${id}/votes`);
  onValue(pRef, (snap) => {
    if (!snap.exists()) return;
    const votes = snap.val();
    const total = Object.values(votes).reduce((a, b) => a + b, 0);
    const perc = total ? Object.values(votes).map(v => ((v / total) * 100).toFixed(1)) : [0,0,0,0,0];
    liveChart.data.datasets[0].data = perc;
    liveChart.update();
  });
}

/* ====== Admin Controls ====== */
if (startPollBtn) startPollBtn.addEventListener("click", () => {
  update(ref(db, "control"), { pollActive: true });
});
if (stopPollBtn) stopPollBtn.addEventListener("click", () => {
  update(ref(db, "control"), { pollActive: false });
});
if (nextBtn) nextBtn.addEventListener("click", async () => {
  const currentNum = parseInt(activeParticipant);
  const nextNum = (currentNum % totalParticipants) + 1;
  const nextId = String(nextNum).padStart(3, "0");
  await update(ref(db, "control"), { activeParticipant: nextId, pollActive: false });
});
if (resetBtn) resetBtn.addEventListener("click", async () => {
  if (!confirm("Reset everything?")) return;
  await remove(ref(db));
  await set(ref(db, "control"), { activeParticipant: "001", pollActive: false });
  setupParticipants();
});
if (showLeaderboardBtn) showLeaderboardBtn.addEventListener("click", async () => {
  voteSection.classList.add("hidden");
  leaderboardSection.classList.remove("hidden");
  renderLeaderboard();
});

/* ====== Leaderboard ====== */
async function renderLeaderboard() {
  const snap = await get(ref(db, "participants"));
  if (!snap.exists()) return;
  const list = Object.entries(snap.val())
    .map(([id, v]) => ({ id, avg: parseFloat(v.avg), total: v.total }))
    .sort((a, b) => b.avg - a.avg);

  leaderList.innerHTML = "";
  list.forEach((p, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${p.id}</td>
      <td>${p.avg}</td>
      <td>${p.total}</td>
    `;
    leaderList.appendChild(tr);
  });

  if (leaderboardChart) leaderboardChart.destroy();
  leaderboardChart = new Chart(ctxLeader, {
    type: "bar",
    data: {
      labels: list.map(p => p.id),
      datasets: [{
        label: "Average Rating (%)",
        data: list.map(p => p.avg * 20),
        backgroundColor: "#ff7b00"
      }]
    },
    options: {
      scales: { y: { beginAtZero: true, max: 100 } },
      plugins: { legend: { display: false } }
    }
  });
}
