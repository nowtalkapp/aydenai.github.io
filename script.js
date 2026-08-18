const USER_KEY = "ayden_user_v1";
const THEME_KEY = "ayden-theme";
const CHATS_PREFIX = "ayden_chats_"; // + email

const cfg = window.AYDEN_CONFIG || {};
const SYSTEM_PROMPT = cfg.SYSTEM_PROMPT || "be chill and helpful.";
const API_KEY = (cfg.API_KEY || "").trim();
const API_URL = (cfg.API_URL || "https://api.groq.com/openai/v1/chat/completions").trim();
const MODEL = (cfg.MODEL || "openai/gpt-oss-20b").trim();

const authScreen = document.getElementById("authScreen");
const appScreen = document.getElementById("appScreen");
const authForm = document.getElementById("authForm");
const authTitle = document.getElementById("authTitle");
const authSub = document.getElementById("authSub");
const switchMode = document.getElementById("switchMode");
const switchText = document.getElementById("switchText");
const nameRow = document.getElementById("nameRow");
const firstName = document.getElementById("firstName");
const lastName = document.getElementById("lastName");
const email = document.getElementById("email");
const password = document.getElementById("password");
const birthday = document.getElementById("birthday");
const authSubmit = document.getElementById("authSubmit");

const promptBox = document.getElementById("prompt");
const composer = document.getElementById("composer");
const messagesEl = document.getElementById("messages");
const welcome = document.getElementById("welcome");
const newChatBtn = document.getElementById("newChat");
const mobileMenu = document.getElementById("mobileMenu");
const sidebar = document.getElementById("sidebar");
const main = document.getElementById("main");
const collapseBtn = document.getElementById("collapseBtn");
const expandBtn = document.getElementById("expandBtn");
const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");
const closeSettings = document.getElementById("closeSettings");
const modalBackdrop = document.getElementById("modalBackdrop");
const themeToggle = document.getElementById("themeToggle");
const themeLabel = document.getElementById("themeLabel");
const logoutBtn = document.getElementById("logoutBtn");
const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const userAvatar = document.getElementById("userAvatar");
const historyList = document.getElementById("historyList");
const appRoot = document.querySelector(".app");

let history = [];          // current chat messages [{role, content}]
let chats = [];            // saved chats for this user
let currentChatId = null;
let isLoginMode = false;

// ---------- user / storage ----------
function getUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); }
  catch { return null; }
}
function saveUser(u) { localStorage.setItem(USER_KEY, JSON.stringify(u)); }
function clearUser() { localStorage.removeItem(USER_KEY); }

function chatsKey(user) {
  return CHATS_PREFIX + (user?.email || "anon");
}
function loadChats(user) {
  try { return JSON.parse(localStorage.getItem(chatsKey(user)) || "[]"); }
  catch { return []; }
}
function saveChats(user, list) {
  localStorage.setItem(chatsKey(user), JSON.stringify(list));
}

// ---------- theme ----------
function applyTheme(dark) {
  document.body.classList.toggle("dark", dark);
  themeLabel.textContent = dark ? "Dark" : "Light";
  localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
}
if (localStorage.getItem(THEME_KEY) === "light") applyTheme(false);
else applyTheme(true);

// ---------- sidebar collapse ----------
function setSidebarCollapsed(collapsed) {
  sidebar.classList.toggle("collapsed", collapsed);
  main.classList.toggle("expanded", collapsed);
  appRoot.classList.toggle("sidebar-collapsed", collapsed);
  expandBtn.hidden = !collapsed;
  localStorage.setItem("ayden_sidebar", collapsed ? "1" : "0");
}
collapseBtn.addEventListener("click", () => setSidebarCollapsed(true));
expandBtn.addEventListener("click", () => setSidebarCollapsed(false));
if (localStorage.getItem("ayden_sidebar") === "1") setSidebarCollapsed(true);

// ---------- chat history ui ----------
function titleFromMessages(msgs) {
  const first = msgs.find(m => m.role === "user");
  if (!first) return "New chat";
  return first.content.slice(0, 42) + (first.content.length > 42 ? "…" : "");
}

function renderHistoryList() {
  historyList.innerHTML = "";
  chats.forEach(chat => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "history-item" + (chat.id === currentChatId ? " active" : "");
    btn.textContent = chat.title || "Chat";
    btn.addEventListener("click", () => openChat(chat.id));
    historyList.appendChild(btn);
  });
}

function persistCurrentChat() {
  const user = getUser();
  if (!user || history.length === 0) return;

  if (!currentChatId) {
    currentChatId = "c_" + Date.now();
    chats.unshift({
      id: currentChatId,
      title: titleFromMessages(history),
      messages: [...history],
      updated: Date.now(),
    });
  } else {
    const chat = chats.find(c => c.id === currentChatId);
    if (chat) {
      chat.messages = [...history];
      chat.title = titleFromMessages(history);
      chat.updated = Date.now();
      // move to top
      chats = [chat, ...chats.filter(c => c.id !== currentChatId)];
    }
  }
  saveChats(user, chats);
  renderHistoryList();
}

function openChat(id) {
  const chat = chats.find(c => c.id === id);
  if (!chat) return;
  currentChatId = id;
  history = chat.messages.map(m => ({ ...m }));
  messagesEl.innerHTML = "";
  history.forEach(m => addMessage(m.content, m.role === "user" ? "user" : "ai", false));
  messagesEl.classList.add("visible");
  welcome.style.display = "none";
  renderHistoryList();
  sidebar.classList.remove("open");
}

