/* ====== Firebase (v12 modular) ====== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getDatabase, ref, push, onValue, update, get } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";

/* ====== Your Firebase Config ====== */
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

const teamListTbody = document.getElementById("teamList");
const leaderList = document.getElementById("leaderList");

const submitRegisterBtn = document.getElementById("submitRegister");
const submitVoteBtn = document.getElementById("submitVote");

const regBack = document.getElementById("regBack");
const voteBack = document.getElementById("voteBack");
const boardBack = document.getElementById("boardBack");

const registerMsg = document.getElementById("registerMsg");
const voteMsg = document.getElementById("voteMsg");

/* ====== Section Toggler ====== */
function showSection(section) {
  [registerForm, voteForm, leaderboard].forEach(s => s.classList.add("hidden"));
  section.classList.remove("hidden");
  registerMsg.textContent = "";
  voteMsg.textContent = "";
}

/* ====== Top Navigation Buttons ====== */
registerBtn.addEventListener("click", () => showSection(registerForm));
voteBtn.addEventListener("click", async () => { showSection(voteForm); await loadTeams(); });
leaderboardBtn.addEventListener("click", () => { showSection(leaderboard); loadLeaderboard(); });

/* ====== Back Buttons ====== */
regBack?.addEventListener("click", () => location.reload());
voteBack?.addEventListener("click", () => location.reload());
boardBack?.addEventListener("click", () => location.reload());

/* ====== Registration ====== */
submitRegisterBtn.addEventListener("click", async () => {
  submitRegisterBtn.disabled = true;

  const teamName = document.getElementById("teamName").value.trim();
  const leaderName = document.getElementById("leaderName").value.trim();
  const classSection = document.getElementById("classSection").value.trim();

  if (!teamName || !leaderName || !classSection) {
    registerMsg.textContent = "⚠️ Please fill all fields.";
    submitRegisterBtn.disabled = false;
    return;
  }

  const teamsRef = ref(db, "teams");
  const snapshot = await get(teamsRef);
  const existing = snapshot.exists() ? Object.values(snapshot.val()) : [];

  const duplicate = existing.some(
    t => t.teamName && t.teamName.toLowerCase() === teamName.toLowerCase()
  );
  if (duplicate) {
    registerMsg.textContent = "❌ This team name is already registered.";
    submitRegisterBtn.disabled = false;
    return;
  }

  const teamNumber = existing.length + 1;

  await push(teamsRef, {
    teamName,
    leaderName,
    classSection,
    teamNumber,
    votes: 0
  });

  registerMsg.textContent = `✅ Registered. Team No ${teamNumber}`;
  document.getElementById("teamName").value = "";
  document.getElementById("leaderName").value = "";
  document.getElementById("classSection").value = "";

  setTimeout(() => { submitRegisterBtn.disabled = false; }, 1200);
});

/* ====== Load Teams for Voting ====== */
async function loadTeams() {
  teamListTbody.innerHTML = "";
  const teamsRef = ref(db, "teams");
  const snapshot = await get(teamsRef);

  if (!snapshot.exists()) {
    teamListTbody.innerHTML = `<tr><td colspan="4" style="color:var(--muted);padding:12px">No teams registered yet.</td></tr>`;
    return;
  }

  const data = snapshot.val();
  const rows = Object.entries(data).map(([key, val]) => ({ key, ...val }));
  rows.sort((a, b) => (a.teamNumber || 0) - (b.teamNumber || 0));

  rows.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.teamNumber ?? "-"}</td>
      <td>${escapeHtml(row.teamName)}</td>
      <td>${escapeHtml(row.leaderName)} <span style="color:var(--muted)">(${escapeHtml(row.classSection)})</span></td>
      <td class="vote-cell-radio"><input type="radio" name="vote" value="${row.teamNumber}" data-key="${row.key}"></td>
    `;
    teamListTbody.appendChild(tr);
  });
}

/* ====== Voting (1 per device) ====== */
submitVoteBtn.addEventListener("click", async () => {
  voteMsg.textContent = "";

  // 🛑 Stop repeat votes
  if (localStorage.getItem("hasVoted") === "true") {
    voteMsg.textContent = "⚠️ You have already voted from this device.";
    return;
  }

  const sel = document.querySelector('input[name="vote"]:checked');
  if (!sel) {
    voteMsg.textContent = "⚠️ Please select a team first.";
    return;
  }

  const teamKey = sel.getAttribute("data-key");
  if (!teamKey) {
    voteMsg.textContent = "⚠️ Invalid selection. Try again.";
    return;
  }

  try {
    const teamRef = ref(db, `teams/${teamKey}`);
    const snap = await get(teamRef);

    if (!snap.exists()) {
      voteMsg.textContent = "⚠️ Team not found. Try again.";
      return;
    }

    const current = snap.val().votes || 0;
    await update(teamRef, { votes: current + 1 });

    localStorage.setItem("hasVoted", "true");
    voteMsg.textContent = "✅ Vote submitted successfully! You can’t vote again.";
    submitVoteBtn.disabled = true;
    document.querySelectorAll('input[name="vote"]').forEach(r => (r.disabled = true));
  } catch (err) {
    console.error("Vote error:", err);
    voteMsg.textContent = "❌ Something went wrong. Try again later.";
  }
});

/* ====== Leaderboard ====== */
function loadLeaderboard() {
  leaderList.innerHTML = "";
  const teamsRef = ref(db, "teams");
  onValue(teamsRef, (snapshot) => {
    leaderList.innerHTML = "";
    if (!snapshot.exists()) {
      leaderList.innerHTML = `<tr><td colspan="4" style="color:var(--muted);padding:12px">No teams yet.</td></tr>`;
      return;
    }

    const data = snapshot.val();
    const arr = Object.values(data).sort((a, b) => (b.votes || 0) - (a.votes || 0));

    arr.forEach((t, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${t.teamNumber}</td>
        <td>${escapeHtml(t.teamName)}</td>
        <td>${t.votes || 0}</td>
      `;
      leaderList.appendChild(tr);
    });
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

/* ====== Init ====== */
document.addEventListener("DOMContentLoaded", () => {
  [registerForm, voteForm, leaderboard].forEach(s => s.classList.add("hidden"));
});
/* ===== Admin toggle for resetting local vote lock ===== */
const adminPanel = document.getElementById("adminPanel");
const resetBtn = document.getElementById("resetVotes");

// Toggle visibility with Ctrl + Shift + A
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") {
    adminPanel.classList.toggle("hidden");
    console.log(adminPanel.classList.contains("hidden") ? "🔒 Admin panel hidden" : "🟢 Admin panel shown");
  }
});

// Reset localStorage flag
resetBtn?.addEventListener("click", () => {
  localStorage.removeItem("hasVoted");
  alert("✅ Local vote lock cleared. You can vote again from this device.");
});

