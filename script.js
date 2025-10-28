<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
  const analytics = getAnalytics(app);
</script>

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const registerBtn = document.getElementById("registerBtn");
const voteBtn = document.getElementById("voteBtn");
const leaderboardBtn = document.getElementById("leaderboardBtn");
const registerForm = document.getElementById("registerForm");
const voteForm = document.getElementById("voteForm");
const leaderboard = document.getElementById("leaderboard");

const teamListDiv = document.getElementById("teamList");
const leaderList = document.getElementById("leaderList");

// Toggle views
registerBtn.onclick = () => showSection(registerForm);
voteBtn.onclick = () => showSection(voteForm);
leaderboardBtn.onclick = () => showSection(leaderboard);

function showSection(section) {
  [registerForm, voteForm, leaderboard].forEach(div => div.classList.add("hidden"));
  section.classList.remove("hidden");
}

// Registration logic
document.getElementById("submitRegister").onclick = async () => {
  const teamName = document.getElementById("teamName").value;
  const leaderName = document.getElementById("leaderName").value;
  const classSection = document.getElementById("classSection").value;

  if (!teamName || !leaderName || !classSection) return alert("Please fill all fields!");

  const snapshot = await db.ref("teams").once("value");
  const teamCount = snapshot.numChildren() + 1;
  const teamNum = teamCount.toString().padStart(2, "0");

  await db.ref("teams/team" + teamNum).set({
    teamNum,
    teamName,
    leaderName,
    classSection,
    votes: 0
  });

  document.getElementById("registerMsg").innerText = `✅ Registered as Team ${teamNum}`;
  document.getElementById("teamName").value = "";
  document.getElementById("leaderName").value = "";
  document.getElementById("classSection").value = "";
};

// Load teams for voting
async function loadTeams() {
  const snapshot = await db.ref("teams").once("value");
  teamListDiv.innerHTML = "";

  snapshot.forEach(child => {
    const team = child.val();
    const div = document.createElement("div");
    div.innerHTML = `
      <input type="radio" name="voteTeam" value="${team.teamNum}" id="${team.teamNum}">
      <label for="${team.teamNum}">Team ${team.teamNum}: ${team.teamName}</label>
    `;
    teamListDiv.appendChild(div);
  });
}

voteBtn.addEventListener("click", loadTeams);

document.getElementById("submitVote").onclick = async () => {
  const selected = document.querySelector('input[name="voteTeam"]:checked');
  if (!selected) return alert("Please select a team!");

  const teamNum = selected.value;
  const ref = db.ref("teams/team" + teamNum + "/votes");
  const snapshot = await ref.once("value");
  const currentVotes = snapshot.val() || 0;

  await ref.set(currentVotes + 1);
  document.getElementById("voteMsg").innerText = `✅ Vote submitted for Team ${teamNum}`;
};

// Live leaderboard
db.ref("teams").on("value", snapshot => {
  leaderList.innerHTML = "";
  const teams = [];
  snapshot.forEach(child => teams.push(child.val()));
  teams.sort((a, b) => b.votes - a.votes);
  teams.forEach(team => {
    const li = document.createElement("li");
    li.innerText = `Team ${team.teamNum}: ${team.teamName} - ${team.votes} votes`;
    leaderList.appendChild(li);
  });
});
