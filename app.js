/* ---------- Безопасный разбор localStorage ---------- */
function loadChats() {
  try {
    const raw = localStorage.getItem("demo_chats");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const state = {
  chats: loadChats(),
  active: null
};

/* ---------- DOM ---------- */
const chatList    = document.querySelector("#chatList");
const searchInput = document.querySelector("#searchInput");
const welcome     = document.querySelector("#welcome");
const chatView    = document.querySelector("#chatView");
const chatName    = document.querySelector("#chatName");
const chatAvatar  = document.querySelector("#chatAvatar");
const messages    = document.querySelector("#messages");
const form        = document.querySelector("#messageForm");
const input       = document.querySelector("#messageInput");
const modal       = document.querySelector("#modal");
const nameInput   = document.querySelector("#chatNameInput");
const sidebar     = document.querySelector("#sidebar");

/* ---------- Хелперы ---------- */
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[ch]));
}

function uid() {
  return (crypto && typeof crypto.randomUUID === "function")
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(16).slice(2);
}

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function save() {
  localStorage.setItem("demo_chats", JSON.stringify(state.chats));
}

/* ---------- Рендер списка чатов ---------- */
function renderChats(filter = "") {
  const q = filter.trim().toLowerCase();

  if (!state.chats.length) {
    chatList.innerHTML = `
      <div class="empty">
        <div>Чатов пока нет.</div>
        <div>Создайте свой или вступите по коду.</div>
      </div>`;
    return;
  }

  const list = state.chats.filter(c => c.name.toLowerCase().includes(q));

  if (!list.length) {
    chatList.innerHTML = `<div class="empty">Ничего не найдено</div>`;
    return;
  }

  chatList.innerHTML = list.map(c => {
    const last = c.messages.at(-1);
    const preview = last ? last.text : "Нет сообщений";
    return `
      <div class="chat-row" data-id="${c.id}">
        <div class="avatar">${escapeHtml(c.name[0].toUpperCase())}</div>
        <div class="chat-meta">
          <strong>${escapeHtml(c.name)}</strong>
          <small>${escapeHtml(preview)}</small>
        </div>
      </div>`;
  }).join("");

  chatList.querySelectorAll(".chat-row").forEach(row => {
    row.addEventListener("click", () => openChat(row.dataset.id));
  });
}

/* ---------- Открытие чата ---------- */
function openChat(id) {
  const chat = state.chats.find(c => c.id === id);
  if (!chat) return;

  state.active = id;
  chatName.textContent = chat.name;
  chatAvatar.textContent = chat.name[0].toUpperCase();

  welcome.classList.add("hidden");
  chatView.classList.remove("hidden");
  sidebar.classList.add("chat-open");

  renderMessages();
  input.focus();
}

function closeChat() {
  state.active = null;
  chatView.classList.add("hidden");
  welcome.classList.remove("hidden");
  sidebar.classList.remove("chat-open");
}

/* ---------- Рендер сообщений ---------- */
function renderMessages() {
  const chat = state.chats.find(c => c.id === state.active);
  if (!chat) return;

  messages.innerHTML = chat.messages.map(m => `
    <div class="msg ${m.me ? "me" : ""}">
      <div>${escapeHtml(m.text)}</div>
      ${m.time ? `<span class="msg-time">${formatTime(m.time)}</span>` : ""}
    </div>
  `).join("");

  messages.scrollTop = messages.scrollHeight;
}

/* ---------- Отправка сообщения ---------- */
form.addEventListener("submit", e => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text || !state.active) return;

  const chat = state.chats.find(c => c.id === state.active);
  if (!chat) return;

  chat.messages.push({ text, me: true, time: Date.now() });
  input.value = "";

  save();
  renderMessages();
  renderChats(searchInput.value);
});

/* ---------- Модальное окно ---------- */
function openModal() {
  modal.classList.remove("hidden");
  nameInput.value = "";
  setTimeout(() => nameInput.focus(), 30);
}

function closeModal() {
  modal.classList.add("hidden");
  nameInput.value = "";
}

document.querySelector("#newChat").addEventListener("click", openModal);
document.querySelector("#cancelModal").addEventListener("click", closeModal);

document.querySelector("#inviteBtn").addEventListener("click", () => {
  alert("Код приглашения появится в следующей версии 🙂");
});

document.querySelector("#createChat").addEventListener("click", () => {
  const name = nameInput.value.trim();
  if (!name) { nameInput.focus(); return; }

  const chat = { id: uid(), name, messages: [] };
  state.chats.unshift(chat);
  save();
  renderChats(searchInput.value);
  closeModal();
  openChat(chat.id);
});

nameInput.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    document.querySelector("#createChat").click();
  }
});

modal.addEventListener("click", e => {
  if (e.target === modal) closeModal();
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !modal.classList.contains("hidden")) closeModal();
});

/* ---------- Поиск ---------- */
searchInput.addEventListener("input", e => renderChats(e.target.value));

/* ---------- Кнопка "назад" на мобильных ---------- */
document.querySelector("#backBtn").addEventListener("click", closeChat);

/* ---------- Инициализация ---------- */
renderChats();