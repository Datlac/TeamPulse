import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// --- Hàm kiểm tra đăng nhập (Dùng cho các trang Dashboard, Project) ---
export function requireAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Nếu chưa login -> đá về trang login ngay
        window.location.href = "login.html";
        resolve(null);
      } else {
        // Đã login -> Lấy thông tin role từ DB
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            resolve(userData);
          } else {
            // Trường hợp user đã xóa trong DB nhưng Auth vẫn còn
            console.error("User data not found in Firestore");
            resolve(null);
          }
        } catch (e) {
          console.error("Auth check error:", e);
          resolve(null);
        }
      }
    });
  });
}

// --- Hàm Logout ---
export function logout() {
  signOut(auth).then(() => (window.location.href = "login.html"));
}

// --- Logic riêng cho trang Login.html ---
// Chỉ chạy đoạn này nếu đang đứng ở trang login.html
if (
  window.location.pathname.includes("login.html") ||
  window.location.pathname === "/" ||
  (window.location.pathname.endsWith("index.html") === false &&
    window.location.pathname.endsWith("project.html") === false)
) {
  // Kiểm tra nếu login.html mà chưa có form (tránh lỗi null)
  const form = document.getElementById("authForm");
  if (form) {
    const errorMsg = document.getElementById("errorMsg");
    const toggleBtn = document.getElementById("toggleAuth");
    const registerFields = document.getElementById("registerFields");
    const title = document.getElementById("formTitle");
    let isRegistering = false;

    // Nếu đã login rồi thì vào thẳng dashboard
    onAuthStateChanged(auth, (user) => {
      if (user) window.location.href = "index.html";
    });

    toggleBtn.addEventListener("click", (e) => {
      e.preventDefault();
      isRegistering = !isRegistering;
      title.innerText = isRegistering ? "Register" : "Login";
      registerFields.classList.toggle("hidden");
      toggleBtn.innerText = isRegistering
        ? "Have an account? Login"
        : "Need an account? Register";
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      errorMsg.innerText = "Processing...";

      try {
        if (isRegistering) {
          const displayName = document.getElementById("displayName").value;
          const role = document.getElementById("role").value;
          const userCred = await createUserWithEmailAndPassword(
            auth,
            email,
            password
          );

          // Lưu thông tin user mới
          await setDoc(doc(db, "users", userCred.user.uid), {
            email,
            displayName,
            role,
            uid: userCred.user.uid,
            createdAt: new Date(),
          });
          alert("Registered successfully! Logging in...");
          window.location.href = "index.html";
        } else {
          await signInWithEmailAndPassword(auth, email, password);
          window.location.href = "index.html";
        }
      } catch (error) {
        errorMsg.innerText = error.message;
      }
    });
  }
}
