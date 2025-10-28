import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getDatabase, ref, push, onValue, update, get } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";

// 🔧 Firebase Config
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

// 🚀 Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 🎛️ Elements
const registerBtn = document.getElementById("registerBtn");
const voteBtn = document.getElementById("voteBtn");
const leaderboardBtn = document.getElementById("leaderboardBtn");
const registerForm = document.getElementById("registerForm");
const voteForm = document.getElementById("voteForm");
const leaderboard = document.getElementById("leaderboard");

// 🧭 Section toggle logic
registerBtn.onclick = () => showSection(registerForm);
voteBtn.onclick = () => { showSection(voteForm); loadTeams(); };
leaderboardBtn.onclick = () => { showSection(leaderboard); loadLeaderboard(); };

function showSection(section) {
  [registerForm, voteForm, leaderboard].forEach(div => div.classList.add("hidden"));
  section.classList.remove("hidden");
}

// 📝 Register Team (with duplicate + double-click protection)
const submitRegisterBtn = document.getElementById("submitRegister");

submitRegisterBtn.onclick = async () => {
  submitRegisterBtn.disabled = true; // ⛔ prevent double clicks

  const teamName = document.getElementById("teamName").value.trim();
  const leaderName = document.getElementById("leaderName").value.trim();
  const classSection = document.getElementById("classSection").value.trim();
  const msg = document.getElementById("registerMsg");

  if (!teamName || !leaderName || !classSection) {
    msg.textContent = "⚠️ Please fill all fields.";
    submitRegisterBtn.disabled = false;
    return;
  }

  const teamsRef = ref(db, "teams");
  const snapshot = await get(teamsRef);
  const existingTeams = snapshot.exists() ? Object.values(snapshot.val()) : [];

  // 🛑 Prevent duplicate team names
  const duplicate = existingTeams.some(t => t.teamName.toLowerCase() === teamName.toLowerCase());
  if (duplicate) {
    msg.textContent = "❌ Team name already registered!";
    submitRegisterBtn.disabled = false;
    return;
  }

  const teamCount = existingTeams.length;
  const teamNumber = teamCount + 1;

  await push(teamsRef, {
    teamName,
    leaderName,
    classSection,
    teamNumber,
    votes: 0
  });

  msg.textContent = `✅ Registered successfully! Your Team Number is ${teamNumber}`;
  document.getElementById("teamName").value = "";
  document.getElementById("leaderName").value = "";
  document.getElementById("classSection").value = "";

  // Re-enable after short delay
  setTimeout(() => submitRegisterBtn.disabled = false, 2000);
};

// 🗳️ Load Teams for Voting
async function loadTeams() {
  const teamList = document.getElementById("teamList");
  teamList.innerHTML = "";

  const teamsRef = ref(db, "teams");
  const snapshot = await get(teamsRef);

  if (snapshot.exists()) {
    const teams = Object.values(snapshot.val()).sort((a, b) => a.teamNumber - b.teamNumber);
    teams.forEach(team => {
      const div = document.createElement("div");
      div.innerHTML = `
        <label>
          <input type="radio" name="vote" value="${team.teamNumber}" />
          Team ${team.teamNumber} - ${team.teamName}
        </label>
      `;
      teamList.appendChild(div);
    });
  } else {
    teamList.innerHTML = "<p>No teams registered yet.</p>";
  }
}

// 🗳️ Submit Vote
document.getElementById("submitVote").onclick = async () => {
  const selected = document.querySelector('input[name="vote"]:checked');
  const msg = document.getElementById("voteMsg");

  if (!selected) {
    msg.textContent = "⚠️ Please select a team!";
    return;
  }

  const teamNum = parseInt(selected.value);
  const teamsRef = ref(db, "teams");
  const snapshot = await get(teamsRef);
  const data = snapshot.val();

  const teamKey = Object.keys(data).find(k => data[k].teamNumber === teamNum);
  const teamRef = ref(db, `teams/${teamKey}`);
  await update(teamRef, { votes: data[teamKey].votes + 1 });

  msg.textContent = `✅ Vote submitted successfully for Team ${teamNum}!`;
};

// 🏆 Live Leaderboard
function loadLeaderboard() {
  const leaderList = document.getElementById("leaderList");
  const teamsRef = ref(db, "teams");

  onValue(teamsRef, (snapshot) => {
    leaderList.innerHTML = "";
    if (snapshot.exists()) {
      const teams = Object.values(snapshot.val()).sort((a, b) => b.votes - a.votes);
      teams.forEach((team, index) => {
        const li = document.createElement("li");
        li.textContent = `#${index + 1} Team ${team.teamNumber}: ${team.teamName} — ${team.votes} votes`;
        leaderList.appendChild(li);
      });
    } else {
      leaderList.innerHTML = "<li>No teams yet.</li>";
    }
  });
}
