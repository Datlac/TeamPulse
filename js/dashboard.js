import { auth, db } from "./firebase-config.js";
import {
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

let currentUserRole = null;

// Auth Check & Role Loading
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const userDoc = await getDoc(doc(db, "users", user.uid));
  const userData = userDoc.data();
  currentUserRole = userData.role;
  document.getElementById(
    "userInfo"
  ).innerText = `${userData.displayName} (${currentUserRole})`;

  // Show create button if admin/manager
  if (["admin", "manager"].includes(currentUserRole)) {
    document.getElementById("newProjectBtn").classList.remove("hidden");
  }

  loadProjects();
});

// Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
  signOut(auth).then(() => (window.location.href = "login.html"));
});

// Modal Logic
const modal = document.getElementById("projectModal");
document
  .getElementById("newProjectBtn")
  .addEventListener("click", () => modal.classList.remove("hidden"));
document
  .getElementById("closeProjModal")
  .addEventListener("click", () => modal.classList.add("hidden"));

// Create Project
document
  .getElementById("createProjectForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("projName").value;
    const desc = document.getElementById("projDesc").value;
    const deadline = document.getElementById("projDeadline").value;

    try {
      await addDoc(collection(db, "projects"), {
        name,
        description: desc,
        deadline,
        createdAt: new Date(),
        createdBy: auth.currentUser.uid,
      });
      modal.classList.add("hidden");
      e.target.reset();
    } catch (err) {
      console.error(err);
      alert("Error creating project: " + err.message);
    }
  });

// Load Projects (Real-time)
function loadProjects() {
  const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
  const container = document.getElementById("projectsContainer");

  onSnapshot(q, (snapshot) => {
    container.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const p = docSnap.data();
      const card = document.createElement("div");
      card.className =
        "bg-white p-4 rounded shadow hover:shadow-lg transition cursor-pointer border-l-4 border-blue-500";
      card.innerHTML = `
                <h3 class="font-bold text-lg">${p.name}</h3>
                <p class="text-gray-600 text-sm mb-2">${p.description}</p>
                <div class="text-xs text-gray-500">Deadline: ${p.deadline}</div>
            `;
      card.addEventListener("click", () => {
        window.location.href = `project.html?id=${docSnap.id}`;
      });
      container.appendChild(card);
    });
  });
}
