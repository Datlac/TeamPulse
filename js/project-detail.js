import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  onSnapshot,
  query,
  getDocs,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get("id");

let currentUser = null;
let allUsers = []; // Cache list users để populate dropdown

if (!projectId) window.location.href = "index.html";

// Init
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  const userDoc = await getDoc(doc(db, "users", user.uid));
  const userData = userDoc.data();

  // Check role to show Add Button
  if (["admin", "manager"].includes(userData.role)) {
    document.getElementById("newTaskBtn").classList.remove("hidden");
  }

  loadProjectInfo();
  loadUsers();
  loadTasks();
});

async function loadProjectInfo() {
  const docSnap = await getDoc(doc(db, "projects", projectId));
  if (docSnap.exists()) {
    document.getElementById("projectTitle").innerText = docSnap.data().name;
  }
}

// Lấy danh sách user để hiển thị trong form assign
async function loadUsers() {
  const q = query(collection(db, "users"));
  const snapshot = await getDocs(q);
  snapshot.forEach((doc) => allUsers.push(doc.data()));
}

// Logic Task Modal
const taskModal = document.getElementById("taskModal");
const subtaskList = document.getElementById("subtaskList");

document.getElementById("newTaskBtn").addEventListener("click", () => {
  taskModal.classList.remove("hidden");
  addSubtaskLine(); // Add 1 empty line by default
});
document
  .getElementById("closeTaskModal")
  .addEventListener("click", () => taskModal.classList.add("hidden"));

document
  .getElementById("addSubtaskLineBtn")
  .addEventListener("click", addSubtaskLine);

function addSubtaskLine() {
  const div = document.createElement("div");
  div.className = "flex gap-2";

  // Select user
  let userOptions = allUsers
    .map(
      (u) => `<option value="${u.uid}">${u.displayName} (${u.role})</option>`
    )
    .join("");

  div.innerHTML = `
        <input type="text" placeholder="Subtask description" class="flex-1 border p-1 rounded subtask-desc" required>
        <select class="border p-1 rounded subtask-user w-1/3">
            ${userOptions}
        </select>
        <button type="button" class="text-red-500 px-2 remove-line">x</button>
    `;

  div
    .querySelector(".remove-line")
    .addEventListener("click", () => div.remove());
  subtaskList.appendChild(div);
}

// Create Task Logic
document
  .getElementById("createTaskForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    // Build subtasks array
    const subtaskRows = document.querySelectorAll("#subtaskList > div");
    const subtasks = [];
    const assignees = new Set(); // Unique assignees

    subtaskRows.forEach((row) => {
      const desc = row.querySelector(".subtask-desc").value;
      const uid = row.querySelector(".subtask-user").value;
      assignees.add(uid);
      subtasks.push({
        id: Date.now() + Math.random().toString(), // Simple ID
        description: desc,
        assigneeId: uid,
        isCompleted: false,
      });
    });

    const taskData = {
      name: document.getElementById("taskName").value,
      description: document.getElementById("taskDesc").value,
      startDate: document.getElementById("taskStart").value,
      endDate: document.getElementById("taskEnd").value,
      priority: document.getElementById("taskPriority").value,
      status: "todo", // Default
      subTasks: subtasks,
      assignees: Array.from(assignees),
      createdAt: new Date(),
    };

    try {
      await addDoc(collection(db, "projects", projectId, "tasks"), taskData);
      taskModal.classList.add("hidden");
      e.target.reset();
      subtaskList.innerHTML = "";
    } catch (err) {
      alert(err.message);
    }
  });

// Load and Render Tasks (Real-time)
function loadTasks() {
  const q = collection(db, "projects", projectId, "tasks");

  onSnapshot(q, (snapshot) => {
    // Clear columns
    document.getElementById("col-todo").innerHTML = "";
    document.getElementById("col-inprogress").innerHTML = "";
    document.getElementById("col-done").innerHTML = "";

    snapshot.forEach((docSnap) => {
      const task = docSnap.data();
      const taskId = docSnap.id;
      renderTaskCard(taskId, task);
    });
  });
}

function renderTaskCard(taskId, task) {
  const card = document.createElement("div");
  card.className = "bg-white p-3 rounded shadow border-l-4 task-card mb-3";

  // Color code priority
  if (task.priority === "high") card.classList.add("border-red-500");
  else if (task.priority === "medium") card.classList.add("border-yellow-500");
  else card.classList.add("border-blue-500");

  // Calculate Progress
  const totalSub = task.subTasks.length;
  const completedSub = task.subTasks.filter((s) => s.isCompleted).length;
  const percent =
    totalSub === 0 ? 0 : Math.round((completedSub / totalSub) * 100);

  // Render Subtasks list
  let subtasksHtml = '<div class="mt-2 space-y-1 text-sm border-t pt-2">';
  task.subTasks.forEach((sub, index) => {
    const isMyTask = sub.assigneeId === currentUser.uid;
    const assigneeName =
      allUsers.find((u) => u.uid === sub.assigneeId)?.displayName || "Unknown";

    // Checkbox logic: Disabled if not my task, or checked if done
    const disabled = isMyTask ? "" : "disabled";
    const checked = sub.isCompleted ? "checked" : "";
    const lineThrough = sub.isCompleted ? "line-through text-gray-400" : "";

    subtasksHtml += `
            <div class="flex items-center gap-2 ${lineThrough}">
                <input type="checkbox" ${checked} ${disabled} 
                    onchange="toggleSubtask('${taskId}', ${index}, this.checked)"
                    class="cursor-pointer">
                <span class="flex-1">${sub.description} <i class="text-xs text-gray-500">(${assigneeName})</i></span>
            </div>
        `;
  });
  subtasksHtml += "</div>";

  card.innerHTML = `
        <div class="flex justify-between items-start">
            <h4 class="font-bold text-gray-800">${task.name}</h4>
            <span class="text-xs font-mono bg-gray-100 px-1 rounded">${percent}%</span>
        </div>
        <p class="text-xs text-gray-500 mb-2">${task.endDate}</p>
        ${subtasksHtml}
    `;

  // Append to correct column
  let colId = "col-todo";
  if (task.status === "in-progress") colId = "col-inprogress";
  if (task.status === "done") colId = "col-done";
  document.getElementById(colId).appendChild(card);
}

// Make function global for onclick access
window.toggleSubtask = async (taskId, subtaskIndex, isChecked) => {
  const taskRef = doc(db, "projects", projectId, "tasks", taskId);
  const taskSnap = await getDoc(taskRef);
  const taskData = taskSnap.data();

  // 1. Update Subtask status
  taskData.subTasks[subtaskIndex].isCompleted = isChecked;

  // 2. Recalculate Parent Status
  const allDone = taskData.subTasks.every((s) => s.isCompleted);
  const anyDone = taskData.subTasks.some((s) => s.isCompleted);

  if (allDone) taskData.status = "done";
  else if (anyDone) taskData.status = "in-progress";
  else taskData.status = "todo";

  await updateDoc(taskRef, {
    subTasks: taskData.subTasks,
    status: taskData.status,
  });
};
