/* ====== Firebase Setup ====== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getDatabase, ref, set, get, update, onValue, remove } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";

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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* ====== Elements ====== */
const voteSection = document.getElementById("voteSection");
const leaderboardSection = document.getElementById("leaderboard");
const resultSection = document.getElementById("resultSection");
const adminPanel = document.getElementById("adminPanel");
const currentParticipant = document.getElementById("currentParticipant");
const voteBtns = document.querySelectorAll(".voteBtn");
const voteMsg = document.getElementById("voteMsg");
const voteRegNumber = document.getElementById("voteRegNumber");
const resultRegNumber = document.getElementById("resultRegNumber");
const leaderList = document.getElementById("leaderList");

const startPollBtn = document.getElementById("startPollBtn");
const stopPollBtn = document.getElementById("stopPollBtn");
const nextBtn = document.getElementById("nextBtn");
const resetBtn = document.getElementById("resetBtn");
const showLeaderboardBtn = document.getElementById("showLeaderboardBtn");
const adminMsg = document.getElementById("adminMsg");
const adminCurrent = document.getElementById("adminCurrent");

let currentNum = 1;
let pollActive = false;
let adminMode = false;
const MAX_PARTICIPANTS = 30;
let resultChart;

/* ====== Admin PIN (Ctrl + B) ====== */
document.addEventListener("keydown", e => {
  if (e.ctrlKey && e.key.toLowerCase() === "b") {
    const pin = prompt("Enter Admin PIN:");
    if (pin === "1234") {
      adminMode = true;
      adminPanel.classList.remove("hidden");
      alert("✅ Admin mode activated!");
    } else alert("❌ Wrong PIN");
  }
});

/* ====== Start Poll ====== */
startPollBtn.onclick = async () => {
  if (!adminMode) return;
  pollActive = true;
  const number = currentNum.toString().padStart(3, "0");
  voteSection.classList.remove("hidden");
  leaderboardSection.classList.add("hidden");
  resultSection.classList.add("hidden");
  voteRegNumber.textContent = number;
  currentParticipant.textContent = `Participant ${number}`;
  adminCurrent.textContent = number;
  await set(ref(db, "current"), { active: true, number: currentNum });
  await set(ref(db, "leaderboardVisible"), false);
  adminMsg.textContent = `Poll started for ${number}`;
};

/* ====== Stop Poll ====== */
stopPollBtn.onclick = async () => {
  if (!adminMode) return;
  pollActive = false;
  await update(ref(db, "current"), { active: false });
  voteSection.classList.add("hidden");
  adminMsg.textContent = "Poll stopped.";
  await showResultChart(currentNum);
};

/* ====== Next Participant ====== */
nextBtn.onclick = () => {
  if (!adminMode) return;
  if (currentNum < MAX_PARTICIPANTS) {
    currentNum++;
    resultSection.classList.add("hidden");
    startPollBtn.click();
  } else {
    adminMsg.textContent = "All participants completed.";
  }
};

/* ====== Reset All ====== */
resetBtn.onclick = async () => {
  if (!adminMode) return;
  if (confirm("⚠️ Reset EVERYTHING (votes, leaderboard & poll progress)?")) {
    await remove(ref(db, "votes"));
    await remove(ref(db, "current"));
    await set(ref(db, "leaderboardVisible"), false);
    localStorage.clear();
    currentNum = 1;
    pollActive = false;
    currentParticipant.textContent = "Awaiting next performance…";
    adminCurrent.textContent = "None";
    voteSection.classList.add("hidden");
    resultSection.classList.add("hidden");
    leaderboardSection.classList.add("hidden");
    adminMsg.textContent = "✅ All data reset successfully.";
    alert("All votes and data cleared!");
  }
};

