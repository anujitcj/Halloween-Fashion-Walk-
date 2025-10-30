/* ====== Firebase (v12.5.0 modular) ====== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-analytics.js";
import { getDatabase, ref, set, get, update, onValue, remove } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";

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

/* ====== Initialize Firebase ====== */
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase(app);

/* ====== Elements ====== */
const voteSection = document.getElementById("voteSection");
const leaderboardSection = document.getElementById("leaderboard");
const adminPanel = document.getElementById("adminPanel");
const currentParticipant = document.getElementById("currentParticipant");
const voteBtns = document.querySelectorAll(".voteBtn");
const voteMsg = document.getElementById("voteMsg");
const voteRegNumber = document.getElementById("voteRegNumber");
const leaderList = document.getElementById("leaderList");

const startPollBtn = document.getElementById("startPollBtn");
const stopPollBtn = document.getElementById("stopPollBtn");
const nextBtn = document.getElementById("nextBtn");
const resetBtn = document.getElementById("resetBtn");
const showLeaderboardBtn = document.getElementById("showLeaderboardBtn");
const adminMsg = document.getElementById("adminMsg");

let currentNum = 1;
let pollActive = false;
let adminMode = false;
const MAX_PARTICIPANTS = 30;

/* ====== Admin PIN (Ctrl + B) ====== */
document.addEventListener("keydown", e => {
  if (e.ctrlKey && e.key.toLowerCase() === "b") {
    const pin = prompt("Enter Admin PIN:");
    if (pin === "1234") {
      adminMode = true;
      adminPanel.classList.remove("hidden");
      alert("✅ Admin mode activated!");
    } else {
      alert("❌ Wrong PIN");
    }
  }
});

/* ====== Start Poll ====== */
startPollBtn.onclick = async () => {
  if (!adminMode) return;
  pollActive = true;
  voteSection.classList.remove("hidden");
  leaderboardSection.classList.add("hidden");

  const number = currentNum.toString().padStart(3, "0");
  voteRegNumber.textContent = number;
  currentParticipant.textContent = `Participant ${number}`;

  await set(ref(db, "current"), { active: true, number: currentNum });
  adminMsg.textContent = `Poll started for ${number}`;
};

/* ====== Stop Poll ====== */
stopPollBtn.onclick = async () => {
  if (!adminMode) return;
  pollActive = false;
  await update(ref(db, "current"), { active: false });
  voteSection.classList.add("hidden");
  adminMsg.textContent = "Poll stopped.";
};

/* ====== Next Participant ====== */
nextBtn.onclick = () => {
  if (!adminMode) return;
  if (currentNum < MAX_PARTICIPANTS) {
    currentNum++;
    adminMsg.textContent = `Moved to ${currentNum.toString().padStart(3, "0")}`;
    startPollBtn.click();
  } else {
    adminMsg.textContent = "All participants completed.";
  }
};

/* ====== Reset All ====== */
resetBtn.onclick = async () => {
  if (!adminMode) return;
  if (confirm("⚠️ Reset everything (votes & progress)?")) {
    await remove(ref(db));
    currentNum = 1;
    adminMsg.textContent = "✅ All data reset.";
  }
};

/* ====== Audience Vote Buttons ====== */
voteBtns.forEach(btn => {
  btn.onclick = async () => {
    if (!pollActive) {
      voteMsg.textContent = "⛔ Poll not active right now.";
      return;
    }
    const value = Number(btn.dataset.value);
    const num = currentNum.toString().padStart(3, "0");
    const snap = await get(ref(db, `votes/${num}`));
    let data = snap.exists() ? snap.val() : { total: 0, count: 0 };
    data.total += value;
    data.count += 1;
    await set(ref(db, `votes/${num}`), data);
    voteMsg.textContent = "✅ Vote submitted!";
    setTimeout(() => (voteMsg.textContent = ""), 1500);
  };
});

/* ====== Show Leaderboard ====== */
showLeaderboardBtn.onclick = async () => {
  leaderboardSection.classList.remove("hidden");
  adminPanel.classList.add("hidden");
  updateLeaderboard();
};

/* ====== Real-time Leaderboard ====== */
function updateLeaderboard() {
  onValue(ref(db, "votes"), snapshot => {
    leaderList.innerHTML = "";
    const data = snapshot.val() || {};
    const arr = Object.entries(data).map(([id, v]) => ({
      id,
      avg: v.count ? (v.total / v.count).toFixed(2) : "0.00",
      votes: v.count || 0
    }));
    arr.sort((a, b) => b.avg - a.avg);

    leaderList.innerHTML = arr
      .map(
        (p, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${p.id}</td>
          <td>${p.avg}</td>
          <td>${p.votes}</td>
        </tr>`
      )
      .join("");
  });
}

/* ====== Sync Audience View ====== */
onValue(ref(db, "current"), snap => {
  const val = snap.val();
  if (!val || !val.active) {
    voteSection.classList.add("hidden");
    currentParticipant.textContent = "Awaiting next performance…";
  } else {
    voteSection.classList.remove("hidden");
    voteRegNumber.textContent = val.number.toString().padStart(3, "0");
    currentParticipant.textContent = `Participant ${val.number
      .toString()
      .padStart(3, "0")}`;
  }
});