function startNewChat() {
  persistCurrentChat();
  currentChatId = null;
  history = [];
  messagesEl.innerHTML = "";
  messagesEl.classList.remove("visible");
  welcome.style.display = "";
  promptBox.value = "";
  resizeBox();
  renderHistoryList();
  sidebar.classList.remove("open");
}

// ---------- app show / hide ----------
function showApp(user) {
  authScreen.hidden = true;
  appScreen.hidden = false;
  userName.textContent = `${user.firstName} ${user.lastName}`.trim() || "User";
  userEmail.textContent = user.email || "";
  userAvatar.textContent = (user.firstName || "A")[0].toUpperCase();
  chats = loadChats(user);
  currentChatId = null;
  history = [];
  renderHistoryList();
  promptBox.focus();
}

function showAuth() {
  appScreen.hidden = true;
  authScreen.hidden = false;
  settingsModal.hidden = true;
}

// ---------- messages ----------
function resizeBox() {
  promptBox.style.height = "auto";
  promptBox.style.height = Math.min(promptBox.scrollHeight, 140) + "px";
}
promptBox.addEventListener("input", resizeBox);
promptBox.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    composer.requestSubmit();
  }
});

function addMessage(text, role, scroll = true) {
  const row = document.createElement("div");
  row.className = `message ${role}`;
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  const u = getUser();
  avatar.textContent = role === "user" ? (u?.firstName?.[0] || "Y").toUpperCase() : "A";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;
  row.append(avatar, bubble);
  messagesEl.appendChild(row);
  messagesEl.classList.add("visible");
  welcome.style.display = "none";
  if (scroll) window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
}

async function callProvider(userMessage) {
  if (!API_KEY || API_KEY === "PASTE_YOUR_GROQ_KEY_HERE") {
    throw new Error("set API_KEY in config.js first");
  }

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...history,
        { role: "user", content: userMessage },
      ],
      temperature: 0.85,
      max_tokens: 512,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message || data.detail || res.statusText || `http ${res.status}`);
  }
  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error("empty reply");
  return reply;
}

composer.addEventListener("submit", async e => {
  e.preventDefault();
  const text = promptBox.value.trim();
  if (!text) return;

  addMessage(text, "user");
  promptBox.value = "";
  resizeBox();

  const sendBtn = composer.querySelector(".send");
  sendBtn.disabled = true;

  try {
    const reply = await callProvider(text);
    history.push({ role: "user", content: text });
    history.push({ role: "assistant", content: reply });
    if (history.length > 40) history = history.slice(-40);
    addMessage(reply, "ai");
    persistCurrentChat();
  } catch (err) {
    addMessage(`damn: ${err.message}`, "ai");
  } finally {
    sendBtn.disabled = false;
    promptBox.focus();
  }
});

newChatBtn.addEventListener("click", startNewChat);

mobileMenu.addEventListener("click", () => sidebar.classList.toggle("open"));
document.addEventListener("click", e => {
  if (window.innerWidth <= 760 && sidebar.classList.contains("open") &&
      !sidebar.contains(e.target) && e.target !== mobileMenu) {
    sidebar.classList.remove("open");
  }
});

// ---------- settings ----------
settingsBtn.addEventListener("click", () => {
  settingsModal.hidden = false;
  sidebar.classList.remove("open");
});
closeSettings.addEventListener("click", () => { settingsModal.hidden = true; });
modalBackdrop.addEventListener("click", () => { settingsModal.hidden = true; });

themeToggle.addEventListener("click", () => {
  applyTheme(!document.body.classList.contains("dark"));
});

logoutBtn.addEventListener("click", () => {
  persistCurrentChat();
  clearUser();
  history = [];
  chats = [];
  currentChatId = null;
  messagesEl.innerHTML = "";
  messagesEl.classList.remove("visible");
  welcome.style.display = "";
  settingsModal.hidden = true;
  showAuth();
});

// ---------- auth ----------
function setAuthMode(login) {
  isLoginMode = login;
  authTitle.textContent = login ? "Log in" : "Welcome";
  authSub.textContent = login ? "welcome back" : "create an account to continue";
  authSubmit.textContent = login ? "Log in" : "Continue";
  switchText.textContent = login ? "need an account?" : "already have an account?";
  switchMode.textContent = login ? "Sign up" : "Log in";
  nameRow.style.display = login ? "none" : "grid";
  birthday.style.display = login ? "none" : "block";
  firstName.required = !login;
  lastName.required = !login;
  birthday.required = !login;
}
switchMode.addEventListener("click", () => setAuthMode(!isLoginMode));

authForm.addEventListener("submit", e => {
  e.preventDefault();
  const em = email.value.trim().toLowerCase();
  const pw = password.value;

  if (isLoginMode) {
    const existing = getUser();
    // also check if another account was stored under a multi-user store
    // simple single-device model: one active account in USER_KEY
    // for multi-account on same browser we store a map
    const accounts = JSON.parse(localStorage.getItem("ayden_accounts") || "{}");
    const account = accounts[em] || (existing?.email === em ? existing : null);
    if (!account || account.password !== pw) {
      alert("wrong email or password");
      return;
    }
    saveUser(account);
    showApp(account);
  } else {
    const user = {
      firstName: firstName.value.trim(),
      lastName: lastName.value.trim(),
      email: em,
      password: pw,
      birthday: birthday.value,
    };
    if (!user.firstName || !user.lastName || !user.email || !user.password || !user.birthday) {
      alert("fill everything out");
      return;
    }
    const accounts = JSON.parse(localStorage.getItem("ayden_accounts") || "{}");
    accounts[em] = user;
    localStorage.setItem("ayden_accounts", JSON.stringify(accounts));
    saveUser(user);
    showApp(user);
  }
});

// boot — login persists across refresh
const current = getUser();
if (current) showApp(current);
else showAuth();
