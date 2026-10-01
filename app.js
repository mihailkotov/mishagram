/* ============================================================
   Mishagram + Firebase Firestore
   ============================================================ */

/* ---------- 1. КОНФИГ FIREBASE ----------
   ⚠️ ЗАМЕНИ НА СВОЙ КОНФИГ ИЗ FIREBASE CONSOLE!
------------------------------------------- */
const firebaseConfig = {
  apiKey: "AIzaSyBoehRziARm01S0XWYH6ez63TmGa-ycwwE",
  authDomain: "mishagram-b1477.firebaseapp.com",
  projectId: "mishagram-b1477",
  storageBucket: "mishagram-b1477.firebasestorage.app",
  messagingSenderId: "205897759661",
  appId: "26ca3a96a61f034efc3f24"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

/* ---------- Аватарки ---------- */
const AVATARS = [
  { emoji: '😊', color: '#ffb8b8' }, { emoji: '🕶️', color: '#ffe08a' },
  { emoji: '🤖', color: '#b8f0c0' }, { emoji: '👻', color: '#d5c0ff' },
  { emoji: '🦊', color: '#ffd0a0' }, { emoji: '🐼', color: '#c8b8ff' },
  { emoji: '🐱', color: '#d8b8ff' }, { emoji: '🐶', color: '#ffb8d0' },
  { emoji: '🦁', color: '#ffc890' }, { emoji: '🐸', color: '#b8ecc0' },
  { emoji: '🐵', color: '#b8ecc0' }, { emoji: '🦄', color: '#b8ecdc' },
  { emoji: '🐧', color: '#b8d8ff' }, { emoji: '🐤', color: '#e0c0ff' },
  { emoji: '🦉', color: '#ffc0d8' }, { emoji: '🐢', color: '#ffd8a8' },
  { emoji: '👽', color: '#e8ff9a' }, { emoji: '😈', color: '#fff080' },
  { emoji: '🌵', color: '#b8ecc0' }, { emoji: '🍕', color: '#b8e8dc' },
  { emoji: '⚡', color: '#b8c8ff' }, { emoji: '🔥', color: '#e0c0ff' },
  { emoji: '🌈', color: '#ffb8d0' }, { emoji: '🚀', color: '#ffb8c8' },
];

/* ---------- Состояние ---------- */
const state = {
  uid: null,            // Firebase UID
  profile: null,        // { name, bio, avatar, code }
  contacts: [],         // массив профилей друзей
  chats: [],            // массив чатов
  active: null,         // id открытого чата
  tab: 'chats',
  unsubMessages: null,  // отписка от текущего чата
  unsubContacts: null,
  unsubChats: null
};

/* ---------- DOM ---------- */
const $ = s => document.querySelector(s);
const app = $('#app');
const registerScreen = $('#registerScreen');
const sidebar = $('#sidebar');
const sidebarTitle = $('#sidebarTitle');
const headActions = $('#headActions');
const viewChats = $('#viewChats');
const viewContacts = $('#viewContacts');
const viewSettings = $('#viewSettings');
const viewProfile = $('#viewProfile');
const chatList = $('#chatList');
const searchInput = $('#searchInput');
const searchCodeInput = $('#searchCodeInput');
const welcome = $('#welcome');
const chatView = $('#chatView');
const chatName = $('#chatName');
const chatAvatar = $('#chatAvatar');
const messagesEl = $('#messages');
const form = $('#messageForm');
const input = $('#messageInput');
const modal = $('#modal');
const nameInput = $('#chatNameInput');

/* ---------- Утилиты ---------- */
function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[ch]));
}
function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function genCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/* ---------- Аватары ---------- */
let regAvatar = AVATARS[0];

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
  if (!avatar) { el.textContent = '?'; el.style.background = '#263548'; return; }
  if (avatar.type === 'image') {
    el.innerHTML = `<img src="${avatar.value}" alt="">`;
    el.style.background = '#263548';
  } else {
    el.textContent = avatar.emoji;
    el.style.background = avatar.color || '#263548';
  }
}

/* ============================================================
   2. АУТЕНТИФИКАЦИЯ (анонимно)
   ============================================================ */
auth.signInAnonymously()
  .then(() => {
    // onAuthStateChanged сработает автоматически
  })
  .catch(err => {
    console.error('Ошибка входа:', err);
    alert('Не удалось подключиться к Firebase. Проверь конфиг и интернет.');
  });

