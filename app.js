/* ============================================================
   Mishagram — localStorage-only demo
   ============================================================ */

/* ---------- Безопасный парсинг ---------- */
function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}
function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

/* ---------- Аватарки ---------- */
const AVATARS = [
  { emoji: '😊', color: '#ffb8b8' },
  { emoji: '🕶️', color: '#ffe08a' },
  { emoji: '🤖', color: '#b8f0c0' },
  { emoji: '👻', color: '#d5c0ff' },
  { emoji: '🦊', color: '#ffd0a0' },
  { emoji: '🐼', color: '#c8b8ff' },
  { emoji: '🐱', color: '#d8b8ff' },
  { emoji: '🐶', color: '#ffb8d0' },
  { emoji: '🦁', color: '#ffc890' },
  { emoji: '🐸', color: '#b8ecc0' },
  { emoji: '🐵', color: '#b8ecc0' },
  { emoji: '🦄', color: '#b8ecdc' },
  { emoji: '🐧', color: '#b8d8ff' },
  { emoji: '🐤', color: '#e0c0ff' },
  { emoji: '🦉', color: '#ffc0d8' },
  { emoji: '🐢', color: '#ffd8a8' },
  { emoji: '👽', color: '#e8ff9a' },
  { emoji: '😈', color: '#fff080' },
  { emoji: '🌵', color: '#b8ecc0' },
  { emoji: '🍕', color: '#b8e8dc' },
  { emoji: '⚡', color: '#b8c8ff' },
  { emoji: '🔥', color: '#e0c0ff' },
  { emoji: '🌈', color: '#ffb8d0' },
  { emoji: '🚀', color: '#ffb8c8' },
];

/* ---------- Состояние ---------- */
const state = {
  chats:   load('demo_chats', []),
  profile: load('demo_profile', null),
  code:    load('demo_code', null),
  active:  null,
  tab:     'chats'
};

/* ---------- DOM ---------- */
const $ = sel => document.querySelector(sel);

const app            = $('#app');
const registerScreen = $('#registerScreen');
const sidebar        = $('#sidebar');
const sidebarTitle   = $('#sidebarTitle');
const headActions    = $('#headActions');

const viewChats    = $('#viewChats');
const viewContacts = $('#viewContacts');
const viewSettings = $('#viewSettings');
const viewProfile  = $('#viewProfile');

const chatList    = $('#chatList');
const searchInput = $('#searchInput');
const welcome     = $('#welcome');
const chatView    = $('#chatView');
const chatName    = $('#chatName');
const chatAvatar  = $('#chatAvatar');
const messagesEl  = $('#messages');
const form        = $('#messageForm');
const input       = $('#messageInput');
const modal       = $('#modal');
const nameInput   = $('#chatNameInput');

/* ---------- Утилиты ---------- */
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[ch]));
}
function uid() {
  return (crypto && typeof crypto.randomUUID === 'function')
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(16).slice(2);
}
function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function saveChats()   { saveJSON('demo_chats', state.chats); }
function saveProfile() { saveJSON('demo_profile', state.profile); }
function saveCode()    { saveJSON('demo_code', state.code); }

function genCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/* ============================================================
   АВАТАРЫ: рендер и выбор
   ============================================================ */
let regAvatar = AVATARS[0]; // выбранная на экране регистрации

function renderAvatarPicker(container, selected, onPick) {
  container.innerHTML = AVATARS.map((a, i) => `
    <div class="ava ${a === selected ? 'selected' : ''}"
         data-i="${i}"
         style="background:${a.color}">${a.emoji}</div>
  `).join('');

  container.querySelectorAll('.ava').forEach(el => {
    el.addEventListener('click', () => {
      const a = AVATARS[Number(el.dataset.i)];
      container.querySelectorAll('.ava').forEach(x => x.classList.remove('selected'));
      el.classList.add('selected');
      onPick(a);
    });
  });
}

function applyAvatar(el, avatar) {
  if (!avatar) {
    el.textContent = '?';
    el.style.background = '#263548';
    return;
  }
  if (avatar.type === 'image') {
    el.innerHTML = `<img src="${avatar.value}" alt="">`;
    el.style.background = '#263548';
  } else {
    el.textContent = avatar.emoji;
    el.style.background = avatar.color || '#263548';
  }
}