/* ====== Voting Buttons ====== */
voteBtns.forEach(btn => {
  btn.onclick = async () => {
    if (!pollActive) {
      voteMsg.textContent = "⛔ Poll not active right now.";
      return;
    }

    const num = currentNum.toString().padStart(3, "0");
    if (localStorage.getItem(`voted_${num}`)) {
      voteMsg.textContent = "⚠️ You’ve already voted for this participant.";
      return;
    }

    const value = Number(btn.dataset.value);
    const voteRef = ref(db, `votes/${num}/ratings/${value}`);
    const snap = await get(voteRef);
    const count = snap.exists() ? snap.val() + 1 : 1;
    await set(voteRef, count);
    localStorage.setItem(`voted_${num}`, "true");

    voteMsg.textContent = "✅ Vote submitted!";
    setTimeout(() => (voteMsg.textContent = ""), 1500);
  };
});

/* ====== Leaderboard ====== */
showLeaderboardBtn.onclick = async () => {
  if (!adminMode) return;
  await set(ref(db, "leaderboardVisible"), true); // 🔥 show for all users
  adminPanel.classList.add("hidden");
  adminMsg.textContent = "📊 Leaderboard displayed to all viewers.";
  updateLeaderboard();
};

function updateLeaderboard() {
  onValue(ref(db, "votes"), snapshot => {
    leaderList.innerHTML = "";
    const data = snapshot.val() || {};
    const results = Object.entries(data).map(([id, v]) => {
      const ratings = v.ratings || {};
      const totalVotes = Object.values(ratings).reduce((a, b) => a + b, 0);
      const percentages = [1, 2, 3, 4, 5].map(
        n => ((ratings[n] || 0) / (totalVotes || 1) * 100).toFixed(0)
      );
      return { id, totalVotes, percentages };
    });

    results.sort((a, b) => b.totalVotes - a.totalVotes);
    leaderList.innerHTML = results.map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${r.id}</td>
        <td>${r.totalVotes}</td>
        ${r.percentages.map(p => `<td>${p}%</td>`).join("")}
      </tr>
    `).join("");
  });
}

/* ====== Show Participant Result Chart ====== */
async function showResultChart(num) {
  const number = num.toString().padStart(3, "0");
  resultRegNumber.textContent = number;
  resultSection.classList.remove("hidden");

  const snap = await get(ref(db, `votes/${number}/ratings`));
  const ratings = snap.exists() ? snap.val() : {};
  const total = Object.values(ratings).reduce((a, b) => a + b, 0);
  const percentages = [1, 2, 3, 4, 5].map(
    n => ((ratings[n] || 0) / (total || 1) * 100).toFixed(1)
  );

  const ctx = document.getElementById("resultChart").getContext("2d");
  if (resultChart) resultChart.destroy();
  resultChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["1", "2", "3", "4", "5"],
      datasets: [{
        label: "Vote % Distribution",
        data: percentages,
        backgroundColor: ["#ff6347", "#ffa500", "#ffd700", "#adff2f", "#32cd32"]
      }]
    },
    options: {
      indexAxis: "y",
      scales: {
        x: { beginAtZero: true, max: 100, title: { display: true, text: "Percentage (%)" } },
        y: { title: { display: true, text: "Ratings" } }
      },
      plugins: { legend: { display: false } },
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

/* ====== Sync Audience View ====== */
onValue(ref(db, "current"), async snap => {
  const val = snap.val();
  if (!val) return;
  currentNum = val.number;
  if (val.active) {
    resultSection.classList.add("hidden");
    leaderboardSection.classList.add("hidden");
    voteSection.classList.remove("hidden");
    const num = val.number.toString().padStart(3, "0");
    voteRegNumber.textContent = num;
    currentParticipant.textContent = `Participant ${num}`;
    pollActive = true;
  } else {
    pollActive = false;
    voteSection.classList.add("hidden");
    currentParticipant.textContent = `Showing results for ${val.number
      .toString()
      .padStart(3, "0")}`;
    await showResultChart(val.number);
  }
});

/* ====== Sync Leaderboard Visibility ====== */
onValue(ref(db, "leaderboardVisible"), snap => {
  const visible = snap.val();
  if (visible) {
    leaderboardSection.classList.remove("hidden");
    voteSection.classList.add("hidden");
    resultSection.classList.add("hidden");
    updateLeaderboard();
  } else {
    leaderboardSection.classList.add("hidden");
  }
});
