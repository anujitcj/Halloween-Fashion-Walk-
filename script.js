/* ====== Firebase (v12 modular) ====== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getDatabase, ref, push, onValue, update, get } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";

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

const participantListTbody = document.getElementById("participantList");
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

/* ====== Top Buttons ====== */
registerBtn.addEventListener("click", () => showSection(registerForm));
voteBtn.addEventListener("click", async () => { showSection(voteForm); await loadParticipants(); });
leaderboardBtn.addEventListener("click", () => { showSection(leaderboard); loadLeaderboard(); });

/* ====== Back Buttons ====== */
regBack?.addEventListener("click", () => location.reload());
voteBack?.addEventListener("click", () => location.reload());

/* ====== Registration ====== */
submitRegisterBtn.addEventListener("click", async () => {
  submitRegisterBtn.disabled = true;

  const name = document.getElementById("participantName").value.trim();
  const classSection = document.getElementById("classSection").value.trim();

  if (!name || !classSection) {
    registerMsg.textContent = "⚠️ Please fill all fields.";
    submitRegisterBtn.disabled = false;
    return;
  }

  const participantsRef = ref(db, "participants");
  const snapshot = await get(participantsRef);
  const existing = snapshot.exists() ? Object.values(snapshot.val()) : [];

  // Auto-generate registration number: 001, 002, etc.
  const participantNumber = existing.length + 1;
  const regNumber = participantNumber.toString().padStart(3, "0");

  await push(participantsRef, {
    name,
    classSection,
    regNumber,
    participantNumber,
    votes: 0
  });

  registerMsg.textContent = `✅ Registered successfully! Your ID is ${regNumber}`;
  document.getElementById("participantName").value = "";
  document.getElementById("classSection").value = "";

  setTimeout(() => { submitRegisterBtn.disabled = false; }, 1200);
});

/* ====== Load Participants ====== */
async function loadParticipants() {
  participantListTbody.innerHTML = "";
  const participantsRef = ref(db, "participants");
  const snapshot = await get(participantsRef);

  if (!snapshot.exists()) {
    participantListTbody.innerHTML = `<tr><td colspan="4" style="color:var(--muted);padding:12px">No participants registered yet.</td></tr>`;
    return;
  }

  const data = snapshot.val();
  const rows = Object.entries(data).map(([key, val]) => ({ key, ...val }));
  rows.sort((a, b) => (a.participantNumber || 0) - (b.participantNumber || 0));

  rows.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.regNumber}</td>
      <td>${escapeHtml(row.name)}</td>
      <td>${escapeHtml(row.classSection)}</td>
      <td class="vote-cell-radio"><input type="radio" name="vote" value="${row.regNumber}" data-key="${row.key}"></td>
    `;
    participantListTbody.appendChild(tr);
  });
}

/* ====== Voting ====== */
submitVoteBtn.addEventListener("click", async () => {
  voteMsg.textContent = "";

  if (localStorage.getItem("hasVoted") === "true") {
    voteMsg.textContent = "⚠️ You have already voted from this device.";
    return;
  }

  const sel = document.querySelector('input[name="vote"]:checked');
  if (!sel) {
    voteMsg.textContent = "⚠️ Please select a participant first.";
    return;
  }

  const participantKey = sel.getAttribute("data-key");
  if (!participantKey) {
    voteMsg.textContent = "⚠️ Invalid selection. Try again.";
    return;
  }

  try {
    const participantRef = ref(db, `participants/${participantKey}`);
    const snap = await get(participantRef);

    if (!snap.exists()) {
      voteMsg.textContent = "⚠️ Participant not found. Try again.";
      return;
    }

    const current = snap.val().votes || 0;
    await update(participantRef, { votes: current + 1 });

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
  const participantsRef = ref(db, "participants");
  onValue(participantsRef, (snapshot) => {
    leaderList.innerHTML = "";
    if (!snapshot.exists()) {
      leaderList.innerHTML = `<tr><td colspan="4" style="color:var(--muted);padding:12px">No participants yet.</td></tr>`;
      return;
    }

    const data = snapshot.val();
    const arr = Object.values(data).sort((a, b) => (b.votes || 0) - (a.votes || 0));

    arr.forEach((p, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${p.regNumber}</td>
        <td>${escapeHtml(p.name)}</td>
        <td>${p.votes || 0}</td>
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

/* ====== Admin Reset Local Vote Lock ====== */
const adminPanel = document.getElementById("adminPanel");
const resetBtn = document.getElementById("resetVotes");

// Toggle admin panel with Ctrl+Shift+A
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") {
    adminPanel.classList.toggle("hidden");
    console.log(adminPanel.classList.contains("hidden") ? "🔒 Admin hidden" : "🟢 Admin shown");
  }
});

// Reset localStorage flag
resetBtn?.addEventListener("click", () => {
  localStorage.removeItem("hasVoted");
  alert("✅ Local vote lock cleared. You can vote again from this device.");
});