auth.onAuthStateChanged(async user => {
  if (!user) return;
  state.uid = user.uid;

  // Загружаем профиль из Firestore
  const doc = await db.collection('users').doc(user.uid).get();
  if (doc.exists) {
    state.profile = doc.data();
    hideRegister();
    refreshProfileUI();
    startRealtime();
  } else {
    showRegister();
  }
});

/* ============================================================
   3. РЕГИСТРАЦИЯ
   ============================================================ */
function showRegister() {
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

$('#regSubmit').addEventListener('click', async () => {
  const name = $('#regName').value.trim();
  if (!name) { $('#regName').focus(); return; }

  // Генерируем уникальный код
  let code = state.profile?.code || genCode();
  // Проверяем, не занят ли код
  const codeCheck = await db.collection('users').where('code', '==', code).get();
  if (!codeCheck.empty && codeCheck.docs[0].id !== state.uid) {
    code = genCode(); // перегенерируем
  }

  const profile = {
    name,
    bio: $('#regBio').value.trim(),
    avatar: regAvatar,
    code,
    uid: state.uid
  };

  await db.collection('users').doc(state.uid).set(profile);
  state.profile = profile;

  hideRegister();
  refreshProfileUI();
  startRealtime();
});

/* ============================================================
   4. РЕАЛТАЙМ: ПОДПИСКИ
   ============================================================ */
function startRealtime() {
  // Подписка на чаты пользователя
  if (state.unsubChats) state.unsubChats();
  state.unsubChats = db.collection('chats')
    .where('members', 'array-contains', state.uid)
    .onSnapshot(snap => {
      state.chats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderChats(searchInput.value);
      refreshProfileUI();
    });

  // Подписка на контакты
  if (state.unsubContacts) state.unsubContacts();
  state.unsubContacts = db.collection('users')
    .where('uid', '!=', state.uid)
    .onSnapshot(async snap => {
      // Фильтруем тех, кто в контактах
      const contacts = [];
      for (const d of snap.docs) {
        const data = d.data();
        const isContact = await isInContacts(data.uid);
        if (isContact) contacts.push(data);
      }
      state.contacts = contacts;
      renderContacts();
    });
}

async function isInContacts(uid) {
  if (!state.profile) return false;
  const contactDoc = await db.collection('users').doc(state.uid)
    .collection('contacts').doc(uid).get();
  return contactDoc.exists;
}

/* ============================================================
   5. РЕНДЕР СПИСКА ЧАТОВ
   ============================================================ */
function renderChats(filter = '') {
  const q = filter.trim().toLowerCase();
  if (!state.chats.length) {
    chatList.innerHTML = `<div class="empty"><div>Чатов пока нет.</div><div>Добавьте контакт по коду.</div></div>`;
    return;
  }
  const list = state.chats.filter(c => (c.name || '').toLowerCase().includes(q));
  if (!list.length) {
    chatList.innerHTML = `<div class="empty">Ничего не найдено</div>`;
    return;
  }
  chatList.innerHTML = list.map(c => {
    const last = c.lastMessage || 'Нет сообщений';
    return `
      <div class="chat-row" data-id="${c.id}">
        <div class="avatar">${escapeHtml((c.name || '?')[0].toUpperCase())}</div>
        <div class="chat-meta">
          <strong>${escapeHtml(c.name || 'Чат')}</strong>
          <small>${escapeHtml(last)}</small>
        </div>
      </div>`;
  }).join('');
  chatList.querySelectorAll('.chat-row').forEach(r =>
    r.addEventListener('click', () => openChat(r.dataset.id))
  );
}

/* ============================================================
   6. РЕНДЕР КОНТАКТОВ
   ============================================================ */
function renderContacts() {
  const container = $('#contactsList');
  if (!state.contacts.length) {
    container.innerHTML = `
      <div class="empty">
        <div>Контактов пока нет.</div>
        <div>Введите код друга выше, чтобы добавить его.</div>
      </div>`;
    return;
  }
  container.innerHTML = state.contacts.map(c => `
    <div class="chat-row" data-uid="${c.uid}" data-code="${c.code}">
      <div class="avatar">${escapeHtml((c.name || '?')[0].toUpperCase())}</div>
      <div class="chat-meta">
        <strong>${escapeHtml(c.name)}</strong>
        <small>${escapeHtml(c.bio || 'Контакты')}</small>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.chat-row').forEach(r => {
    r.addEventListener('click', async () => {
      await startChatWith(r.dataset.uid, r.dataset.code);
    });
  });
}

/* ============================================================
   7. ДОБАВЛЕНИЕ КОНТАКТА ПО КОДУ
   ============================================================ */
searchCodeInput.addEventListener('input', async e => {
  const code = e.target.value.trim().toUpperCase();
  if (code.length !== 6) return;

  const snap = await db.collection('users').where('code', '==', code).get();
  if (snap.empty) {
    alert('Пользователь с таким кодом не найден');
    searchCodeInput.value = '';
    return;
  }

  const doc = snap.docs[0];
  if (doc.id === state.uid) {
    alert('Это ваш собственный код 🙂');
    return;
  }

  const friend = doc.data();

  // Добавляем друг друга в контакты (двусторонне)
  await db.collection('users').doc(state.uid).collection('contacts').doc(friend.uid).set({
    name: friend.name, bio: friend.bio, avatar: friend.avatar, code: friend.code, uid: friend.uid
  });
  await db.collection('users').doc(friend.uid).collection('contacts').doc(state.uid).set({
    name: state.profile.name, bio: state.profile.bio, avatar: state.profile.avatar,
    code: state.profile.code, uid: state.uid
  });

  // Создаём чат между вами
  await startChatWith(friend.uid, friend.code, friend.name);

  searchCodeInput.value = '';
  alert('Контакт добавлен! Чат создан.');
});

/* ============================================================
   8. СОЗДАНИЕ ЧАТА
   ============================================================ */
async function startChatWith(friendUid, friendCode, friendName) {
  // Ищем существующий чат
  const existing = await db.collection('chats')
    .where('members', '==', [state.uid, friendUid].sort())
    .get();

  let chatId;
  if (!existing.empty) {
    chatId = existing.docs[0].id;
  } else {
    // Создаём новый
    const ref = await db.collection('chats').add({
      members: [state.uid, friendUid].sort(),
      name: friendName || 'Чат',
      createdAt: Date.now(),
      lastMessage: ''
    });
    chatId = ref.id;
  }

  // Открываем чат
  switchTab('chats');
  setTimeout(() => openChat(chatId), 300);
}

/* ============================================================
   9. ОТКРЫТИЕ ЧАТА + MESSAGES
   ============================================================ */
function openChat(id) {
  const chat = state.chats.find(c => c.id === id);
  if (!chat) return;

  state.active = id;
  chatName.textContent = chat.name || 'Чат';
  chatAvatar.textContent = (chat.name || '?')[0].toUpperCase();

  welcome.classList.add('hidden');
  chatView.classList.remove('hidden');
  sidebar.classList.add('chat-open');

  // Отписка от предыдущего чата
  if (state.unsubMessages) state.unsubMessages();

  // Realtime-подписка на сообщения
  state.unsubMessages = db.collection('chats').doc(id)
    .collection('messages')
    .orderBy('time')
    .onSnapshot(snap => {
      messagesEl.innerHTML = snap.docs.map(d => {
        const m = d.data();
        return `
          <div class="msg ${m.uid === state.uid ? 'me' : ''}">
            <div>${escapeHtml(m.text)}</div>
            <span class="msg-time">${formatTime(m.time)}</span>
          </div>`;
      }).join('');
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });

  input.focus();
}

function closeChat() {
  if (state.unsubMessages) {
    state.unsubMessages();
    state.unsubMessages = null;
  }
  state.active = null;
  chatView.classList.add('hidden');
  welcome.classList.remove('hidden');
  sidebar.classList.remove('chat-open');
}

/* ============================================================
   10. ОТПРАВКА СООБЩЕНИЯ
   ============================================================ */
form.addEventListener('submit', async e => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text || !state.active) return;

  await db.collection('chats').doc(state.active).collection('messages').add({
    text,
    uid: state.uid,
    time: Date.now()
  });

  // Обновляем lastMessage
  await db.collection('chats').doc(state.active).update({
    lastMessage: text
  });

  input.value = '';
});

/* ============================================================
   11. ПЕРЕКЛЮЧЕНИЕ ТАБОВ
   ============================================================ */
function switchTab(tab) {
  state.tab = tab;
  document.querySelectorAll('.nav-item').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tab)
  );
  const titles = { chats: 'Чаты', contacts: 'Контакты', settings: 'Настройки', profile: 'Профиль' };
  sidebarTitle.textContent = titles[tab] || 'Чаты';
  headActions.style.display = tab === 'chats' ? 'flex' : 'none';

  viewChats.classList.toggle('hidden', tab !== 'chats');
  viewContacts.classList.toggle('hidden', tab !== 'contacts');
  viewSettings.classList.toggle('hidden', tab !== 'settings');
  viewProfile.classList.toggle('hidden', tab !== 'profile');

  if (tab === 'profile') refreshProfileUI();
  if (tab === 'contacts') renderContacts();
}

document.querySelectorAll('.nav-item').forEach(btn =>
  btn.addEventListener('click', () => switchTab(btn.dataset.tab))
);

/* ============================================================
   12. ПРОФИЛЬ
   ============================================================ */
function refreshProfileUI() {
  const p = state.profile;
  if (!p) return;
  applyAvatar($('#profileAvatar'), p.avatar);
  $('#profileName').textContent = p.name;
  $('#profileBio').textContent = p.bio || '';
  $('#myCode').textContent = p.code || '------';
  $('#myChatsCount').textContent = state.chats.length;
  const nav = document.querySelector('.nav-item[data-tab="profile"] span');
  if (nav) nav.textContent = p.avatar?.emoji || '😊';
}

$('#copyCode').addEventListener('click', async () => {
  if (!state.profile?.code) return;
  try {
    await navigator.clipboard.writeText(state.profile.code);
    $('#copyCode').textContent = 'Скопировано!';
    setTimeout(() => { $('#copyCode').textContent = 'Скопировать код'; }, 1400);
  } catch {
    alert('Ваш код: ' + state.profile.code);
  }
});

/* ============================================================
   13. МОДАЛКА НОВОГО ЧАТА (оставил для совместимости)
   ============================================================ */
function openModal() { modal.classList.remove('hidden'); nameInput.value = ''; setTimeout(() => nameInput.focus(), 30); }
function closeModal() { modal.classList.add('hidden'); nameInput.value = ''; }
$('#newChat').addEventListener('click', openModal);
$('#cancelModal').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal(); });

$('#inviteBtn').addEventListener('click', () => {
  if (!state.profile?.code) return;
  navigator.clipboard?.writeText(state.profile.code);
  alert('Ваш код приглашения: ' + state.profile.code + '\n\n(Скопирован)');
});

$('#createChat').addEventListener('click', async () => {
  const name = nameInput.value.trim();
  if (!name) { nameInput.focus(); return; }
  // Ищем пользователя по имени — упрощённо: создаём "личный" чат без собеседника
  const ref = await db.collection('chats').add({
    members: [state.uid],
    name,
    createdAt: Date.now(),
    lastMessage: ''
  });
  closeModal();
  openChat(ref.id);
});

nameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); $('#createChat').click(); }
});

/* ============================================================
   14. ДЕЙСТВИЯ В НАСТРОЙКАХ
   ============================================================ */
document.querySelectorAll('[data-action]').forEach(row => {
  row.addEventListener('click', async () => {
    const a = row.dataset.action;
    if (a === 'edit-profile' || a === 'account') showRegister();
    else if (a === 'my-chats') switchTab('chats');
    else if (a === 'switch') {
      if (confirm('Выйти из профиля?')) {
        await auth.signOut();
        location.reload();
      }
    }
    else if (a === 'delete') {
      if (confirm('Удалить аккаунт? Все данные будут стёрты.')) {
        // Удаляем профиль и чаты
        await db.collection('users').doc(state.uid).delete();
        const chatsSnap = await db.collection('chats').where('members', 'array-contains', state.uid).get();
        for (const d of chatsSnap.docs) await d.ref.delete();
        await auth.currentUser.delete();
        location.reload();
      }
    }
    else alert('Этот раздел появится позже 🙂');
  });
});

/* ============================================================
   15. ПОИСК
   ============================================================ */
searchInput.addEventListener('input', e => renderChats(e.target.value));

/* ============================================================
   16. КНОПКА НАЗАД (мобильные)
   ============================================================ */
$('#backBtn').addEventListener('click', closeChat);

/* ============================================================
   17. СТАРТ
   ============================================================ */
switchTab('chats');
