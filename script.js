// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue, update } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";

// Firebase configuration
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

// ----------- REGISTRATION -----------
const registerBtn = document.getElementById("register-btn");
const voteBtn = document.getElementById("vote-btn");
const leaderboardBtn = document.getElementById("leaderboard-btn");

if (registerBtn) {
  registerBtn.addEventListener("click", showRegistrationForm);
}

function showRegistrationForm() {
  document.body.innerHTML = `
    <h2>Register Your Team</h2>
    <form id="regForm">
      <input placeholder="Team Name" id="teamName" required><br>
      <input placeholder="Team Leader's Name" id="leaderName" required><br>
      <input placeholder="Class & Section" id="classSection" required><br>
      <button type="submit">Submit</button>
    </form>
    <p id="message"></p>
  `;

  document.getElementById("regForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const teamName = document.getElementById("teamName").value;
    const leaderName = document.getElementById("leaderName").value;
    const classSection = document.getElementById("classSection").value;

    const teamRef = push(ref(db, "teams"));
    await set(teamRef, {
      teamName,
      leaderName,
      classSection,
      votes: 0
    });

    const teamNumber = teamRef.key.slice(-2).toUpperCase();
    document.getElementById("message").innerText = `✅ Registered successfully as Team ${teamNumber}`;
  });
}

// ----------- VOTING -----------
if (voteBtn) {
  voteBtn.addEventListener("click", showVotingPage);
}

function showVotingPage() {
  document.body.innerHTML = `<h2>Vote for Your Favorite Team</h2><div id="teams"></div><p id="message"></p>`;

  const teamsRef = ref(db, "teams");
  onValue(teamsRef, (snapshot) => {
    const data = snapshot.val();
    const container = document.getElementById("teams");
    container.innerHTML = "";

    for (const id in data) {
      const team = data[id];
      const div = document.createElement("div");
      div.innerHTML = `
        <input type="radio" name="vote" value="${id}"> ${team.teamName} (${team.leaderName})
      `;
      container.appendChild(div);
    }

    const btn = document.createElement("button");
    btn.textContent = "Submit Vote";
    btn.onclick = () => {
      const choice = document.querySelector('input[name="vote"]:checked');
      if (!choice) return alert("Please select a team!");
      const voteRef = ref(db, `teams/${choice.value}`);
      update(voteRef, { votes: (data[choice.value].votes || 0) + 1 });
      document.getElementById("message").innerText = "✅ Vote submitted!";
    };
    container.appendChild(btn);
  });
}

// ----------- LEADERBOARD -----------
if (leaderboardBtn) {
  leaderboardBtn.addEventListener("click", showLeaderboard);
}

function showLeaderboard() {
  document.body.innerHTML = `<h2>Leaderboard</h2><div id="board"></div>`;
  const teamsRef = ref(db, "teams");

  onValue(teamsRef, (snapshot) => {
    const data = snapshot.val();
    const sorted = Object.values(data || {}).sort((a, b) => b.votes - a.votes);
    const board = document.getElementById("board");
    board.innerHTML = sorted.map((t, i) => `${i + 1}. ${t.teamName} — ${t.votes} votes`).join("<br>");
  });
}