/* ============================================================
   РЕГИСТРАЦИЯ
   ============================================================ */
function showRegister() {
  // Подставляем профиль, если редактирование
  const edit = state.profile;
  $('#regName').value = edit?.name || '';
  $('#regBio').value  = edit?.bio  || '';
  regAvatar = edit?.avatar || AVATARS[0];

  applyAvatar($('#regPreview'), regAvatar);
  renderAvatarPicker($('#regAvatars'), regAvatar, a => {
    regAvatar = a;
    applyAvatar($('#regPreview'), a);
  });

  registerScreen.classList.remove('hidden');
  app.classList.add('hidden');
  setTimeout(() => $('#regName').focus(), 40);
}

function hideRegister() {
  registerScreen.classList.add('hidden');
  app.classList.remove('hidden');
}

$('#regGallery').addEventListener('click', () => $('#regFile').click());

$('#regFile').addEventListener('change', e => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    regAvatar = { type: 'image', value: ev.target.result };
    applyAvatar($('#regPreview'), regAvatar);
    $('#regAvatars').querySelectorAll('.ava').forEach(x => x.classList.remove('selected'));
  };
  reader.readAsDataURL(file);
});

$('#regSubmit').addEventListener('click', () => {
  const name = $('#regName').value.trim();
  if (!name) { $('#regName').focus(); return; }

  state.profile = {
    name,
    bio: $('#regBio').value.trim(),
    avatar: regAvatar
  };

  if (!state.code) {
    state.code = genCode();
    saveCode();
  }

  saveProfile();
  hideRegister();
  refreshProfileUI();
});

/* ============================================================
   ПРОФИЛЬ
   ============================================================ */
function refreshProfileUI() {
  const p = state.profile || { name: '—', bio: '', avatar: null };

  applyAvatar($('#profileAvatar'), p.avatar);
  $('#profileName').textContent = p.name;
  $('#profileBio').textContent  = p.bio || '';
  $('#myCode').textContent      = state.code || '------';
  $('#myChatsCount').textContent = state.chats.length;

  // Обновляем эмодзи в кнопке "Профиль" внизу
  const profileNav = document.querySelector('.nav-item[data-tab="profile"] span');
  if (profileNav) profileNav.textContent = p.avatar?.emoji || '😊';
}

$('#copyCode').addEventListener('click', async () => {
  const code = state.code || '';
  if (!code) return;
  try {
    await navigator.clipboard.writeText(code);
    $('#copyCode').textContent = 'Скопировано!';
    setTimeout(() => { $('#copyCode').textContent = 'Скопировать код'; }, 1400);
  } catch {
    alert('Ваш код: ' + code);
  }
});

/* ============================================================
   ПЕРЕКЛЮЧЕНИЕ ТАБОВ
   ============================================================ */
function switchTab(tab) {
  state.tab = tab;

  // навигация
  document.querySelectorAll('.nav-item').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });

  // заголовок + действия
  const titles = { chats: 'Чаты', contacts: 'Контакты', settings: 'Настройки', profile: 'Профиль' };
  sidebarTitle.textContent = titles[tab] || 'Чаты';
  headActions.style.display = tab === 'chats' ? 'flex' : 'none';

  // показ соответствующего вида
  viewChats.classList.toggle('hidden', tab !== 'chats');
  viewContacts.classList.toggle('hidden', tab !== 'contacts');
  viewSettings.classList.toggle('hidden', tab !== 'settings');
  viewProfile.classList.toggle('hidden', tab !== 'profile');

  if (tab === 'profile') refreshProfileUI();
}

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

/* ============================================================
   РЕНДЕР СПИСКА ЧАТОВ
   ============================================================ */
function renderChats(filter = '') {
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
    const preview = last ? last.text : 'Нет сообщений';
    return `
      <div class="chat-row" data-id="${c.id}">
        <div class="avatar">${escapeHtml(c.name[0].toUpperCase())}</div>
        <div class="chat-meta">
          <strong>${escapeHtml(c.name)}</strong>
          <small>${escapeHtml(preview)}</small>
        </div>
      </div>`;
  }).join('');

  chatList.querySelectorAll('.chat-row').forEach(row => {
    row.addEventListener('click', () => openChat(row.dataset.id));
  });
}

