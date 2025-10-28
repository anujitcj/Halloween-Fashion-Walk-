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

const teamListTbody = document.getElementById("teamList");
const leaderList = document.getElementById("leaderList");

const submitRegisterBtn = document.getElementById("submitRegister");
const submitVoteBtn = document.getElementById("submitVote");

const regBack = document.getElementById("regBack");
const voteBack = document.getElementById("voteBack");

const registerMsg = document.getElementById("registerMsg");
const voteMsg = document.getElementById("voteMsg");

/* ====== Section Toggle ====== */
function showSection(section) {
  [registerForm, voteForm, leaderboard].forEach(s => s.classList.add("hidden"));
  section.classList.remove("hidden");
  registerMsg.textContent = "";
  voteMsg.textContent = "";
}

/* ====== Navigation ====== */
registerBtn.addEventListener("click", () => showSection(registerForm));
voteBtn.addEventListener("click", async () => { showSection(voteForm); await loadTeams(); });
leaderboardBtn.addEventListener("click", () => { showSection(leaderboard); loadLeaderboard(); });

/* ====== Back Buttons ====== */
regBack?.addEventListener("click", () => location.reload());
voteBack?.addEventListener("click", () => location.reload());

/* ====== Registration (Solo Event) ====== */
submitRegisterBtn.addEventListener("click", async () => {
  submitRegisterBtn.disabled = true;

  const name = document.getElementById("participantName").value.trim();
  const classSection = document.getElementById("classSection").value.trim();

  if (!name || !classSection) {
    registerMsg.textContent = "⚠️ Please fill all fields.";
    submitRegisterBtn.disabled = false;
    return;
  }

  const teamsRef = ref(db, "participants");
  const snapshot = await get(teamsRef);
  const existing = snapshot.exists() ? Object.values(snapshot.val()) : [];
  const duplicate = existing.some(t => t.name && t.name.toLowerCase() === name.toLowerCase());

  if (duplicate) {
    registerMsg.textContent = "❌ This name is already registered.";
    submitRegisterBtn.disabled = false;
    return;
  }

  const regNumber = String(existing.length + 1).padStart(3, "0");

  await push(teamsRef, {
    name,
    classSection,
    regNumber,
    votes: 0
  });

  registerMsg.textContent = `✅ Registered successfully. Your Reg No: ${regNumber}`;
  document.getElementById("participantName").value = "";
  document.getElementById("classSection").value = "";

  setTimeout(() => { submitRegisterBtn.disabled = false; }, 1200);
});

/* ====== Load Participants for Voting ====== */
async function loadTeams() {
  teamListTbody.innerHTML = "";
  const teamsRef = ref(db, "participants");
  const snapshot = await get(teamsRef);

  if (!snapshot.exists()) {
    teamListTbody.innerHTML = `<tr><td colspan="4" style="color:var(--muted);padding:12px">No participants yet.</td></tr>`;
    return;
  }

  const data = snapshot.val();
  const rows = Object.entries(data).map(([key, val]) => ({ key, ...val }));
  rows.sort((a, b) => (a.regNumber || 0) - (b.regNumber || 0));

  rows.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.regNumber}</td>
      <td>${escapeHtml(row.name)}</td>
      <td>${escapeHtml(row.classSection)}</td>
      <td class="vote-cell-radio"><input type="radio" name="vote" value="${row.regNumber}" data-key="${row.key}"></td>
    `;
    teamListTbody.appendChild(tr);
  });
}

/* ====== Global Reset Sync ====== */
async function checkGlobalReset() {
  const settingsRef = ref(db, "settings/resetVersion");
  const snapshot = await get(settingsRef);
  const globalVersion = snapshot.exists() ? snapshot.val() : 1;
  const localVersion = localStorage.getItem("votedVersion") || 0;

  if (parseInt(localVersion) !== parseInt(globalVersion)) {
    localStorage.removeItem("hasVoted");
    localStorage.setItem("votedVersion", globalVersion);
  }
}

/* ====== Voting ====== */
submitVoteBtn.addEventListener("click", async () => {
  await checkGlobalReset();

  if (localStorage.getItem("hasVoted") === "true") {
    voteMsg.textContent = "⚠️ You have already voted from this device.";
    return;
  }

  const sel = document.querySelector('input[name="vote"]:checked');
  if (!sel) {
    voteMsg.textContent = "⚠️ Please select a participant first.";
    return;
  }

  const key = sel.getAttribute("data-key");
  if (!key) {
    voteMsg.textContent = "⚠️ Invalid selection.";
    return;
  }

  try {
    const refPath = ref(db, `participants/${key}`);
    const snap = await get(refPath);
    if (!snap.exists()) {
      voteMsg.textContent = "⚠️ Participant not found.";
      return;
    }

    const current = snap.val().votes || 0;
    await update(refPath, { votes: current + 1 });

    localStorage.setItem("hasVoted", "true");
    voteMsg.textContent = "✅ Vote submitted successfully!";
    submitVoteBtn.disabled = true;
    document.querySelectorAll('input[name="vote"]').forEach(r => (r.disabled = true));
  } catch (err) {
    console.error("Vote error:", err);
    voteMsg.textContent = "❌ Something went wrong.";
  }
});

/* ====== Leaderboard ====== */
function loadLeaderboard() {
  leaderList.innerHTML = "";
  const refPath = ref(db, "participants");
  onValue(refPath, (snapshot) => {
    leaderList.innerHTML = "";
    if (!snapshot.exists()) {
      leaderList.innerHTML = `<tr><td colspan="4" style="color:var(--muted);padding:12px">No participants yet.</td></tr>`;
      return;
    }

    const data = snapshot.val();
    const arr = Object.values(data).sort((a, b) => (b.votes || 0) - (a.votes || 0));

    arr.forEach((t, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${t.regNumber}</td>
        <td>${escapeHtml(t.name)}</td>
        <td>${t.votes || 0}</td>
      `;
      leaderList.appendChild(tr);
    });
  });
}

/* ====== Escape HTML ====== */
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[m]);
}

/* ====== Admin Global Reset ====== */
const adminPanel = document.getElementById("adminPanel");
const resetGlobalVotes = document.getElementById("resetGlobalVotes");

// Toggle Admin with Ctrl + Shift + A
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") {
    adminPanel.classList.toggle("hidden");
  }
});

// Global Reset Button
resetGlobalVotes?.addEventListener("click", async () => {
  const settingsRef = ref(db, "settings/resetVersion");
  const snapshot = await get(settingsRef);
  const currentVersion = snapshot.exists() ? snapshot.val() : 1;
  const newVersion = currentVersion + 1;

  await set(settingsRef, newVersion);
  alert(`✅ Global vote lock reset! Version updated to ${newVersion}`);
});

/* ====== Init ====== */
document.addEventListener("DOMContentLoaded", async () => {
  await checkGlobalReset();
  [registerForm, voteForm, leaderboard].forEach(s => s.classList.add("hidden"));
});
