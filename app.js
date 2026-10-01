const state = {
  chats: JSON.parse(localStorage.getItem("demo_chats") || "[]"),
  active: null
};

const chatList = document.querySelector("#chatList");
const searchInput = document.querySelector("#searchInput");
const welcome = document.querySelector("#welcome");
const chatView = document.querySelector("#chatView");
const chatName = document.querySelector("#chatName");
const chatAvatar = document.querySelector("#chatAvatar");
const messages = document.querySelector("#messages");
const form = document.querySelector("#messageForm");
const input = document.querySelector("#messageInput");
const modal = document.querySelector("#modal");

function save(){ localStorage.setItem("demo_chats", JSON.stringify(state.chats)); }

function renderChats(filter=""){
  const q = filter.trim().toLowerCase();
  const list = state.chats.filter(c => c.name.toLowerCase().includes(q));
  if(!list.length){
    chatList.innerHTML = `<div class="empty"><div>Чатов пока нет.</div><div>Создайте свой или вступите по коду.</div></div>`;
    return;
  }
  chatList.innerHTML = list.map(c => `
    <div class="chat-row" data-id="${c.id}">
      <div class="avatar">${escapeHtml(c.name[0].toUpperCase())}</div>
      <div class="chat-meta">
        <strong>${escapeHtml(c.name)}</strong>
        <small>${escapeHtml(c.messages.at(-1)?.text || "Нет сообщений")}</small>
      </div>
    </div>`).join("");
  document.querySelectorAll(".chat-row").forEach(row =>
    row.addEventListener("click", () => openChat(row.dataset.id))
  );
}

function openChat(id){
  const chat = state.chats.find(c => c.id === id);
  if(!chat) return;
  state.active = id;
  chatName.textContent = chat.name;
  chatAvatar.textContent = chat.name[0].toUpperCase();
  welcome.classList.add("hidden");
  chatView.classList.remove("hidden");
  document.querySelector(".sidebar").classList.add("chat-open");
  renderMessages();
}

function renderMessages(){
  const chat = state.chats.find(c => c.id === state.active);
  if(!chat) return;
  messages.innerHTML = chat.messages.map(m =>
    `<div class="msg ${m.me ? "me" : ""}">${escapeHtml(m.text)}</div>`
  ).join("");
  messages.scrollTop = messages.scrollHeight;
}

form.addEventListener("submit", e => {
  e.preventDefault();
  const text = input.value.trim();
  if(!text || !state.active) return;
  const chat = state.chats.find(c => c.id === state.active);
  chat.messages.push({text, me:true});
  input.value = "";
  save(); renderMessages(); renderChats(searchInput.value);
});

document.querySelector("#newChat").onclick = () => {
  modal.classList.remove("hidden");
  document.querySelector("#chatNameInput").focus();
};
document.querySelector("#cancelModal").onclick = () => modal.classList.add("hidden");
document.querySelector("#createChat").onclick = () => {
  const name = document.querySelector("#chatNameInput").value.trim();
  if(!name) return;
  const chat = {id: crypto.randomUUID(), name, messages: []};
  state.chats.unshift(chat);
  save(); renderChats(); modal.classList.add("hidden");
  document.querySelector("#chatNameInput").value = "";
  openChat(chat.id);
};

searchInput.addEventListener("input", e => renderChats(e.target.value));
document.querySelector("#backBtn").onclick = () => {
  document.querySelector(".sidebar").classList.remove("chat-open");
  chatView.classList.add("hidden");
  welcome.classList.remove("hidden");
};

function escapeHtml(s){
  return s.replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
}
renderChats();
