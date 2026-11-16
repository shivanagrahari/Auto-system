
const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");

const registerMessage = document.getElementById("registerMessage");
const loginMessage = document.getElementById("loginMessage");
const profileResult = document.getElementById("profileResult");

const registerPage = document.getElementById("registerPage");
const loginPage = document.getElementById("loginPage");
const profilePage = document.getElementById("profilePage");

const showLogin = document.getElementById("showLogin");
const showRegister = document.getElementById("showRegister");
const logoutButton = document.getElementById("logoutButton");

// SHOW A PARTICULAR PAGE
function showPage(page) {
  registerPage.classList.add("hidden");
  loginPage.classList.add("hidden");
  profilePage.classList.add("hidden");

  page.classList.remove("hidden");
}

// OPEN LOGIN PAGE
showLogin.addEventListener("click", (event) => {
  event.preventDefault();
  loginMessage.textContent = "";
  showPage(loginPage);
});

// OPEN REGISTER PAGE
showRegister.addEventListener("click", (event) => {
  event.preventDefault();
  registerMessage.textContent = "";
  showPage(registerPage);
});

// REGISTER
registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;

  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    registerMessage.textContent =
      data.message || (response.ok ? "Registration successful!" : "Registration failed.");

    if (response.ok) {
      registerForm.reset();
      showPage(loginPage);
      loginMessage.textContent = "Account created! Please login.";
      document.getElementById("loginEmail").value = email;
    }
  } catch (error) {
    registerMessage.textContent = "Could not connect to server.";
  }
});

// LOGIN
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok || !data.token) {
      loginMessage.textContent = data.message || "Login failed.";
      return;
    }

    localStorage.setItem("token", data.token);
    loginForm.reset();
    loginMessage.textContent = "";

    await loadProfile();
  } catch (error) {
    loginMessage.textContent = "Could not connect to server.";
  }
});

// LOAD PROFILE
async function loadProfile() {
  const token = localStorage.getItem("token");

  if (!token) {
    showPage(loginPage);
    loginMessage.textContent = "Please login first.";
    return;
  }

  try {
    const response = await fetch("/api/auth/profile", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      localStorage.removeItem("token");
      showPage(loginPage);
      loginMessage.textContent = data.message || "Please login again.";
      return;
    }

    const user = data.user;

    if (!user || !user.email) {
      profileResult.textContent = "User information not found.";
      showPage(profilePage);
      return;
    }

    // CREATE PROFILE CARD
    profileResult.replaceChildren();

    const card = document.createElement("div");
    card.className = "user-profile-card";

    // Avatar shows the first letter of the email
    const avatar = document.createElement("div");
    avatar.className = "user-avatar";
    avatar.textContent = user.email.charAt(0).toUpperCase();

    // Display email instead of "My Profile"
    const emailHeading = document.createElement("h2");
    emailHeading.textContent = user.email;

    const heading = document.createElement("h3");
    heading.textContent = "Profile Details";

    const email = document.createElement("p");
    email.textContent = `Email: ${user.email}`;

    const userId = document.createElement("p");
    userId.textContent = `User ID: ${user.id || user._id || "Not available"}`;

    card.append(avatar, emailHeading, heading, email, userId);
    profileResult.appendChild(card);

    showPage(profilePage);
  } catch (error) {
    showPage(loginPage);
    loginMessage.textContent = "Could not connect to server.";
  }
}

// LOGOUT
logoutButton.addEventListener("click", () => {
  localStorage.removeItem("token");
  profileResult.replaceChildren();
  loginMessage.textContent = "Logged out successfully.";
  showPage(loginPage);
});

// OPEN PROFILE AUTOMATICALLY IF ALREADY LOGGED IN
if (localStorage.getItem("token")) {
  loadProfile();
} else {
  showPage(registerPage);
}
