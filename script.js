/* MODULE style Firebase v12 (browser) */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getDatabase, ref, push, onValue, update, get, remove } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";

/* ====== Replace with your config (already set in your project) ====== */
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
/* ================================================================== */

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* Elements */
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

/* helper: show a single section */
function showSection(section){
  [registerForm, voteForm, leaderboard].forEach(s => s.classList.add("hidden"));
  section.classList.remove("hidden");
  // clear messages
  registerMsg && (registerMsg.textContent = "");
  voteMsg && (voteMsg.textContent = "");
}

/* top buttons */
registerBtn.addEventListener("click", () => showSection(registerForm));
voteBtn.addEventListener("click", async () => { showSection(voteForm); await loadTeams(); });
leaderboardBtn.addEventListener("click", () => { showSection(leaderboard); loadLeaderboard(); });

/* back buttons */
regBack && regBack.addEventListener("click", () => location.reload());
voteBack && voteBack.addEventListener("click", () => location.reload());
boardBack && boardBack.addEventListener("click", () => location.reload());

/* ------- Registration logic (duplicate + double-click safe) ------- */
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

  // Prevent duplicate names
  const duplicate = existing.some(t => t.teamName && t.teamName.toLowerCase() === teamName.toLowerCase());
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

/* ------- Load teams into styled table for voting ------- */
async function loadTeams(){
  teamListTbody.innerHTML = "";
  const teamsRef = ref(db, "teams");
  const snapshot = await get(teamsRef);

  if (!snapshot.exists()){
    teamListTbody.innerHTML = `<tr><td colspan="4" style="color:var(--muted);padding:12px">No teams registered yet.</td></tr>`;
    return;
  }

  // convert to array and sort by teamNumber
  const data = snapshot.val();
  const rows = Object.entries(data).map(([key, val]) => ({ key, ...val }));
  rows.sort((a,b) => (a.teamNumber||0) - (b.teamNumber||0));

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

/* ------- Submit vote (increments votes for selected team) ------- */
submitVoteBtn.addEventListener("click", async () => {
  voteMsg.textContent = "";
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

  const teamRef = ref(db, `teams/${teamKey}`);
  const snap = await get(teamRef);
  const current = snap.exists() ? (snap.val().votes || 0) : 0;
  await update(teamRef, { votes: current + 1 });

  voteMsg.textContent = "✅ Vote submitted. Thank you!";
});

/* ------- Leaderboard (live) ------- */
function loadLeaderboard(){
  leaderList.innerHTML = "";
  const teamsRef = ref(db, "teams");
  onValue(teamsRef, (snapshot) => {
    leaderList.innerHTML = "";
    if (!snapshot.exists()) {
      leaderList.innerHTML = `<li style="color:var(--muted)">No teams yet.</li>`;
      return;
    }
    const data = snapshot.val();
    const arr = Object.values(data).sort((a,b) => (b.votes||0) - (a.votes||0));
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

/* ------- small util: escape HTML to avoid injected text from inputs ------- */
function escapeHtml(unsafe){
  if (!unsafe && unsafe !== 0) return "";
  return String(unsafe)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'", "&#039;");
}

/* Keep homepage minimal: hide cards at start */
document.addEventListener("DOMContentLoaded", () => {
  showSection(document.querySelector('.card')?.classList.contains('hidden') ? registerForm : registerForm);
  // initially hide all cards; user clicks top buttons to show
  registerForm.classList.add('hidden');
  voteForm.classList.add('hidden');
  leaderboard.classList.add('hidden');
});
