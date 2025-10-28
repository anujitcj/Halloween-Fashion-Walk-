// --- IMPORT FIREBASE MODULES ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue, update } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";

// --- FIREBASE CONFIG ---
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

// --- INITIALIZE FIREBASE ---
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- MAIN FUNCTION (run after page loads) ---
document.addEventListener("DOMContentLoaded", () => {

  // Grab the buttons from index.html
  const registerBtn = document.getElementById("register-btn");
  const voteBtn = document.getElementById("vote-btn");
  const leaderboardBtn = document.getElementById("leaderboard-btn");

  // ============ REGISTRATION ============
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
      <button id="backBtn">⬅️ Back</button>
    `;

    document.getElementById("backBtn").addEventListener("click", () => location.reload());

    document.getElementById("regForm").addEventListener("submit", async (e) => {
      e.preventDefault();

      const teamName = document.getElementById("teamName").value.trim();
      const leaderName = document.getElementById("leaderName").value.trim();
      const classSection = document.getElementById("classSection").value.trim();

      if (!teamName || !leaderName || !classSection) {
        document.getElementById("message").innerText = "⚠️ Please fill all fields.";
        return;
      }

      const teamRef = push(ref(db, "teams"));
      await set(teamRef, {
        teamName,
        leaderName,
        classSection,
        votes: 0
      });

      document.getElementById("message").innerText = `✅ Registered successfully!`;
    });
  }

  // ============ VOTING ============
  if (voteBtn) {
    voteBtn.addEventListener("click", showVotingPage);
  }

  function showVotingPage() {
    document.body.innerHTML = `<h2>Vote for Your Favorite Team</h2><div id="teams"></div><p id="message"></p><button id="backBtn">⬅️ Back</button>`;
    document.getElementById("backBtn").addEventListener("click", () => location.reload());

    const teamsRef = ref(db, "teams");
    onValue(teamsRef, (snapshot) => {
      const data = snapshot.val();
      const container = document.getElementById("teams");
      container.innerHTML = "";

      if (!data) {
        container.innerHTML = "<p>No teams registered yet.</p>";
        return;
      }

      for (const id in data) {
        const team = data[id];
        const div = document.createElement("div");
        div.innerHTML = `
          <input type="radio" name="vote" value="${id}"> 
          <strong>${team.teamName}</strong> (${team.leaderName}, ${team.classSection})
        `;
        container.appendChild(div);
      }

      const btn = document.createElement("button");
      btn.textContent = "Submit Vote";
      btn.onclick = () => {
        const choice = document.querySelector('input[name="vote"]:checked');
        if (!choice) {
          alert("Please select a team!");
          return;
        }
        const voteRef = ref(db, `teams/${choice.value}`);
        const currentVotes = data[choice.value].votes || 0;
        update(voteRef, { votes: currentVotes + 1 });
        document.getElementById("message").innerText = "✅ Vote submitted!";
      };
      container.appendChild(btn);
    });
  }

  // ============ LEADERBOARD ============
  if (leaderboardBtn) {
    leaderboardBtn.addEventListener("click", showLeaderboard);
  }

  function showLeaderboard() {
    document.body.innerHTML = `<h2>Leaderboard</h2><div id="board"></div><button id="backBtn">⬅️ Back</button>`;
    document.getElementById("backBtn").addEventListener("click", () => location.reload());

    const teamsRef = ref(db, "teams");
    onValue(teamsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        document.getElementById("board").innerHTML = "<p>No teams yet.</p>";
        return;
      }

      const sorted = Object.values(data).sort((a, b) => b.votes - a.votes);
      const board = document.getElementById("board");
      board.innerHTML = sorted.map((t, i) =>
        `<p>${i + 1}. <strong>${t.teamName}</strong> — ${t.votes} votes</p>`
      ).join("");
    });
  }

});
