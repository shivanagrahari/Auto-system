
const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");
const composeForm = document.getElementById("composeForm");

const registerMessage = document.getElementById("registerMessage");
const loginMessage = document.getElementById("loginMessage");
const sendMessage = document.getElementById("sendMessage");

const profileResult = document.getElementById("profileResult");
const registerPage = document.getElementById("registerPage");
const loginPage = document.getElementById("loginPage");
const profilePage = document.getElementById("profilePage");

const inboxList = document.getElementById("inboxList");
const sentList = document.getElementById("sentList");

const showLogin = document.getElementById("showLogin");
const showRegister = document.getElementById("showRegister");
const logoutButton = document.getElementById("logoutButton");

const loadInboxButton = document.getElementById("loadInboxButton");
const loadSentButton = document.getElementById("loadSentButton");

const playVoiceButton = document.getElementById("playVoiceButton");
const pauseVoiceButton = document.getElementById("pauseVoiceButton");
const stopVoiceButton = document.getElementById("stopVoiceButton");
const voiceStatus = document.getElementById("voiceStatus");

let socket = null;
let selectedEmailText = "";
let currentUtterance = null;

// SHOW PAGE
function showPage(page) {
  registerPage.classList.add("hidden");
  loginPage.classList.add("hidden");
  profilePage.classList.add("hidden");

  page.classList.remove("hidden");
}

// SHOW DASHBOARD SECTION
function showDashboardSection(sectionId) {
  const dashboardPages = document.querySelectorAll(".dashboard-page");
  const navigationButtons = document.querySelectorAll(".nav-link");

  dashboardPages.forEach((page) => {
    page.classList.add("hidden");
  });

  const selectedPage = document.getElementById(sectionId);

  if (selectedPage) {
    selectedPage.classList.remove("hidden");
  }

  navigationButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.page === sectionId);
  });
}

// SIDEBAR NAVIGATION
document.querySelectorAll(".nav-link").forEach((button) => {
  button.addEventListener("click", () => {
    showDashboardSection(button.dataset.page);
  });
});

// GET TOKEN
function getToken() {
  return localStorage.getItem("token");
}

// API REQUEST HELPER
async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
}

// SOCKET CONNECTION
function connectSocket(userId) {
  if (socket) {
    socket.disconnect();
  }

  socket = io();

  socket.on("connect", () => {
    socket.emit("joinRoom", String(userId));
    console.log("Socket connected");
  });

  socket.on("newEmail", (data) => {
    alert(data.message + "\nSubject: " + data.subject);
    loadInbox();
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected");
  });
}

// OPEN LOGIN
showLogin.addEventListener("click", (event) => {
  event.preventDefault();
  loginMessage.textContent = "";
  showPage(loginPage);
});

// OPEN REGISTER
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
      data.message || "Registration completed.";

    if (response.ok) {
      registerForm.reset();
      showPage(loginPage);

      loginMessage.textContent = "Account created! Please login.";
      document.getElementById("loginEmail").value = email;
    }
  } catch (error) {
    registerMessage.textContent = error.message;
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
    loginMessage.textContent = error.message;
  }
});

// LOAD PROFILE
async function loadProfile() {
  if (!getToken()) {
    showPage(loginPage);
    return;
  }

  try {
    const data = await apiRequest("/api/auth/profile");
    const user = data.user;

    if (!user || !user.email) {
      throw new Error("User information not found.");
    }

    const userId = user.id || user._id;

    connectSocket(userId);

    profileResult.replaceChildren();

    const card = document.createElement("div");
    card.className = "user-profile-card";

    const avatar = document.createElement("div");
    avatar.className = "user-avatar";
    avatar.textContent = user.email.charAt(0).toUpperCase();

    const heading = document.createElement("h2");
    heading.textContent = user.email;

    const subheading = document.createElement("h3");
    subheading.textContent = "Profile Details";

    const emailText = document.createElement("p");
    emailText.textContent = "Email: " + user.email;

    const idText = document.createElement("p");
    idText.textContent = "User ID: " + userId;

    card.append(avatar, heading, subheading, emailText, idText);
    profileResult.appendChild(card);

    showPage(profilePage);
    showDashboardSection("homeSection");

    await loadInbox();
    await loadSent();
  } catch (error) {
    localStorage.removeItem("token");
    showPage(loginPage);
    loginMessage.textContent = error.message;
  }
}

// SEND EMAIL
composeForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const receiver = document.getElementById("receiverEmail").value.trim();
  const subject = document.getElementById("emailSubject").value.trim();
  const message = document.getElementById("emailMessage").value.trim();

  try {
    const data = await apiRequest("/api/emails/send", {
      method: "POST",
      body: JSON.stringify({ receiver, subject, message }),
    });

    sendMessage.textContent = data.message;
    composeForm.reset();

    await loadSent();
    await loadInbox();
  } catch (error) {
    sendMessage.textContent = error.message;
  }
});

