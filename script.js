/* ====== Firebase (v12 modular) ====== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getDatabase, ref, get, set, update, onValue } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";

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
const currentParticipant = document.getElementById("currentParticipant");
const voteMsg = document.getElementById("voteMsg");
const voteBtns = document.querySelectorAll(".voteBtn");

const adminPanel = document.getElementById("adminPanel");
const startPollBtn = document.getElementById("startPollBtn");
const stopPollBtn = document.getElementById("stopPollBtn");
const nextBtn = document.getElementById("nextBtn");
const adminMsg = document.getElementById("adminMsg");
const adminCurrent = document.getElementById("adminCurrent");

const liveChartCanvas = document.getElementById("liveChart");
const leaderboardChartCanvas = document.getElementById("leaderboardChart");

const ADMIN_PIN = "1989"; // change this if needed

let currentRegNumber = null;
let pollActive = false;
let nextRegNumber = 1;
let liveChart, leaderboardChart;

/* ====== Admin Toggle ====== */
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === "b") {
    const pin = prompt("Enter Admin PIN:");
    if (pin === ADMIN_PIN) adminPanel.classList.toggle("hidden");
    else alert("❌ Wrong PIN");
  }
});

/* ====== Admin Controls ====== */
startPollBtn.addEventListener("click", async () => {
  const reg = nextRegNumber.toString().padStart(3, "0");
  currentRegNumber = reg;
  await set(ref(db, "activePoll"), { regNumber: reg, active: true });
  pollActive = true;
  adminMsg.textContent = `✅ Poll started for ${reg}`;
  adminCurrent.textContent = reg;
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

/* ====== Reset System ====== */
const resetBtn = document.createElement("button");
resetBtn.textContent = "🧹 Reset All (Start Fresh)";
resetBtn.className = "btn btn-secondary";
resetBtn.style.marginTop = "15px";
adminPanel.appendChild(resetBtn);

resetBtn.addEventListener("click", async () => {
  if (!confirm("⚠️ Reset all votes and polls?")) return;
  await set(ref(db, "participants"), {});
  await set(ref(db, "activePoll"), {});
  await set(ref(db, "showLeaderboard"), false);
  nextRegNumber = 1;
  pollActive = false;
  currentRegNumber = null;
  adminCurrent.textContent = "None";
  adminMsg.textContent = "✅ Reset complete.";

  Object.keys(localStorage)
    .filter(k => k.startsWith("voted_"))
    .forEach(k => localStorage.removeItem(k));
});

/* ====== Leaderboard Toggle ====== */
const revealBtn = document.createElement("button");
revealBtn.textContent = "🏁 Show Final Leaderboard";
revealBtn.className = "btn btn-primary";
revealBtn.style.marginTop = "15px";
adminPanel.appendChild(revealBtn);

revealBtn.addEventListener("click", async () => {
  await set(ref(db, "showLeaderboard"), true);
  adminMsg.textContent = "📊 Final leaderboard visible to audience!";
});

/* ====== Firebase Listeners ====== */
onValue(ref(db, "activePoll"), (snap) => {
  if (!snap.exists()) {
    voteSection.classList.add("hidden");
    currentParticipant.textContent = "Waiting for next participant…";
    return;
  }

  const data = snap.val();
  if (data.active) {
    voteSection.classList.remove("hidden");
    currentRegNumber = data.regNumber;
    currentParticipant.textContent = `Now Performing: ${data.regNumber}`;
    showLiveChart(data.regNumber);
  } else {
    voteSection.classList.add("hidden");
    currentParticipant.textContent = `Poll closed for ${data.regNumber}`;
  }
});

onValue(ref(db, "showLeaderboard"), (snap) => {
  const show = snap.exists() && snap.val() === true;
  leaderboard.classList.toggle("hidden", !show);
});

/* ====== Voting (1–5) ====== */
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
    let data = snap.exists() ? snap.val() : { ratings: { 1:0,2:0,3:0,4:0,5:0 }, total:0, count:0, avg:0 };

    data.ratings[val] = (data.ratings[val] || 0) + 1;
    data.total += val;
    data.count += 1;
    data.avg = (data.total / data.count).toFixed(2);

    await set(pRef, data);
    localStorage.setItem(`voted_${reg}`, "true");
    voteMsg.textContent = "✅ Vote submitted!";
  });
});

/* ====== Live Distribution Chart ====== */
function showLiveChart(reg) {
  const pRef = ref(db, `participants/${reg}`);
  onValue(pRef, (snap) => {
    if (!snap.exists()) return;
    const data = snap.val().ratings || {1:0,2:0,3:0,4:0,5:0};
    const totalVotes = Object.values(data).reduce((a,b)=>a+b,0) || 1;
    const percentages = [1,2,3,4,5].map(i => ((data[i]||0)/totalVotes*100).toFixed(1));

    const ctx = liveChartCanvas.getContext("2d");
    if (liveChart) liveChart.destroy();

    liveChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["1 ⭐","2 ⭐","3 ⭐","4 ⭐","5 ⭐"],
        datasets: [{
          label: "% of Votes",
          data: percentages,
          backgroundColor: [
            "rgba(255,50,50,0.8)",
            "rgba(255,120,50,0.8)",
            "rgba(255,200,50,0.8)",
            "rgba(180,255,50,0.8)",
            "rgba(50,255,120,0.8)"
          ]
        }]
      },
      options: {
        scales: { y: { beginAtZero:true, max:100 } },
        plugins: { legend:{ display:false } },
        animation: false
      }
    });
  });
}

/* ====== Final Leaderboard Chart ====== */
onValue(ref(db, "participants"), (snap) => {
  if (!snap.exists()) return;
  const data = Object.entries(snap.val())
    .map(([reg, val]) => ({ reg, avg: val.avg || 0 }))
    .sort((a,b)=>b.avg-a.avg);

  leaderList.innerHTML = "";
  data.forEach((p,i)=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${i+1}</td><td>${p.reg}</td><td>${p.avg}</td>`;
    leaderList.appendChild(tr);
  });

  const ctx = leaderboardChartCanvas.getContext("2d");
  if (leaderboardChart) leaderboardChart.destroy();

  leaderboardChart = new Chart(ctx, {
    type:"bar",
    data:{
      labels:data.map(d=>d.reg),
      datasets:[{
        data:data.map(d=>((d.avg/5)*100).toFixed(1)),
        backgroundColor:"rgba(255,140,0,0.8)"
      }]
    },
    options:{
      scales:{y:{beginAtZero:true,max:100}},
      plugins:{legend:{display:false}},
      animation:{duration:1000}
    }
  });
});
