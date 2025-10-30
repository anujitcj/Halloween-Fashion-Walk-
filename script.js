// ====== Firebase Setup ======
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  update,
  get,
  onValue,
  remove,
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";

// Firebase Config
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ====== DOM Elements ======
const voteSection = document.getElementById("voteSection");
const voteRegNumber = document.getElementById("voteRegNumber");
const voteMsg = document.getElementById("voteMsg");
const leaderboardBody = document.getElementById("leaderList");
const currentParticipantDisplay = document.getElementById("currentParticipant");

const adminPanel = document.getElementById("adminPanel");
const adminMsg = document.getElementById("adminMsg");
const adminCurrent = document.getElementById("adminCurrent");

const startPollBtn = document.getElementById("startPollBtn");
const stopPollBtn = document.getElementById("stopPollBtn");
const nextBtn = document.getElementById("nextBtn");

// ====== Globals ======
let currentParticipant = null;
let currentNumber = 1;
const maxParticipants = 30;
const adminPin = "1234";

// ====== Admin Mode Shortcut ======
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === "b") {
    const pin = prompt("Enter Admin PIN:");
    if (pin === adminPin) {
      adminPanel.classList.toggle("hidden");
      alert("✅ Admin mode activated!");
    } else {
      alert("❌ Wrong PIN");
    }
  }
});

// ====== Start Poll ======
startPollBtn.addEventListener("click", () => {
  if (!currentParticipant) {
    alert("No participant selected!");
    return;
  }

  set(ref(db, "activePoll"), {
    id: currentParticipant,
    active: true,
  });
  adminMsg.textContent = `Poll started for ${currentParticipant}`;
});

// ====== Stop Poll ======
stopPollBtn.addEventListener("click", () => {
  update(ref(db, "activePoll"), { active: false });
  adminMsg.textContent = "Poll stopped.";
});

// ====== Next Participant ======
nextBtn.addEventListener("click", () => {
  if (currentNumber < maxParticipants) {
    currentNumber++;
    currentParticipant = currentNumber.toString().padStart(3, "0");
    adminCurrent.textContent = currentParticipant;
    currentParticipantDisplay.textContent = `Participant ${currentParticipant}`;
  } else {
    alert("All participants done!");
  }
});

// ====== Reset Everything ======
function resetAll() {
  if (confirm("⚠️ This will clear all votes and reset everything. Continue?")) {
    remove(ref(db, "votes"));
    remove(ref(db, "activePoll"));
    currentNumber = 1;
    currentParticipant = "001";
    adminCurrent.textContent = "None";
    adminMsg.textContent = "✅ All data cleared.";
    alert("Reset complete.");
  }
}

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === "r") {
    resetAll();
  }
});

// ====== Live Poll Watcher (For All Audience Devices) ======
onValue(ref(db, "activePoll"), (snapshot) => {
  const data = snapshot.val();
  if (data && data.active) {
    voteSection.classList.remove("hidden");
    voteRegNumber.textContent = data.id;
    currentParticipantDisplay.textContent = `Now Voting: ${data.id}`;
    voteMsg.textContent = "";
  } else {
    voteSection.classList.add("hidden");
    voteMsg.textContent = "Poll not active right now";
  }
});

// ====== Voting Buttons ======
document.querySelectorAll(".voteBtn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const value = parseInt(btn.dataset.value);
    const pollSnap = await get(ref(db, "activePoll"));
    const poll = pollSnap.val();

    if (!poll || !poll.active) {
      voteMsg.textContent = "Poll not active right now";
      return;
    }

    const participantId = poll.id;
    const voteRef = ref(db, `votes/${participantId}`);

    const currentVotes = (await get(voteRef)).val() || {};
    const totalVotes = Object.keys(currentVotes).length + 1;

    const newVote = { value };
    currentVotes[`v${totalVotes}`] = newVote;

    await set(voteRef, currentVotes);
    voteMsg.textContent = `✅ Your vote for ${participantId} has been recorded!`;
  });
});

// ====== Leaderboard Updater ======
onValue(ref(db, "votes"), (snapshot) => {
  const data = snapshot.val();
  leaderboardBody.innerHTML = "";

  if (!data) return;

  const results = Object.entries(data).map(([id, votes]) => {
    const arr = Object.values(votes).map(v => v.value);
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    return { id, avg: avg.toFixed(2), count: arr.length };
  });

  results.sort((a, b) => b.avg - a.avg);

  results.forEach((res, i) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${i + 1}</td>
      <td>${res.id}</td>
      <td>${res.avg}</td>
      <td>${res.count}</td>
    `;
    leaderboardBody.appendChild(row);
  });
});
