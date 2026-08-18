const SYSTEM_PROMPT = `talk like a normal person texting, not like an ai assistant. keep replies short, usually 1-2 sentences unless more detail is actually needed.
always use lowercase letters. dont use perfect grammar all the time, and its fine to leave out apostrophes, shorten words, or make an occasional tiny spelling mistake so it feels natural. use casual wording like "yo wsp", "yeah", "nah", "fr", "lmao", "idk", "u", "ur", "gotchu", and stuff people actually say.
dont use emojis. dont sound overly enthusiastic, professional, formal, robotic, or polished. avoid phrases like "absolutely!", "certainly!", "i'd be happy to help!", "that's a great question!", or anything that sounds like customer support.
talk like a chill person having an actual conversation. dont explain every little thing unless i ask. dont repeat my question back to me. dont constantly summarize what you just said. dont add unnecessary disclaimers or long introductions.
you can curse often if it naturally fits the conversation, but dont force it or overdo it. keep the tone relaxed and genuine.
the main goal is to sound like an actual person texting, not an ai trying to imitate texting. basically just be chill, direct, and normal.`;

const USER_KEY = "ayden_user_v1";
const CFG_KEY = "ayden_cfg_v2";
const THEME_KEY = "ayden-theme";

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
const newChat = document.getElementById("newChat");
const mobileMenu = document.getElementById("mobileMenu");
const sidebar = document.getElementById("sidebar");
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
const cfgKey = document.getElementById("cfg-key");
const cfgUrl = document.getElementById("cfg-url");
const cfgModel = document.getElementById("cfg-model");
const cfgSave = document.getElementById("cfg-save");
const cfgPresets = document.getElementById("cfg-presets");

let history = [];
let isLoginMode = false;

// ---------- auth helpers ----------
function getUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); }
  catch { return null; }
}
function saveUser(u) {
  localStorage.setItem(USER_KEY, JSON.stringify(u));
}
function clearUser() {
  localStorage.removeItem(USER_KEY);
}

function showApp(user) {
  authScreen.hidden = true;
  appScreen.hidden = false;
  userName.textContent = `${user.firstName} ${user.lastName}`.trim() || "User";
  userEmail.textContent = user.email || "";
  userAvatar.textContent = (user.firstName || "A")[0].toUpperCase();
  promptBox.focus();
}

function showAuth() {
  appScreen.hidden = true;
  authScreen.hidden = false;
  settingsModal.hidden = true;
}

// ---------- theme ----------
function applyTheme(dark) {
  document.body.classList.toggle("dark", dark);
  themeLabel.textContent = dark ? "Dark" : "Light";
  localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
}
const savedTheme = localStorage.getItem(THEME_KEY);
if (savedTheme === "light") applyTheme(false);
else applyTheme(true);

// ---------- config / api ----------
function loadConfig() {
  try { return JSON.parse(localStorage.getItem(CFG_KEY) || "{}"); }
  catch { return {}; }
}
function saveConfig(cfg) {
  localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
}
function getConfig() {
  const c = loadConfig();
  return {
    key: (c.key || "").trim(),
    url: (c.url || "https://api.groq.com/openai/v1/chat/completions").trim(),
    model: (c.model || "openai/gpt-oss-20b").trim(),
  };
}

async function callProvider(userMessage) {
  const { key, url, model } = getConfig();
  if (!key) throw new Error("add ur api key in settings first");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
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

// ---------- chat ui ----------
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

function addMessage(text, role) {
  const row = document.createElement("div");
  row.className = `message ${role}`;
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "user" ? (getUser()?.firstName?.[0] || "Y").toUpperCase() : "A";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;
  row.append(avatar, bubble);
  messagesEl.appendChild(row);
  messagesEl.classList.add("visible");
  welcome.style.display = "none";
  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
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
    if (history.length > 24) history = history.slice(-24);
    addMessage(reply, "ai");
  } catch (err) {
    addMessage(`damn: ${err.message}`, "ai");
  } finally {
    sendBtn.disabled = false;
    promptBox.focus();
  }
});

newChat.addEventListener("click", () => {
  history = [];
  messagesEl.innerHTML = "";
  messagesEl.classList.remove("visible");
  welcome.style.display = "";
  promptBox.value = "";
  resizeBox();
  sidebar.classList.remove("open");
});

mobileMenu.addEventListener("click", () => sidebar.classList.toggle("open"));
document.addEventListener("click", e => {
  if (window.innerWidth <= 760 && sidebar.classList.contains("open") &&
      !sidebar.contains(e.target) && e.target !== mobileMenu) {
    sidebar.classList.remove("open");
  }
});

// ---------- settings modal ----------
function openSettings() {
  const c = getConfig();
  cfgKey.value = c.key;
  cfgUrl.value = c.url;
  cfgModel.value = c.model;
  settingsModal.hidden = false;
  sidebar.classList.remove("open");
}
function closeSettingsModal() {
  settingsModal.hidden = true;
}

settingsBtn.addEventListener("click", openSettings);
closeSettings.addEventListener("click", closeSettingsModal);
modalBackdrop.addEventListener("click", closeSettingsModal);

themeToggle.addEventListener("click", () => {
  applyTheme(!document.body.classList.contains("dark"));
});

cfgSave.addEventListener("click", () => {
  saveConfig({
    key: cfgKey.value.trim(),
    url: cfgUrl.value.trim(),
    model: cfgModel.value.trim(),
  });
  closeSettingsModal();
});

cfgPresets.addEventListener("click", () => {
  cfgUrl.value = "https://api.groq.com/openai/v1/chat/completions";
  cfgModel.value = "openai/gpt-oss-20b";
});

logoutBtn.addEventListener("click", () => {
  clearUser();
  history = [];
  messagesEl.innerHTML = "";
  messagesEl.classList.remove("visible");
  welcome.style.display = "";
  closeSettingsModal();
  showAuth();
});

// ---------- auth form ----------
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
    if (!existing || existing.email !== em || existing.password !== pw) {
      alert("wrong email or password");
      return;
    }
    showApp(existing);
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
    saveUser(user);
    showApp(user);
  }
});

// boot
const current = getUser();
if (current) showApp(current);
else showAuth();
