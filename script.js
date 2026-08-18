const promptBox = document.getElementById("prompt");
const composer = document.getElementById("composer");
const messages = document.getElementById("messages");
const welcome = document.getElementById("welcome");
const newChat = document.getElementById("newChat");
const themeBtn = document.getElementById("themeBtn");
const mobileMenu = document.getElementById("mobileMenu");
const sidebar = document.getElementById("sidebar");

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
  messages.appendChild(row);
  messages.classList.add("visible");
  welcome.style.display = "none";
  window.scrollTo({top: document.body.scrollHeight, behavior:"smooth"});
}

function fakeReply(text) {
  const reply = `I’m Ayden. I received: “${text}”\n\nThis demo is a static GitHub Pages interface, so the chat UI is ready but no AI backend is connected yet. Connect your preferred AI API on a secure server to make Ayden respond for real.`;
  setTimeout(() => addMessage(reply, "ai"), 450);
}

composer.addEventListener("submit", e => {
  e.preventDefault();
  const text = promptBox.value.trim();
  if (!text) return;
  addMessage(text, "user");
  promptBox.value = "";
  resizeBox();
  fakeReply(text);
});

document.querySelectorAll("[data-prompt]").forEach(btn => {
  btn.addEventListener("click", () => {
    promptBox.value = btn.dataset.prompt;
    resizeBox();
    promptBox.focus();
  });
});

newChat.addEventListener("click", () => {
  messages.innerHTML = "";
  messages.classList.remove("visible");
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
