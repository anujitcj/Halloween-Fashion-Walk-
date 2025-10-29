/* ====== Firebase (v12 modular) ====== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getDatabase, ref, push, onValue, update, get, set } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";

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
const registerBtn = document.getElementById("registerBtn");
const voteBtn = document.getElementById("voteBtn");
const leaderboardBtn = document.getElementById("leaderboardBtn");

const registerForm = document.getElementById("registerForm");
const voteForm = document.getElementById("voteForm");
const leaderboard = document.getElementById("leaderboard");

const participantListTbody = document.getElementById("teamList");
const leaderList = document.getElementById("leaderList");
const leaderboardChartCanvas = document.getElementById("leaderboardChart");

const submitRegisterBtn = document.getElementById("submitRegister");
const submitVoteBtn = document.getElementById("submitVote");

const regBack = document.getElementById("regBack");
const voteBack = document.getElementById("voteBack");

const registerMsg = document.getElementById("registerMsg");
const voteMsg = document.getElementById("voteMsg");

/* ====== Section Toggler ====== */
function showSection(section) {
  [registerForm, voteForm, leaderboard].forEach(s => s.classList.add("hidden"));
  section.classList.remove("hidden");
  registerMsg.textContent = "";
  voteMsg.textContent = "";
}

/* ====== Navigation Buttons ====== */
registerBtn.addEventListener("click", () => showSection(registerForm));
voteBtn.addEventListener("click", async () => { showSection(voteForm); await loadParticipants(); });
leaderboardBtn.addEventListener("click", () => { showSection(leaderboard); loadLeaderboard(); });

regBack?.addEventListener("click", () => location.reload());
voteBack?.addEventListener("click", () => location.reload());

/* ====== Registration ====== */
submitRegisterBtn.addEventListener("click", async () => {
  submitRegisterBtn.disabled = true;

  const name = document.getElementById("teamName").value.trim();
  const classSection = document.getElementById("classSection").value.trim();

  if (!name || !classSection) {
    registerMsg.textContent = "⚠️ Please fill all fields.";
    submitRegisterBtn.disabled = false;
    return;
  }

  const participantsRef = ref(db, "participants");
  const snapshot = await get(participantsRef);
  const existing = snapshot.exists() ? Object.values(snapshot.val()) : [];
  const regNumber = String(existing.length + 1).padStart(3, "0");

  await push(participantsRef, {
    name,
    classSection,
    regNumber,
    votes: 0
  });

  registerMsg.textContent = `✅ Registered. Your Reg. No: ${regNumber}`;
  document.getElementById("teamName").value = "";
  document.getElementById("classSection").value = "";

  setTimeout(() => { submitRegisterBtn.disabled = false; }, 1200);
});

/* ====== Load Participants for Voting ====== */
async function loadParticipants() {
  participantListTbody.innerHTML = "";
  const refParticipants = ref(db, "participants");
  const snapshot = await get(refParticipants);

  if (!snapshot.exists()) {
    participantListTbody.innerHTML = `<tr><td colspan="4" style="color:var(--muted);padding:12px">No participants yet.</td></tr>`;
    return;
  }

  const data = snapshot.val();
  const rows = Object.entries(data).map(([key, val]) => ({ key, ...val }));
  rows.sort((a, b) => (a.regNumber || 0) - (b.regNumber || 0));

  rows.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.regNumber ?? "-"}</td>
      <td>${escapeHtml(row.name)}</td>
      <td>${escapeHtml(row.classSection)}</td>
      <td class="vote-cell-radio"><input type="radio" name="vote" value="${row.regNumber}" data-key="${row.key}"></td>
    `;
    participantListTbody.appendChild(tr);
  });
}

/* ====== Voting (1 per device) ====== */
submitVoteBtn.addEventListener("click", async () => {
  voteMsg.textContent = "";

  if (localStorage.getItem("hasVoted") === "true") {
    voteMsg.textContent = "⚠️ You have already voted from this device.";
    return;
  }

  const sel = document.querySelector('input[name="vote"]:checked');
  if (!sel) {
    voteMsg.textContent = "⚠️ Please select a participant.";
    return;
  }

  const key = sel.getAttribute("data-key");
  if (!key) {
    voteMsg.textContent = "⚠️ Invalid selection.";
    return;
  }

  try {
    const refPart = ref(db, `participants/${key}`);
    const snap = await get(refPart);

    if (!snap.exists()) {
      voteMsg.textContent = "⚠️ Participant not found.";
      return;
    }

    const current = snap.val().votes || 0;
    await update(refPart, { votes: current + 1 });

    localStorage.setItem("hasVoted", "true");
    voteMsg.textContent = "✅ Vote submitted successfully!";
    submitVoteBtn.disabled = true;
    document.querySelectorAll('input[name="vote"]').forEach(r => (r.disabled = true));
  } catch (err) {
    console.error(err);
    voteMsg.textContent = "❌ Error submitting vote.";
  }
});

/* ====== Leaderboard + Chart ====== */
let leaderboardChart;

function loadLeaderboard() {
  leaderList.innerHTML = "";
  const refParticipants = ref(db, "participants");

  onValue(refParticipants, (snapshot) => {
    leaderList.innerHTML = "";
    if (!snapshot.exists()) {
      leaderList.innerHTML = `<tr><td colspan="4" style="color:var(--muted);padding:12px">No participants yet.</td></tr>`;
      return;
    }

    const data = Object.values(snapshot.val());
    data.sort((a, b) => (b.votes || 0) - (a.votes || 0));

    data.forEach((p, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${p.regNumber}</td>
        <td>${escapeHtml(p.name)}</td>
        <td>${p.votes || 0}</td>
      `;
      leaderList.appendChild(tr);
    });

    // 🎃 Chart Update
    updateLeaderboardChart(data);
  });
}

/* ====== Chart Setup ====== */
function updateLeaderboardChart(data) {
  const ctx = leaderboardChartCanvas.getContext("2d");
  const labels = data.map(d => `${d.name} (${d.regNumber})`);
  const votes = data.map(d => d.votes || 0);

  if (leaderboardChart) leaderboardChart.destroy();

  leaderboardChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Votes",
        data: votes,
        backgroundColor: "rgba(255, 123, 0, 0.8)",
        borderColor: "rgba(255, 180, 70, 1)",
        borderWidth: 1.5,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          ticks: { color: "#fff", font: { size: 12 } },
          grid: { color: "rgba(255,255,255,0.1)" }
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#fff" },
          grid: { color: "rgba(255,255,255,0.1)" }
        }
      }
    }
  });
}

/* ====== Escape HTML ====== */
function escapeHtml(unsafe) {
  if (!unsafe && unsafe !== 0) return "";
  return String(unsafe)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ===== Admin toggle (Ctrl+Shift+A) ===== */
const adminPanel = document.getElementById("adminPanel");
const resetBtn = document.getElementById("resetVotes");

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") {
    adminPanel.classList.toggle("hidden");
  }
});

resetBtn?.addEventListener("click", async () => {
  if (confirm("⚠️ Reset all vote locks and votes?")) {
    localStorage.removeItem("hasVoted");
    await set(ref(db, "participants"), {});
    alert("✅ All votes and participants reset.");
  }
});
