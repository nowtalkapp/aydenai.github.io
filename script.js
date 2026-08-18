const SYSTEM_PROMPT = `talk like a normal person texting, not like an ai assistant. keep replies short, usually 1-2 sentences unless more detail is actually needed.
always use lowercase letters. dont use perfect grammar all the time, and its fine to leave out apostrophes, shorten words, or make an occasional tiny spelling mistake so it feels natural. use casual wording like "yo wsp", "yeah", "nah", "fr", "lmao", "idk", "u", "ur", "gotchu", and stuff people actually say.
dont use emojis. dont sound overly enthusiastic, professional, formal, robotic, or polished. avoid phrases like "absolutely!", "certainly!", "i'd be happy to help!", "that's a great question!", or anything that sounds like customer support.
talk like a chill person having an actual conversation. dont explain every little thing unless i ask. dont repeat my question back to me. dont constantly summarize what you just said. dont add unnecessary disclaimers or long introductions.
you can curse often if it naturally fits the conversation, but dont force it or overdo it. keep the tone relaxed and genuine.
the main goal is to sound like an actual person texting, not an ai trying to imitate texting. basically just be chill, direct, and normal.`;

const STORAGE_KEY = "ayden_cfg_v2";
const HISTORY_KEY = "ayden_history_v1";

const promptBox = document.getElementById("prompt");
const composer = document.getElementById("composer");
const messagesEl = document.getElementById("messages");
const welcome = document.getElementById("welcome");
const newChat = document.getElementById("newChat");
const themeBtn = document.getElementById("themeBtn");
const mobileMenu = document.getElementById("mobileMenu");
const sidebar = document.getElementById("sidebar");
const settingsBtn = document.getElementById("settingsBtn");
const settingsPanel = document.getElementById("settingsPanel");
const cfgKey = document.getElementById("cfg-key");
const cfgUrl = document.getElementById("cfg-url");
const cfgModel = document.getElementById("cfg-model");
const cfgSave = document.getElementById("cfg-save");
const cfgClear = document.getElementById("cfg-clear");
const cfgPresets = document.getElementById("cfg-presets");
const statusLabel = document.getElementById("statusLabel");

let history = [];

function loadConfig() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}

function saveConfig(cfg) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

function getConfig() {
  const c = loadConfig();
  return {
    key: (c.key || "").trim(),
    url: (c.url || "https://api.groq.com/openai/v1/chat/completions").trim(),
    model: (c.model || "openai/gpt-oss-20b").trim(),
  };
}

function updateStatus() {
  const { key } = getConfig();
  const ready = Boolean(key);
  if (statusLabel) {
    statusLabel.textContent = ready ? "ready" : "add api key";
  }
  return ready;
}

function resizeBox() {
  promptBox.style.height = "auto";
  promptBox.style.height = Math.min(promptBox.scrollHeight, 160) + "px";
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
  avatar.textContent = role === "user" ? "Y" : "A";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;
  row.append(avatar, bubble);
  messagesEl.appendChild(row);
  messagesEl.classList.add("visible");
  welcome.style.display = "none";
  messagesEl.scrollTop = messagesEl.scrollHeight;
  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
}

async function callProvider(userMessage) {
  const { key, url, model } = getConfig();
  if (!key) throw new Error("add ur api key in settings first");

  const payload = {
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...history,
      { role: "user", content: userMessage },
    ],
    temperature: 0.85,
    max_tokens: 512,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.error?.message || data.detail || res.statusText || `http ${res.status}`;
    throw new Error(detail);
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
    if (history.length > 24) history = history.slice(-24);
    addMessage(reply, "ai");
  } catch (err) {
    addMessage(`damn: ${err.message}`, "ai");
  } finally {
    sendBtn.disabled = false;
    promptBox.focus();
  }
});

document.querySelectorAll("[data-prompt]").forEach(btn => {
  btn.addEventListener("click", () => {
    promptBox.value = btn.dataset.prompt;
    resizeBox();
    promptBox.focus();
  });
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

themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("ayden-theme", document.body.classList.contains("dark") ? "dark" : "light");
});
if (localStorage.getItem("ayden-theme") === "dark") document.body.classList.add("dark");

mobileMenu.addEventListener("click", () => sidebar.classList.toggle("open"));
document.addEventListener("click", e => {
  if (window.innerWidth <= 760 && sidebar.classList.contains("open") &&
      !sidebar.contains(e.target) && e.target !== mobileMenu) {
    sidebar.classList.remove("open");
  }
});

// settings
settingsBtn.addEventListener("click", () => {
  settingsPanel.classList.toggle("open");
  if (settingsPanel.classList.contains("open")) {
    const c = getConfig();
    cfgKey.value = c.key;
    cfgUrl.value = c.url;
    cfgModel.value = c.model;
  }
});

cfgSave.addEventListener("click", () => {
  saveConfig({
    key: cfgKey.value.trim(),
    url: cfgUrl.value.trim(),
    model: cfgModel.value.trim(),
  });
  updateStatus();
  settingsPanel.classList.remove("open");
});

cfgClear.addEventListener("click", () => {
  cfgKey.value = "";
  const c = getConfig();
  saveConfig({ key: "", url: c.url, model: c.model });
  updateStatus();
});

cfgPresets.addEventListener("click", () => {
  cfgUrl.value = "https://api.groq.com/openai/v1/chat/completions";
  cfgModel.value = "openai/gpt-oss-20b";
});

updateStatus();
promptBox.focus();
