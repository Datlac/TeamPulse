import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const form = document.getElementById("authForm");
const toggleBtn = document.getElementById("toggleAuth");
const registerFields = document.getElementById("registerFields");
const title = document.getElementById("formTitle");
const errorMsg = document.getElementById("errorMsg");

let isRegistering = false;

// Kiểm tra trạng thái đăng nhập
onAuthStateChanged(auth, (user) => {
  if (user && window.location.pathname.includes("login.html")) {
    window.location.href = "index.html";
  }
});

toggleBtn.addEventListener("click", (e) => {
  e.preventDefault();
  isRegistering = !isRegistering;
  title.innerText = isRegistering ? "Register" : "Login";
  toggleBtn.innerText = isRegistering
    ? "Have an account? Login"
    : "Need an account? Register";
  registerFields.classList.toggle("hidden");
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  errorMsg.innerText = "";

  try {
    if (isRegistering) {
      const displayName = document.getElementById("displayName").value;
      const role = document.getElementById("role").value;

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Lưu thông tin user vào Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: email,
        displayName: displayName,
        role: role,
        uid: user.uid,
      });
      alert("Registered successfully!");
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
    window.location.href = "index.html";
  } catch (error) {
    errorMsg.innerText = error.message;
  }
});