/* ============================================================
   ЧАТ
   ============================================================ */
function openChat(id) {
  const chat = state.chats.find(c => c.id === id);
  if (!chat) return;

  state.active = id;
  chatName.textContent = chat.name;
  chatAvatar.textContent = chat.name[0].toUpperCase();

  welcome.classList.add('hidden');
  chatView.classList.remove('hidden');
  sidebar.classList.add('chat-open');

  renderMessages();
  input.focus();
}

function closeChat() {
  state.active = null;
  chatView.classList.add('hidden');
  welcome.classList.remove('hidden');
  sidebar.classList.remove('chat-open');
}

function renderMessages() {
  const chat = state.chats.find(c => c.id === state.active);
  if (!chat) return;

  messagesEl.innerHTML = chat.messages.map(m => `
    <div class="msg ${m.me ? 'me' : ''}">
      <div>${escapeHtml(m.text)}</div>
      ${m.time ? `<span class="msg-time">${formatTime(m.time)}</span>` : ''}
    </div>
  `).join('');
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

form.addEventListener('submit', e => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text || !state.active) return;

  const chat = state.chats.find(c => c.id === state.active);
  if (!chat) return;

  chat.messages.push({ text, me: true, time: Date.now() });
  input.value = '';
  saveChats();
  renderMessages();
  renderChats(searchInput.value);
});

/* ============================================================
   МОДАЛКА НОВОГО ЧАТА
   ============================================================ */
function openModal() {
  modal.classList.remove('hidden');
  nameInput.value = '';
  setTimeout(() => nameInput.focus(), 30);
}
function closeModal() {
  modal.classList.add('hidden');
  nameInput.value = '';
}

$('#newChat').addEventListener('click', openModal);
$('#cancelModal').addEventListener('click', closeModal);

$('#inviteBtn').addEventListener('click', () => {
  if (!state.code) return;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(state.code);
  }
  alert('Ваш код приглашения: ' + state.code + '\n\n(Скопирован в буфер обмена)');
});

$('#createChat').addEventListener('click', () => {
  const name = nameInput.value.trim();
  if (!name) { nameInput.focus(); return; }

  const chat = { id: uid(), name, messages: [] };
  state.chats.unshift(chat);
  saveChats();
  renderChats(searchInput.value);
  refreshProfileUI();
  closeModal();
  openChat(chat.id);
});

nameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); $('#createChat').click(); }
});

modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
});

/* ============================================================
   НАСТРОЙКИ / ПРОФИЛЬ — обработка кликов
   ============================================================ */
document.querySelectorAll('[data-action]').forEach(row => {
  row.addEventListener('click', () => {
    const a = row.dataset.action;

    if (a === 'edit-profile' || a === 'account') {
      showRegister();
    } else if (a === 'my-chats') {
      switchTab('chats');
    } else if (a === 'switch') {
      if (confirm('Выйти из профиля? Чаты останутся в этом браузере.')) {
        localStorage.removeItem('demo_profile');
        state.profile = null;
        showRegister();
      }
    } else if (a === 'delete') {
      if (confirm('Удалить аккаунт и все чаты? Это нельзя отменить.')) {
        localStorage.removeItem('demo_profile');
        localStorage.removeItem('demo_chats');
        localStorage.removeItem('demo_code');
        state.profile = null;
        state.chats = [];
        state.code = null;
        state.active = null;
        closeChat();
        renderChats();
        showRegister();
      }
    } else if (a === 'reset') {
      alert('Сбросить можно будет после добавления темы/акцента 🙂');
    } else {
      alert('Этот раздел появится позже 🙂');
    }
  });
});

/* ============================================================
   ПОИСК
   ============================================================ */
searchInput.addEventListener('input', e => renderChats(e.target.value));

/* ============================================================
   КНОПКА "НАЗАД" НА МОБИЛЬНЫХ
   ============================================================ */
$('#backBtn').addEventListener('click', closeChat);

/* ============================================================
   ИНИЦИАЛИЗАЦИЯ
   ============================================================ */
function init() {
  renderChats();

  if (!state.profile) {
    showRegister();
  } else {
    hideRegister();
    refreshProfileUI();
  }

  switchTab('chats');
}
init();
