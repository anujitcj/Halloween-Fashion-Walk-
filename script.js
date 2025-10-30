/* ====== Firebase (v12 modular) ====== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getDatabase, ref, get, set, onValue } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";

/* ====== Firebase Config ====== */
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

/* ====== Init ====== */
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* ====== Elements ====== */
const voteSection = document.getElementById("voteSection");
const leaderboard = document.getElementById("leaderboard");
const leaderList = document.getElementById("leaderList");
const voteBtns = document.querySelectorAll(".voteBtn");
const voteMsg = document.getElementById("voteMsg");
const voteRegNumber = document.getElementById("voteRegNumber");
const currentParticipant = document.getElementById("currentParticipant");

const adminPanel = document.getElementById("adminPanel");
const startPollBtn = document.getElementById("startPollBtn");
const stopPollBtn = document.getElementById("stopPollBtn");
const nextBtn = document.getElementById("nextBtn");
const adminMsg = document.getElementById("adminMsg");
const adminCurrent = document.getElementById("adminCurrent");

/* ====== Admin Auth ====== */
const ADMIN_PIN = "1989"; // change this as needed

let leaderboardChart;
let currentRegNumber = null;
let pollActive = false;
let nextRegNumber = 1;

/* ====== Admin Toggle ====== */
document.addEventListener("keydown", async (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === "b") {
    const pin = prompt("Enter Admin PIN:");
    if (pin === ADMIN_PIN) adminPanel.classList.toggle("hidden");
    else alert("Incorrect PIN");
  }
});

/* ====== Admin Control ====== */
startPollBtn.addEventListener("click", async () => {
  if (pollActive) return;
  const reg = nextRegNumber.toString().padStart(3, "0");
  currentRegNumber = reg;
  await set(ref(db, "activePoll"), { regNumber: reg, active: true });
  pollActive = true;
  adminMsg.textContent = `✅ Poll started for ${reg}`;
});

stopPollBtn.addEventListener("click", async () => {
  if (!pollActive) return;
  await set(ref(db, "activePoll"), { regNumber: currentRegNumber, active: false });
  pollActive = false;
  adminMsg.textContent = `⏹ Poll stopped for ${currentRegNumber}`;
});

nextBtn.addEventListener("click", async () => {
  nextRegNumber++;
  if (nextRegNumber > 30) {
    adminMsg.textContent = "🎉 All 30 participants done!";
    return;
  }
  adminCurrent.textContent = nextRegNumber.toString().padStart(3, "0");
  adminMsg.textContent = "➡️ Ready for next participant.";
});

/* ====== 🔥 Reset Everything ====== */
const resetBtn = document.createElement("button");
resetBtn.textContent = "🧹 Reset All (Start Fresh)";
resetBtn.className = "btn btn-secondary";
resetBtn.style.marginTop = "15px";
adminPanel.appendChild(resetBtn);

resetBtn.addEventListener("click", async () => {
  if (!confirm("⚠️ This will delete all data and reset polls. Continue?")) return;
  await set(ref(db, "participants"), {});   // Clear all scores
  await set(ref(db, "activePoll"), {});     // Reset active poll
  nextRegNumber = 1;
  pollActive = false;
  currentRegNumber = null;
  adminCurrent.textContent = "None";
  adminMsg.textContent = "✅ System reset to 001. All data cleared.";

  // Clear all local votes from this device
  Object.keys(localStorage)
    .filter(k => k.startsWith("voted_"))
    .forEach(k => localStorage.removeItem(k));
});

/* ====== Live Poll Sync ====== */
onValue(ref(db, "activePoll"), (snapshot) => {
  if (!snapshot.exists()) {
    voteSection.classList.add("hidden");
    currentParticipant.textContent = "Awaiting next performance…";
    return;
  }

  const data = snapshot.val();
  if (data.active) {
    voteSection.classList.remove("hidden");
    voteRegNumber.textContent = data.regNumber;
    currentParticipant.textContent = `Now Performing: ${data.regNumber}`;
  } else {
    voteSection.classList.add("hidden");
    currentParticipant.textContent = `Poll closed for ${data.regNumber}`;
  }
});

/* ====== Voting ====== */
voteBtns.forEach(btn => {
  btn.addEventListener("click", async () => {
    const val = parseInt(btn.dataset.value);
    const activeSnap = await get(ref(db, "activePoll"));
    if (!activeSnap.exists() || !activeSnap.val().active) {
      voteMsg.textContent = "⚠️ Voting not active.";
      return;
    }

    const reg = activeSnap.val().regNumber;
    if (localStorage.getItem(`voted_${reg}`) === "true") {
      voteMsg.textContent = "⚠️ You already voted for this participant.";
      return;
    }

    const pRef = ref(db, `participants/${reg}`);
    const snap = await get(pRef);
    let data = { total: 0, count: 0 };
    if (snap.exists()) data = snap.val();

    data.total += val;
    data.count += 1;
    data.avg = (data.total / data.count).toFixed(2);

    await set(pRef, data);
    localStorage.setItem(`voted_${reg}`, "true");
    voteMsg.textContent = "✅ Vote submitted!";
  });
});

/* ====== Leaderboard ====== */
onValue(ref(db, "participants"), (snapshot) => {
  leaderList.innerHTML = "";
  if (!snapshot.exists()) {
    leaderList.innerHTML = `<tr><td colspan="4" style="color:var(--muted);">No votes yet.</td></tr>`;
    return;
  }

  const data = Object.entries(snapshot.val())
    .map(([reg, val]) => ({ reg, ...val }))
    .sort((a, b) => (b.avg || 0) - (a.avg || 0));

  data.forEach((p, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${p.reg}</td>
      <td>${p.avg || 0}</td>
      <td>${p.count || 0}</td>
    `;
    leaderList.appendChild(tr);
  });

  updateChart(data);
});

function updateChart(data) {
  const ctx = document.getElementById("leaderboardChart").getContext("2d");
  if (leaderboardChart) leaderboardChart.destroy();
  leaderboardChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.map(d => d.reg),
      datasets: [{
        label: "Avg Rating",
        data: data.map(d => d.avg),
        backgroundColor: "rgba(255, 123, 0, 0.8)"
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, max: 5 } }
    }
  });
}