// CREATE EMAIL CARD
function createEmailCard(email, type) {
  const card = document.createElement("div");
  card.className = "email-card";

  const title = document.createElement("h3");
  title.textContent = email.subject;

  const person = document.createElement("p");

  if (type === "inbox") {
    person.textContent = "From: " + (email.sender?.email || "Unknown");
  } else {
    person.textContent = "To: " + (email.receiver?.email || "Unknown");
  }

  const message = document.createElement("p");
  message.textContent = email.message;

  const status = document.createElement("p");

  if (type === "inbox") {
    status.textContent = email.isRead ? "Read" : "Unread";
  }

  // MARK AS READ BUTTON
  const readButton = document.createElement("button");

  if (type === "inbox" && !email.isRead) {
    readButton.type = "button";
    readButton.textContent = "Mark as Read";

    readButton.addEventListener("click", async () => {
      try {
        await apiRequest(`/api/emails/${email._id}/read`, {
          method: "PATCH",
        });

        await loadInbox();
      } catch (error) {
        alert(error.message);
      }
    });
  }

  // READ ALOUD BUTTON
  const voiceButton = document.createElement("button");
  voiceButton.type = "button";
  voiceButton.textContent = "Read Aloud";

  voiceButton.addEventListener("click", () => {
    selectedEmailText =
      `Subject: ${email.subject}. Message: ${email.message}`;

    voiceStatus.textContent = "Email selected. Click Play.";

    window.speechSynthesis.cancel();
    currentUtterance = null;

    showDashboardSection("voiceSection");
  });

  // DELETE BUTTON
  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.textContent = "Delete";
  deleteButton.className = "delete-button";

  deleteButton.addEventListener("click", async () => {
    const confirmDelete = confirm(
      "Are you sure you want to delete this email?"
    );

    if (!confirmDelete) return;

    try {
      await apiRequest(`/api/emails/${email._id}`, {
        method: "DELETE",
      });

      alert("Email deleted successfully!");

      if (type === "inbox") {
        await loadInbox();
      } else {
        await loadSent();
      }
    } catch (error) {
      alert(error.message);
    }
  });

  card.append(title, person, message, status);

  if (readButton.textContent) {
    card.appendChild(readButton);
  }

  card.append(voiceButton, deleteButton);

  return card;
}

// LOAD INBOX
async function loadInbox() {
  try {
    const data = await apiRequest("/api/emails/inbox");

    inboxList.replaceChildren();

    if (!data.emails || data.emails.length === 0) {
      inboxList.textContent = "No emails in your inbox.";
      return;
    }

    data.emails.forEach((email) => {
      inboxList.appendChild(createEmailCard(email, "inbox"));
    });
  } catch (error) {
    inboxList.textContent = error.message;
  }
}

// LOAD SENT EMAILS
async function loadSent() {
  try {
    const data = await apiRequest("/api/emails/sent");

    sentList.replaceChildren();

    if (!data.emails || data.emails.length === 0) {
      sentList.textContent = "No sent emails found.";
      return;
    }

    data.emails.forEach((email) => {
      sentList.appendChild(createEmailCard(email, "sent"));
    });
  } catch (error) {
    sentList.textContent = error.message;
  }
}

// REFRESH BUTTONS
loadInboxButton.addEventListener("click", loadInbox);
loadSentButton.addEventListener("click", loadSent);

// VOICE PLAY
playVoiceButton.addEventListener("click", () => {
  if (!selectedEmailText) {
    voiceStatus.textContent = "Please select an email first.";
    return;
  }

  if (!("speechSynthesis" in window)) {
    voiceStatus.textContent = "Voice is not supported in this browser.";
    return;
  }

  if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
    voiceStatus.textContent = "Voice resumed.";
    return;
  }

  window.speechSynthesis.cancel();

  currentUtterance = new SpeechSynthesisUtterance(selectedEmailText);
  currentUtterance.lang = "en-US";
  currentUtterance.rate = 1;

  currentUtterance.onend = () => {
    voiceStatus.textContent = "Reading completed.";
  };

  currentUtterance.onerror = () => {
    voiceStatus.textContent = "Could not play voice.";
  };

  window.speechSynthesis.speak(currentUtterance);
  voiceStatus.textContent = "Reading email...";
});

// VOICE PAUSE
pauseVoiceButton.addEventListener("click", () => {
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.pause();
    voiceStatus.textContent = "Voice paused.";
  }
});

// VOICE STOP
stopVoiceButton.addEventListener("click", () => {
  window.speechSynthesis.cancel();
  currentUtterance = null;
  voiceStatus.textContent = "Voice stopped.";
});

// LOGOUT
logoutButton.addEventListener("click", () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  window.speechSynthesis.cancel();

  localStorage.removeItem("token");

  profileResult.replaceChildren();
  inboxList.replaceChildren();
  sentList.replaceChildren();

  selectedEmailText = "";
  currentUtterance = null;

  loginMessage.textContent = "Logged out successfully.";

  showPage(loginPage);
});

// AUTOMATIC LOGIN
if (getToken()) {
  loadProfile();
} else {
  showPage(registerPage);
}
