import { db } from "./firebase-config.js";
import { requireAuth, logout } from "./auth.js";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

let currentUserData = null;
let allUsersList = [];

// 1. Hàm khởi tạo: Chạy ngay khi file được load
(async function init() {
  // Chặn nếu chưa login
  currentUserData = await requireAuth();
  if (!currentUserData) return;

  // Setup giao diện cơ bản
  setupUI();

  // Load danh sách dự án
  loadProjects();

  // Nếu là sếp (admin/manager) thì load thêm danh sách user để gán vào dự án
  if (["admin", "manager"].includes(currentUserData.role)) {
    loadAllUsers();
  }
})();

function setupUI() {
  const userInfoEl = document.getElementById("userInfo");
  if (userInfoEl)
    userInfoEl.innerText = `${currentUserData.displayName} (${currentUserData.role})`;

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  // Ẩn hiện nút tạo project tùy quyền
  const newProjBtn = document.getElementById("newProjectBtn");
  if (["admin", "manager"].includes(currentUserData.role)) {
    newProjBtn.classList.remove("hidden");
  }

  // Modal logic
  const modal = document.getElementById("projectModal");
  if (newProjBtn)
    newProjBtn.addEventListener("click", () =>
      modal.classList.remove("hidden")
    );

  const closeBtn = document.getElementById("closeProjModal");
  if (closeBtn)
    closeBtn.addEventListener("click", () => modal.classList.add("hidden"));

  const createForm = document.getElementById("createProjectForm");
  if (createForm) createForm.addEventListener("submit", handleCreateProject);
}

// Load tất cả user để hiển thị trong thẻ <select> khi tạo project
async function loadAllUsers() {
  try {
    const q = query(collection(db, "users"));
    const snapshot = await getDocs(q);
    const selectBox = document.getElementById("projMembers");

    if (!selectBox) return;

    selectBox.innerHTML = ""; // Clear cũ
    snapshot.forEach((doc) => {
      const u = doc.data();
      allUsersList.push(u);

      const option = document.createElement("option");
      option.value = u.uid;
      option.text = `${u.displayName} (${u.role})`;
      selectBox.appendChild(option);
    });
  } catch (err) {
    console.error("Error loading users:", err);
  }
}

// Xử lý khi bấm nút "Create Project"
async function handleCreateProject(e) {
  e.preventDefault();
  const name = document.getElementById("projName").value;
  const desc = document.getElementById("projDesc").value;
  const deadline = document.getElementById("projDeadline").value;

  // Lấy các user được chọn trong thẻ select multiple
  const selectBox = document.getElementById("projMembers");
  const selectedOptions = Array.from(selectBox.selectedOptions);
  const memberIds = selectedOptions.map((opt) => opt.value);

  // Luôn đảm bảo người tạo (chính mình) có trong danh sách members
  if (!memberIds.includes(currentUserData.uid)) {
    memberIds.push(currentUserData.uid);
  }

  try {
    await addDoc(collection(db, "projects"), {
      name,
      description: desc,
      deadline,
      members: memberIds, // Quan trọng: Mảng này quyết định ai nhìn thấy project
      createdAt: new Date(),
      createdBy: currentUserData.uid,
      status: "active",
    });
    document.getElementById("projectModal").classList.add("hidden");
    e.target.reset();
    alert("Project created successfully!");
  } catch (err) {
    console.error(err);
    alert("Error creating project: " + err.message);
  }
}

// Load dự án và render ra màn hình
function loadProjects() {
  const container = document.getElementById("projectsContainer");
  if (!container) return;

  container.innerHTML = '<div class="loader"></div>';

  const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));

  onSnapshot(q, (snapshot) => {
    container.innerHTML = "";
    if (snapshot.empty) {
      container.innerHTML = '<p class="text-gray-500">No projects yet.</p>';
      return;
    }

    snapshot.forEach((docSnap) => {
      const p = docSnap.data();

      // LOGIC QUAN TRỌNG: Client-side Filter
      // Chỉ hiển thị nếu mình là Admin HOẶC mình có tên trong danh sách members
      const isMember = p.members && p.members.includes(currentUserData.uid);
      const isAdmin = currentUserData.role === "admin";

      if (isMember || isAdmin) {
        renderProjectCard(docSnap.id, p, container);
      }
    });
  });
}

function renderProjectCard(id, data, container) {
  const card = document.createElement("div");
  // Thêm class task-card (từ style.css) để đẹp hơn
  card.className =
    "bg-white p-5 rounded-lg shadow hover:shadow-lg transition cursor-pointer border-t-4 border-blue-600 flex flex-col justify-between task-card";

  const memberCount = data.members ? data.members.length : 0;

  card.innerHTML = `
        <div>
            <div class="flex justify-between items-start mb-2">
                <h3 class="font-bold text-xl text-gray-800">${data.name}</h3>
                <span class="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded">Active</span>
            </div>
            <p class="text-gray-600 text-sm mb-4 line-clamp-2">${data.description}</p>
        </div>
        <div class="border-t pt-3 mt-2 flex justify-between items-center text-sm text-gray-500">
            <div class="flex items-center gap-1">
                <span>👥 ${memberCount} Members</span>
            </div>
            <div class="flex items-center gap-1">
                <span>📅 ${data.deadline}</span>
            </div>
        </div>
    `;
  card.addEventListener("click", () => {
    window.location.href = `project.html?id=${id}`;
  });
  container.appendChild(card);
}
