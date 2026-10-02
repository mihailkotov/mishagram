/* ============================================================
   Mishagram
   ============================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyBoehRziARm01S0XWYH6ez63TmGa-ycwwE",
  authDomain: "mishagram-b1477.firebaseapp.com",
  projectId: "mishagram-b1477",
  storageBucket: "mishagram-b1477.firebasestorage.app",
  messagingSenderId: "205897759661",
   appId: "1:205897759661:web:26ca3a96a61f034efc3f24",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

/* ---------- Константы ---------- */
const NICK_DOMAIN = '@mishagram.app';
const nickToEmail = n => n.toLowerCase() + NICK_DOMAIN;

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

const GROUP_ICONS = [
  '👥','👨‍👩‍👧','👨‍👩‍👧‍👦','🎉','💼','🎮','⚽','🎵','🎬','📚','🍕','☕',
  '💬','🔥','⭐','❤️','🌟','🚀','🏠','🌍','🐶','🐱','🌈','🎓',
  '🏆','💡','🍔','🍺','🎯','🎨','🎸','⚡','🦄','🐼','🦊','🌻'
];

/* ---------- Состояние ---------- */
const state = {
  uid: null,
  profile: null,
  contacts: [],
  chats: [],
  active: null,
  tab: 'chats',
  unsubMessages: null,
  unsubContacts: null,
  unsubChats: null,
  presenceTimer: null
};

const selectedGroupMembers = new Set();
let selectedGroupIcon = '👥';
let giEditingIcon = '👥';
let giCurrentChatId = null;
const addMemberSelection = new Set();
let addMemberChatId = null;
let regAvatar = AVATARS[0];
let unsubPresence = null;

/* ---------- DOM ---------- */
const $ = s => document.querySelector(s);
const app = $('#app');
const welcomeScreen = $('#welcomeScreen');
const loginScreen = $('#loginScreen');
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
const welcome = $('#welcome');
const chatView = $('#chatView');
const chatName = $('#chatName');
const chatAvatar = $('#chatAvatar');
const messagesEl = $('#messages');
const form = $('#messageForm');
const input = $('#messageInput');
const modal = $('#modal');

/* ---------- Утилиты ---------- */
function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
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
function formatLastSeen(ts) {
  if (!ts) return 'недавно';
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'в сети';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `был(а) ${mins} мин назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `был(а) ${hours} ч назад`;
  const days = Math.floor(hours / 24);
  return `был(а) ${days} д назад`;
}
async function hashPassword(pw) {
  const enc = new TextEncoder().encode(pw);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}
function showAuthError(el, text) { el.textContent = text; el.classList.remove('hidden'); }
function hideAuthError(el) { el.classList.add('hidden'); }

function translateAuthError(code) {
  switch (code) {
    case 'auth/email-already-in-use': return 'Этот никнейм уже занят. Попробуйте другой.';
    case 'auth/invalid-email': return 'Некорректный никнейм.';
    case 'auth/weak-password': return 'Пароль слишком короткий (минимум 6 символов).';
    case 'auth/user-not-found': return 'Пользователь с таким никнеймом не найден.';
    case 'auth/wrong-password': return 'Неверный пароль.';
    case 'auth/invalid-credential': return 'Неверный никнейм или пароль.';
    case 'auth/too-many-requests': return 'Слишком много попыток. Попробуйте позже.';
    case 'auth/network-request-failed': return 'Нет соединения. Проверьте интернет.';
    default: return 'Ошибка: ' + code;
  }
}

function getChatDisplay(chat) {
  if (!chat) return { otherUid: null, otherName: 'Чат', isGroup: false, icon: null };
  if (chat.isGroup) {
    return { otherUid: null, otherName: chat.name || 'Группа', isGroup: true, icon: chat.icon || '👥' };
  }
  const otherUid = (chat.members || []).find(u => u !== state.uid);
  const otherName = chat.names?.[otherUid] || chat.name || 'Чат';
  return { otherUid, otherName, isGroup: false, icon: null };
}

function getRole(chat, uid) {
  if (!chat || !chat.isGroup) return null;
  if (chat.ownerId === uid) return 'owner';
  if ((chat.admins || []).includes(uid)) return 'admin';
  return 'member';
}
const isOwner = chat => chat && chat.ownerId === state.uid;
const isAdminOrOwner = chat => chat && (chat.ownerId === state.uid || (chat.admins || []).includes(state.uid));

function canDo(chat, action) {
  if (!chat || !chat.isGroup) return true;
  if (isAdminOrOwner(chat)) return true;
  const perms = chat.permissions || {};
  switch (action) {
    case 'addMembers': return perms.addMembers === true;
    case 'removeMembers': return perms.removeMembers === true;
    case 'editGroup': return perms.editGroup === true;
    case 'sendMessages': return perms.sendMessages !== false;
    default: return false;
  }
}

/* ---------- Аватары ---------- */
function renderAvatarPicker(container, selected, onPick) {
  container.innerHTML = AVATARS.map((a, i) => `
    <div class="ava ${a === selected ? 'selected' : ''}"
         data-i="${i}" style="background:${a.color}">${a.emoji}</div>
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
   ЭКРАНЫ АУТЕНТИФИКАЦИИ
   ============================================================ */
function showWelcome() {
  welcomeScreen.classList.remove('hidden');
  loginScreen.classList.add('hidden');
  registerScreen.classList.add('hidden');
  app.classList.add('hidden');
}
function showLogin() {
  welcomeScreen.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  registerScreen.classList.add('hidden');
  app.classList.add('hidden');
  hideAuthError($('#loginError'));
  $('#loginNick').value = '';
  $('#loginPassword').value = '';
  setTimeout(() => $('#loginNick').focus(), 40);
}
function showRegister() {
  welcomeScreen.classList.add('hidden');
  loginScreen.classList.add('hidden');
  registerScreen.classList.remove('hidden');
  app.classList.add('hidden');
  hideAuthError($('#regError'));
  $('#regName').value = '';
  $('#regNick').value = '';
  $('#regPassword').value = '';
  $('#regPassword2').value = '';
  $('#regBio').value = '';
  regAvatar = AVATARS[0];
  applyAvatar($('#regPreview'), regAvatar);
  renderAvatarPicker($('#regAvatars'), regAvatar, a => {
    regAvatar = a;
    applyAvatar($('#regPreview'), a);
  });
  setTimeout(() => $('#regName').focus(), 40);
}
function hideAllAuthScreens() {
  welcomeScreen.classList.add('hidden');
  loginScreen.classList.add('hidden');
  registerScreen.classList.add('hidden');
}

$('#goLogin').addEventListener('click', showLogin);
$('#goRegister').addEventListener('click', showRegister);
$('#backToWelcome1').addEventListener('click', showWelcome);
$('#backToWelcome2').addEventListener('click', showWelcome);
$('#toRegister').addEventListener('click', showRegister);
$('#toLogin').addEventListener('click', showLogin);

/* Санитайз никнейма */
const sanitizeNick = v => v.toLowerCase().replace(/[^a-z0-9_.]/g, '');
$('#loginNick').addEventListener('input', e => { e.target.value = sanitizeNick(e.target.value); });
$('#regNick').addEventListener('input', e => { e.target.value = sanitizeNick(e.target.value); });

/* Фото */
$('#regGallery').addEventListener('click', () => $('#regFile').click());
$('#regFile').addEventListener('change', e => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (file.size > 500_000) { alert('Картинка слишком большая (макс 500 КБ)'); return; }
  const reader = new FileReader();
  reader.onload = ev => {
    regAvatar = { type: 'image', value: ev.target.result };
    applyAvatar($('#regPreview'), regAvatar);
    $('#regAvatars').querySelectorAll('.ava').forEach(x => x.classList.remove('selected'));
  };
  reader.readAsDataURL(file);
});

/* ============================================================
   ВХОД
   ============================================================ */
$('#loginSubmit').addEventListener('click', async () => {
  const nick = $('#loginNick').value.trim();
  const pw = $('#loginPassword').value;
  const errEl = $('#loginError');
  hideAuthError(errEl);

  if (nick.length < 3) { showAuthError(errEl, 'Никнейм слишком короткий (мин. 3)'); return; }
  if (!pw) { showAuthError(errEl, 'Введите пароль'); return; }

  const btn = $('#loginSubmit');
  btn.disabled = true;
  btn.textContent = 'Входим...';

  try {
    await auth.signInWithEmailAndPassword(nickToEmail(nick), pw);
  } catch (e) {
    console.error(e);
    showAuthError(errEl, translateAuthError(e.code));
    btn.disabled = false;
    btn.textContent = 'Войти';
  }
});
$('#loginPassword').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); $('#loginSubmit').click(); }
});

/* ============================================================
   РЕГИСТРАЦИЯ
   ============================================================ */
$('#regSubmit').addEventListener('click', async () => {
  const name = $('#regName').value.trim();
  const nick = $('#regNick').value.trim();
  const pw = $('#regPassword').value;
  const pw2 = $('#regPassword2').value;
  const bio = $('#regBio').value.trim();
  const errEl = $('#regError');
  hideAuthError(errEl);

  if (!name) { showAuthError(errEl, 'Введите имя'); $('#regName').focus(); return; }
  if (nick.length < 3) { showAuthError(errEl, 'Никнейм минимум 3 символа'); $('#regNick').focus(); return; }
  if (nick.length > 20) { showAuthError(errEl, 'Никнейм максимум 20 символов'); return; }
  if (pw.length < 6) { showAuthError(errEl, 'Пароль минимум 6 символов'); $('#regPassword').focus(); return; }
  if (pw !== pw2) { showAuthError(errEl, 'Пароли не совпадают'); $('#regPassword2').focus(); return; }

  const btn = $('#regSubmit');
  btn.disabled = true;
  btn.textContent = 'Создаём аккаунт...';

  try {
    const cred = await auth.createUserWithEmailAndPassword(nickToEmail(nick), pw);
    const uid = cred.user.uid;

    let code = genCode();
    for (let i = 0; i < 5; i++) {
      const check = await db.collection('users').where('code', '==', code).get();
      if (check.empty) break;
      code = genCode();
    }

    const profile = { uid, nickname: nick, name, bio, avatar: regAvatar, code, createdAt: Date.now() };
    await db.collection('users').doc(uid).set(profile);

    state.uid = uid;
    state.profile = profile;
  } catch (e) {
    console.error(e);
    showAuthError(errEl, translateAuthError(e.code));
    btn.disabled = false;
    btn.textContent = 'Создать аккаунт';
  }
});

/* ============================================================
   СОСТОЯНИЕ АУТЕНТИФИКАЦИИ
   ============================================================ */
auth.onAuthStateChanged(async user => {
  if (user && user.isAnonymous) { await auth.signOut(); return; }

  if (!user) {
    state.uid = null; state.profile = null;
    if (state.unsubChats) { state.unsubChats(); state.unsubChats = null; }
    if (state.unsubContacts) { state.unsubContacts(); state.unsubContacts = null; }
    showWelcome();
    return;
  }

  state.uid = user.uid;
  try {
    const doc = await db.collection('users').doc(user.uid).get();
    if (doc.exists) {
      state.profile = doc.data();
      hideAllAuthScreens();
      app.classList.remove('hidden');
      refreshProfileUI();
      startRealtime();
      subscribeContacts();
      startPresence();
      switchTab('chats');
    } else {
      await auth.signOut();
    }
  } catch (e) {
    console.error('Ошибка загрузки профиля:', e);
  }
});

/* ============================================================
   ПРИСУТСТВИЕ
   ============================================================ */
function startPresence() {
  if (!state.uid) return;
  const ping = () => {
    if (!state.uid) return;
    db.collection('users').doc(state.uid).update({ lastSeen: Date.now() }).catch(() => {});
  };
  ping();
  setInterval(ping, 30_000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) ping(); });
}

function watchPresence(uid) {
  if (unsubPresence) { unsubPresence(); unsubPresence = null; }
  if (!uid) return;
  unsubPresence = db.collection('users').doc(uid)
    .onSnapshot(snap => { if (snap.exists) updatePresenceLabel(snap.data().lastSeen || 0); });
  clearInterval(state.presenceTimer);
  state.presenceTimer = setInterval(() => {
    const el = document.querySelector('.chat-header .status');
    if (el && el.dataset.ts) updatePresenceLabel(Number(el.dataset.ts));
  }, 30_000);
}
function updatePresenceLabel(ts) {
  const el = document.querySelector('.chat-header .status');
  if (!el) return;
  el.dataset.ts = ts;
  el.textContent = formatLastSeen(ts);
}

/* ============================================================
   РЕАЛТАЙМ: ЧАТЫ
   ============================================================ */
function startRealtime() {
  if (state.unsubChats) state.unsubChats();
  state.unsubChats = db.collection('chats')
    .where('members', 'array-contains', state.uid)
    .onSnapshot(snap => {
      state.chats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      state.chats.sort((a, b) =>
        (b.lastMessageTime || b.createdAt || 0) - (a.lastMessageTime || a.createdAt || 0)
      );
      renderChats(searchInput.value);
      refreshProfileUI();
      if (giCurrentChatId && !$('#groupInfoModal').classList.contains('hidden')) renderGroupInfo();
    });
}

/* ============================================================
   СПИСОК ЧАТОВ
   ============================================================ */
function renderChats(filter = '') {
  const q = filter.trim().toLowerCase();
  if (!state.chats.length) {
    chatList.innerHTML = `<div class="empty"><div>Чатов пока нет.</div><div>Добавьте контакт по коду во вкладке «Контакты».</div></div>`;
    return;
  }
  const list = state.chats.filter(c => getChatDisplay(c).otherName.toLowerCase().includes(q));
  if (!list.length) {
    chatList.innerHTML = `<div class="empty">Ничего не найдено</div>`;
    return;
  }

  chatList.innerHTML = list.map(c => {
    const last = c.lastMessage || 'Нет сообщений';
    const { otherName, isGroup, icon } = getChatDisplay(c);
    const avatarHtml = isGroup
      ? `<div class="avatar has-emoji">${escapeHtml(icon)}</div>`
      : `<div class="avatar">${escapeHtml((otherName || '?')[0].toUpperCase())}</div>`;
    const lock = c.isPrivate ? '🔒 ' : '';
    return `
      <div class="chat-row" data-id="${c.id}">
        ${avatarHtml}
        <div class="chat-meta">
          <strong>${lock}${escapeHtml(otherName)}</strong>
          <small>${escapeHtml(last)}</small>
        </div>
      </div>`;
  }).join('');

  chatList.querySelectorAll('.chat-row').forEach(r =>
    r.addEventListener('click', () => openChat(r.dataset.id))
  );
}

/* ============================================================
   КОНТАКТЫ
   ============================================================ */
function subscribeContacts() {
  if (!state.uid) return;
  if (state.unsubContacts) state.unsubContacts();
  state.unsubContacts = db.collection('users').doc(state.uid)
    .collection('contacts')
    .onSnapshot(snap => {
      state.contacts = snap.docs.map(d => d.data());
      renderContacts();
    }, err => console.error('Ошибка контактов:', err));
}

function renderContacts() {
  const container = $('#contactsList');
  if (!container) return;
  if (!state.contacts.length) {
    container.innerHTML = `<div class="empty-small">Контактов пока нет. Введите код друга выше, чтобы добавить его.</div>`;
    return;
  }
  container.innerHTML = state.contacts.map(c => `
    <div class="chat-row" data-uid="${c.uid}" data-name="${escapeHtml(c.name)}">
      <div class="avatar">${escapeHtml((c.name || '?')[0].toUpperCase())}</div>
      <div class="chat-meta">
        <strong>${escapeHtml(c.name)}</strong>
        <small>${escapeHtml(c.bio || (c.nickname ? '@' + c.nickname : 'Контакты'))}</small>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.chat-row').forEach(r => {
    r.addEventListener('click', () => startChatWith(r.dataset.uid, r.dataset.name));
  });
}

async function addContactByUid(targetUid) {
  try {
    const doc = await db.collection('users').doc(targetUid).get();
    if (!doc.exists) { alert('Пользователь не найден'); return; }
    const friend = doc.data();
    await db.collection('users').doc(state.uid)
      .collection('contacts').doc(targetUid).set({
        uid: friend.uid, name: friend.name, bio: friend.bio || '',
        avatar: friend.avatar || null, code: friend.code || '',
        nickname: friend.nickname || ''
      });
    await startChatWith(friend.uid, friend.name);
  } catch (e) {
    console.error(e);
    alert('Не удалось добавить контакт: ' + e.message);
  }
}

$('#addByCode').addEventListener('click', async () => {
  const code = $('#searchCodeInput').value.trim().toUpperCase();
  if (code.length !== 6) { alert('Код должен состоять из 6 символов'); return; }
  try {
    const snap = await db.collection('users').where('code', '==', code).get();
    if (snap.empty) { alert('Пользователь с кодом «' + code + '» не найден'); return; }
    const targetDoc = snap.docs[0];
    if (targetDoc.id === state.uid) { alert('Это ваш собственный код 🙂'); return; }
    await addContactByUid(targetDoc.id);
    $('#searchCodeInput').value = '';
  } catch (e) { console.error(e); alert('Ошибка: ' + e.message); }
});
$('#searchCodeInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); $('#addByCode').click(); }
});

/* ============================================================
   ЛИЧНЫЙ ЧАТ
   ============================================================ */
async function startChatWith(friendUid, friendName) {
  const snap = await db.collection('chats')
    .where('members', 'array-contains', state.uid).get();

  const existing = snap.docs.find(d => {
    const data = d.data();
    return !data.isGroup && Array.isArray(data.members) && data.members.includes(friendUid);
  });

  let chatId;
  if (existing) {
    chatId = existing.id;
    const d = existing.data();
    const names = d.names || {};
    names[state.uid] = state.profile.name;
    if (!names[friendUid]) names[friendUid] = friendName || 'Друг';
    await existing.ref.update({ names });
  } else {
    const members = [state.uid, friendUid].sort();
    const names = { [state.uid]: state.profile.name, [friendUid]: friendName || 'Друг' };
    const ref = await db.collection('chats').add({
      members, names, isGroup: false,
      createdAt: Date.now(), lastMessage: '', lastMessageTime: Date.now()
    });
    chatId = ref.id;
  }

  switchTab('chats');
  setTimeout(() => openChat(chatId), 300);
}

/* ============================================================
   СОЗДАНИЕ ГРУППЫ
   ============================================================ */
function renderGroupIconPicker() {
  const c = $('#groupIconPicker');
  if (!c) return;
  c.innerHTML = GROUP_ICONS.map(emoji => `
    <div class="gpick ${emoji === selectedGroupIcon ? 'selected' : ''}" data-emoji="${emoji}">${emoji}</div>
  `).join('');
  c.querySelectorAll('.gpick').forEach(el => {
    el.addEventListener('click', () => {
      selectedGroupIcon = el.dataset.emoji;
      $('#groupIconPreview').textContent = selectedGroupIcon;
      c.querySelectorAll('.gpick').forEach(x => x.classList.remove('selected'));
      el.classList.add('selected');
    });
  });
}

function openModal() {
  modal.classList.remove('hidden');
  $('#groupNameInput').value = '';
  $('#makePrivate').checked = false;
  $('#groupPassword').value = '';
  $('#privateBlock').classList.add('hidden');
  selectedGroupMembers.clear();
  selectedGroupIcon = '👥';
  $('#groupIconPreview').textContent = '👥';
  $('#groupIconPicker').classList.add('hidden');
  renderGroupIconPicker();
  renderGroupContacts();
  setTimeout(() => $('#groupNameInput').focus(), 30);
}
function closeModal() {
  modal.classList.add('hidden');
  $('#groupNameInput').value = '';
  $('#groupPassword').value = '';
  $('#makePrivate').checked = false;
  $('#privateBlock').classList.add('hidden');
  $('#groupIconPicker').classList.add('hidden');
  selectedGroupMembers.clear();
  selectedGroupIcon = '👥';
}

function renderGroupContacts() {
  const c = $('#groupContacts');
  if (!c) return;
  if (!state.contacts.length) {
    c.innerHTML = `<div class="empty-small">У вас пока нет контактов. Сначала добавьте друзей во вкладке «Контакты».</div>`;
    return;
  }
  c.innerHTML = state.contacts.map(x => {
    const sel = selectedGroupMembers.has(x.uid);
    return `
      <div class="group-contact ${sel ? 'selected' : ''}" data-uid="${x.uid}">
        <div class="group-check">✓</div>
        <div class="avatar">${escapeHtml((x.name || '?')[0].toUpperCase())}</div>
        <div class="chat-meta"><strong>${escapeHtml(x.name)}</strong></div>
      </div>`;
  }).join('');
  c.querySelectorAll('.group-contact').forEach(el => {
    el.addEventListener('click', () => {
      const uid = el.dataset.uid;
      if (selectedGroupMembers.has(uid)) selectedGroupMembers.delete(uid);
      else selectedGroupMembers.add(uid);
      renderGroupContacts();
    });
  });
}

$('#newChat').addEventListener('click', openModal);
$('#cancelModal').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
$('#toggleIconPicker').addEventListener('click', () => $('#groupIconPicker').classList.toggle('hidden'));
$('#makePrivate').addEventListener('change', e => {
  $('#privateBlock').classList.toggle('hidden', !e.target.checked);
});

$('#createGroup').addEventListener('click', async () => {
  const name = $('#groupNameInput').value.trim();
  if (!name) { $('#groupNameInput').focus(); return; }
  if (selectedGroupMembers.size < 1) { alert('Выберите хотя бы одного участника'); return; }

  const isPrivate = $('#makePrivate').checked;
  const pw = $('#groupPassword').value;
  if (isPrivate && pw.length < 4) { alert('Пароль должен быть не короче 4 символов'); return; }

  const memberUids = [state.uid, ...selectedGroupMembers].sort();
  const names = { [state.uid]: state.profile.name };
  state.contacts.forEach(c => {
    if (selectedGroupMembers.has(c.uid)) names[c.uid] = c.name;
  });

  const doc = {
    members: memberUids, names, isGroup: true, name,
    icon: selectedGroupIcon, ownerId: state.uid, admins: [],
    permissions: { addMembers: false, removeMembers: false, editGroup: false, sendMessages: true },
    isPrivate, createdAt: Date.now(), lastMessage: 'Группа создана', lastMessageTime: Date.now()
  };

  if (isPrivate) {
    doc.inviteCode = genCode();
    doc.passwordHash = await hashPassword(pw);
  }

  const ref = await db.collection('chats').add(doc);
  closeModal();
  switchTab('chats');
  setTimeout(() => openChat(ref.id), 400);
});

/* ============================================================
   ОТКРЫТИЕ ЧАТА
   ============================================================ */
function openChat(id) {
  const chat = state.chats.find(c => c.id === id);
  const { otherUid, otherName, isGroup, icon } = chat
    ? getChatDisplay(chat)
    : { otherUid: null, otherName: 'Чат', isGroup: false, icon: null };

  state.active = id;
  chatName.textContent = otherName;

  if (isGroup) {
    chatAvatar.textContent = icon || '👥';
    chatAvatar.classList.add('has-emoji');
  } else {
    chatAvatar.classList.remove('has-emoji');
    chatAvatar.textContent = (otherName || '?')[0].toUpperCase();
  }

  const statusEl = document.querySelector('.chat-header .status');
  if (isGroup && chat) {
    statusEl.dataset.ts = '';
    statusEl.textContent = `${(chat.members || []).length} участников`;
  } else if (otherUid) {
    statusEl.textContent = '...';
    watchPresence(otherUid);
  } else {
    statusEl.textContent = '';
  }

  const header = document.querySelector('.chat-header');
  if (isGroup) {
    header.style.cursor = 'pointer';
    header.onclick = e => { if (!e.target.closest('#backBtn')) openGroupInfo(id); };
  } else {
    header.style.cursor = '';
    header.onclick = null;
  }

  const canSend = !chat ? true : (isGroup ? canDo(chat, 'sendMessages') : true);
  form.classList.toggle('hidden', !canSend);
  $('#readOnlyNotice').classList.toggle('hidden', canSend);

  welcome.classList.add('hidden');
  chatView.classList.remove('hidden');
  sidebar.classList.add('chat-open');

  if (state.unsubMessages) state.unsubMessages();
  state.unsubMessages = db.collection('chats').doc(id)
    .collection('messages').orderBy('time')
    .onSnapshot(snap => {
      messagesEl.innerHTML = snap.docs.map(d => {
        const m = d.data();
        const isMe = m.uid === state.uid;
        const senderName = chat?.names?.[m.uid] || 'Кто-то';
        const showName = isGroup && !isMe;
        return `
          <div class="msg ${isMe ? 'me' : ''}">
            ${showName ? `<div class="msg-sender">${escapeHtml(senderName)}</div>` : ''}
            <div>${escapeHtml(m.text)}</div>
            <span class="msg-time">${formatTime(m.time)}</span>
          </div>`;
      }).join('');
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });

  input.focus();
}

function closeChat() {
  if (state.unsubMessages) { state.unsubMessages(); state.unsubMessages = null; }
  if (unsubPresence) { unsubPresence(); unsubPresence = null; }
  clearInterval(state.presenceTimer);
  state.presenceTimer = null;
  state.active = null;
  chatView.classList.add('hidden');
  welcome.classList.remove('hidden');
  sidebar.classList.remove('chat-open');
}

/* ============================================================
   ОТПРАВКА
   ============================================================ */
form.addEventListener('submit', async e => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text || !state.active) return;
  const chat = state.chats.find(c => c.id === state.active);
  if (chat && chat.isGroup && !canDo(chat, 'sendMessages')) return;

  await db.collection('chats').doc(state.active).collection('messages').add({
    text, uid: state.uid, time: Date.now()
  });
  await db.collection('chats').doc(state.active).update({
    lastMessage: text, lastMessageTime: Date.now()
  });
  input.value = '';
});

/* ============================================================
   ИНФО О ГРУППЕ
   ============================================================ */
function openGroupInfo(chatId) {
  giCurrentChatId = chatId;
  $('#groupInfoModal').classList.remove('hidden');
  $('#giEditBlock').classList.add('hidden');
  renderGroupInfo();
}
function closeGroupInfo() {
  giCurrentChatId = null;
  $('#groupInfoModal').classList.add('hidden');
  $('#giEditBlock').classList.add('hidden');
  removeMenu();
}

function renderGroupInfo() {
  const chat = state.chats.find(c => c.id === giCurrentChatId);
  if (!chat) { closeGroupInfo(); return; }

  const myRole = getRole(chat, state.uid);
  const canManage = isAdminOrOwner(chat);
  const canEdit = canDo(chat, 'editGroup');

  $('#giIcon').textContent = chat.icon || '👥';
  $('#giName').textContent = chat.name || 'Группа';
  $('#giMeta').textContent = `${(chat.members || []).length} участников` + (chat.isPrivate ? ' · 🔒 приватный' : '');
  $('#giEditBtn').classList.toggle('hidden', !canEdit);

  const membersEl = $('#giMembers');
  membersEl.innerHTML = (chat.members || []).map(uid => {
    const role = getRole(chat, uid);
    const name = chat.names?.[uid] || 'Участник';
    const roleLabel = role === 'owner' ? 'Владелец' : role === 'admin' ? 'Админ' : 'Участник';
    const isMe = uid === state.uid;
    const letter = (name || '?')[0].toUpperCase();
    let showMenu = false;
    if (!isMe) {
      if (isOwner(chat)) showMenu = true;
      else if (myRole === 'admin' && role === 'member') showMenu = true;
      else if (canDo(chat, 'removeMembers') && role === 'member') showMenu = true;
    }
    return `
      <div class="group-member" data-uid="${uid}">
        <div class="avatar">${escapeHtml(letter)}</div>
        <div class="gm-info"><strong>${escapeHtml(name)}${isMe ? ' (вы)' : ''}</strong></div>
        <div class="gm-role ${role}">${roleLabel}</div>
        ${showMenu ? `<button class="gm-menu-btn" data-menu-uid="${uid}">⋮</button>` : ''}
      </div>`;
  }).join('');

  membersEl.querySelectorAll('.gm-menu-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      showMemberMenu(btn, btn.dataset.menuUid, chat);
    });
  });

  $('#giAddMemberBtn').classList.toggle('hidden', !canDo(chat, 'addMembers'));

  const showInvite = chat.isPrivate && canManage;
  $('#giInvite').classList.toggle('hidden', !showInvite);
  if (showInvite) $('#giInviteCode').textContent = chat.inviteCode || '------';

  $('#giPermissionsWrap').classList.toggle('hidden', !canManage);
  if (canManage) renderPermissions(chat);

  const actionsEl = $('#giActions');
  actionsEl.innerHTML = myRole === 'owner'
    ? `<button id="giDeleteGroup" class="danger">🗑️ Удалить группу</button>`
    : `<button id="giLeaveGroup" class="danger">🚪 Покинуть группу</button>`;

  const leaveBtn = $('#giLeaveGroup');
  if (leaveBtn) leaveBtn.addEventListener('click', () => leaveGroup(chat));
  const delBtn = $('#giDeleteGroup');
  if (delBtn) delBtn.addEventListener('click', () => deleteGroup(chat));
}

function renderPermissions(chat) {
  const perms = chat.permissions || {};
  const items = [
    { key: 'addMembers', label: 'Добавлять участников' },
    { key: 'removeMembers', label: 'Удалять участников' },
    { key: 'editGroup', label: 'Менять название и иконку' },
    { key: 'sendMessages', label: 'Отправлять сообщения', invert: true }
  ];
  const c = $('#giPermissions');
  c.innerHTML = items.map(it => {
    const on = it.invert ? perms[it.key] !== false : perms[it.key] === true;
    return `
      <div class="perm-row ${on ? 'on' : ''}" data-key="${it.key}">
        <div class="perm-label">${it.label}</div>
        <div class="perm-toggle"></div>
      </div>`;
  }).join('');

  c.querySelectorAll('.perm-row').forEach(row => {
    row.addEventListener('click', async () => {
      const key = row.dataset.key;
      const invert = items.find(x => x.key === key).invert;
      const current = invert ? ((chat.permissions || {})[key] !== false) : ((chat.permissions || {})[key] === true);
      const next = !current;
      const permissions = { ...(chat.permissions || {}), [key]: next };
      await db.collection('chats').doc(chat.id).update({ permissions });
      const local = state.chats.find(x => x.id === chat.id);
      if (local) local.permissions = permissions;
      chat.permissions = permissions;
      renderPermissions(chat);
    });
  });
}

function removeMenu() { document.querySelectorAll('.gm-menu').forEach(el => el.remove()); }

function showMemberMenu(anchor, uid, chat) {
  removeMenu();
  const role = getRole(chat, uid);
  const iAmOwner = isOwner(chat);
  const iAmAdmin = getRole(chat, state.uid) === 'admin';
  const canRemoveByPerm = canDo(chat, 'removeMembers');

  const items = [];
  if (iAmOwner) {
    if (role !== 'owner') items.push({ label: '👑 Передать права владельца', action: () => transferOwnership(chat, uid) });
    if (role === 'admin') items.push({ label: '↓ Снять права админа', action: () => demoteAdmin(chat, uid) });
    if (role === 'member') items.push({ label: '🛡️ Назначить админом', action: () => promoteAdmin(chat, uid) });
    if (role !== 'owner') items.push({ label: '❌ Удалить из группы', danger: true, action: () => removeMember(chat, uid) });
  } else if (iAmAdmin && role === 'member') {
    items.push({ label: '❌ Удалить из группы', danger: true, action: () => removeMember(chat, uid) });
  } else if (canRemoveByPerm && role === 'member') {
    items.push({ label: '❌ Удалить из группы', danger: true, action: () => removeMember(chat, uid) });
  }

  if (!items.length) return;

  const menu = document.createElement('div');
  menu.className = 'gm-menu';
  menu.innerHTML = items.map((it, i) =>
    `<button data-i="${i}" class="${it.danger ? 'danger' : ''}">${it.label}</button>`
  ).join('');
  document.body.appendChild(menu);

  const rect = anchor.getBoundingClientRect();
  menu.style.position = 'fixed';
  menu.style.top = Math.min(rect.bottom + 6, window.innerHeight - menu.offsetHeight - 10) + 'px';
  menu.style.left = Math.min(rect.left, window.innerWidth - 250) + 'px';

  menu.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => {
      const item = items[Number(b.dataset.i)];
      removeMenu();
      item.action();
    });
  });
}
document.addEventListener('click', e => {
  if (!e.target.closest('.gm-menu') && !e.target.closest('.gm-menu-btn')) removeMenu();
});

async function transferOwnership(chat, newOwnerUid) {
  if (!isOwner(chat)) return;
  if (!confirm('Передать права владельца? Вы станете обычным админом.')) return;
  const admins = (chat.admins || []).filter(u => u !== newOwnerUid);
  if (!admins.includes(state.uid)) admins.push(state.uid);
  await db.collection('chats').doc(chat.id).update({ ownerId: newOwnerUid, admins });
  const local = state.chats.find(c => c.id === chat.id);
  if (local) { local.ownerId = newOwnerUid; local.admins = admins; }
  renderGroupInfo();
}
async function promoteAdmin(chat, uid) {
  if (!isOwner(chat)) return;
  const admins = [...(chat.admins || [])];
  if (!admins.includes(uid)) admins.push(uid);
  await db.collection('chats').doc(chat.id).update({ admins });
  const local = state.chats.find(c => c.id === chat.id);
  if (local) local.admins = admins;
  renderGroupInfo();
}
async function demoteAdmin(chat, uid) {
  if (!isOwner(chat)) return;
  const admins = (chat.admins || []).filter(u => u !== uid);
  await db.collection('chats').doc(chat.id).update({ admins });
  const local = state.chats.find(c => c.id === chat.id);
  if (local) local.admins = admins;
  renderGroupInfo();
}
async function removeMember(chat, uid) {
  if (uid === state.uid) return;
  if (chat.ownerId === uid) { alert('Нельзя удалить владельца — сначала передайте права'); return; }
  if (!confirm('Удалить участника из группы?')) return;
  const members = (chat.members || []).filter(u => u !== uid);
  const admins = (chat.admins || []).filter(u => u !== uid);
  const names = { ...(chat.names || {}) };
  delete names[uid];
  await db.collection('chats').doc(chat.id).update({ members, admins, names });
  const local = state.chats.find(c => c.id === chat.id);
  if (local) { local.members = members; local.admins = admins; local.names = names; }
  renderGroupInfo();
}
async function leaveGroup(chat) {
  if (isOwner(chat)) { alert('Вы владелец. Передайте права другому участнику, а затем покиньте группу.'); return; }
  if (!confirm('Покинуть группу?')) return;
  const members = (chat.members || []).filter(u => u !== state.uid);
  const admins = (chat.admins || []).filter(u => u !== state.uid);
  const names = { ...(chat.names || {}) };
  delete names[state.uid];
  await db.collection('chats').doc(chat.id).update({ members, admins, names });
  closeGroupInfo(); closeChat();
}
async function deleteGroup(chat) {
  if (!isOwner(chat)) return;
  if (!confirm('Удалить группу со всеми сообщениями? Отменить нельзя.')) return;
  const msgs = await db.collection('chats').doc(chat.id).collection('messages').get();
  for (const m of msgs.docs) await m.ref.delete();
  await db.collection('chats').doc(chat.id).delete();
  closeGroupInfo(); closeChat();
}

/* ============================================================
   РЕДАКТИРОВАНИЕ ГРУППЫ
   ============================================================ */
$('#giEditBtn').addEventListener('click', () => {
  const chat = state.chats.find(c => c.id === giCurrentChatId);
  if (!chat) return;
  $('#giNameInput').value = chat.name || '';
  giEditingIcon = chat.icon || '👥';
  const picker = $('#giIconPicker');
  picker.innerHTML = GROUP_ICONS.map(emoji => `
    <div class="gpick ${emoji === giEditingIcon ? 'selected' : ''}" data-emoji="${emoji}">${emoji}</div>
  `).join('');
  picker.querySelectorAll('.gpick').forEach(el => {
    el.addEventListener('click', () => {
      giEditingIcon = el.dataset.emoji;
      picker.querySelectorAll('.gpick').forEach(x => x.classList.remove('selected'));
      el.classList.add('selected');
    });
  });
  $('#giEditBlock').classList.remove('hidden');
});
$('#giCancelEdit').addEventListener('click', () => $('#giEditBlock').classList.add('hidden'));

$('#giSaveBtn').addEventListener('click', async () => {
  const chat = state.chats.find(c => c.id === giCurrentChatId);
  if (!chat || !canDo(chat, 'editGroup')) return;
  const name = $('#giNameInput').value.trim();
  if (!name) { $('#giNameInput').focus(); return; }
  await db.collection('chats').doc(chat.id).update({ name, icon: giEditingIcon });
  const local = state.chats.find(c => c.id === chat.id);
  if (local) { local.name = name; local.icon = giEditingIcon; }
  $('#giEditBlock').classList.add('hidden');
  renderGroupInfo();
  renderChats(searchInput.value);
  if (state.active === chat.id) {
    chatName.textContent = name;
    chatAvatar.textContent = giEditingIcon;
  }
});

$('#giCloseBtn').addEventListener('click', closeGroupInfo);
$('#groupInfoModal').addEventListener('click', e => {
  if (e.target === $('#groupInfoModal')) closeGroupInfo();
});
$('#giCopyInvite').addEventListener('click', () => {
  const chat = state.chats.find(c => c.id === giCurrentChatId);
  if (!chat?.inviteCode) return;
  navigator.clipboard?.writeText(chat.inviteCode);
  $('#giCopyInvite').textContent = 'Скопировано!';
  setTimeout(() => { $('#giCopyInvite').textContent = 'Скопировать код'; }, 1400);
});

/* ============================================================
   ДОБАВЛЕНИЕ УЧАСТНИКОВ
   ============================================================ */
$('#giAddMemberBtn').addEventListener('click', () => {
  addMemberChatId = giCurrentChatId;
  addMemberSelection.clear();
  renderAddMemberContacts();
  $('#addMemberModal').classList.remove('hidden');
});
function closeAddMemberModal() {
  addMemberChatId = null;
  addMemberSelection.clear();
  $('#addMemberModal').classList.add('hidden');
}
function renderAddMemberContacts() {
  const c = $('#addMemberContacts');
  const chat = state.chats.find(x => x.id === addMemberChatId);
  if (!chat) return;
  const inChat = new Set(chat.members || []);
  const available = state.contacts.filter(x => !inChat.has(x.uid));
  if (!available.length) {
    c.innerHTML = `<div class="empty-small">Все ваши контакты уже в группе.</div>`;
    return;
  }
  c.innerHTML = available.map(x => {
    const sel = addMemberSelection.has(x.uid);
    return `
      <div class="group-contact ${sel ? 'selected' : ''}" data-uid="${x.uid}">
        <div class="group-check">✓</div>
        <div class="avatar">${escapeHtml((x.name || '?')[0].toUpperCase())}</div>
        <div class="chat-meta"><strong>${escapeHtml(x.name)}</strong></div>
      </div>`;
  }).join('');
  c.querySelectorAll('.group-contact').forEach(el => {
    el.addEventListener('click', () => {
      const uid = el.dataset.uid;
      if (addMemberSelection.has(uid)) addMemberSelection.delete(uid);
      else addMemberSelection.add(uid);
      renderAddMemberContacts();
    });
  });
}
$('#amCancel').addEventListener('click', closeAddMemberModal);
$('#addMemberModal').addEventListener('click', e => {
  if (e.target === $('#addMemberModal')) closeAddMemberModal();
});
$('#amAdd').addEventListener('click', async () => {
  const chat = state.chats.find(c => c.id === addMemberChatId);
  if (!chat) return;
  if (!addMemberSelection.size) { alert('Никого не выбрано'); return; }
  if (!canDo(chat, 'addMembers')) { alert('Нет прав'); return; }
  const newMembers = [...new Set([...(chat.members || []), ...addMemberSelection])];
  const names = { ...(chat.names || {}) };
  state.contacts.forEach(c => {
    if (addMemberSelection.has(c.uid)) names[c.uid] = c.name;
  });
  await db.collection('chats').doc(chat.id).update({ members: newMembers, names });
  const local = state.chats.find(c => c.id === chat.id);
  if (local) { local.members = newMembers; local.names = names; }
  closeAddMemberModal();
  renderGroupInfo();
});

/* ============================================================
   ВХОД В ПРИВАТНЫЙ ЧАТ
   ============================================================ */
$('#openJoinBtn').addEventListener('click', () => {
  $('#joinModal').classList.remove('hidden');
  $('#joinCode').value = '';
  $('#joinPassword').value = '';
  setTimeout(() => $('#joinCode').focus(), 30);
});
function closeJoinModal() {
  $('#joinModal').classList.add('hidden');
  $('#joinCode').value = '';
  $('#joinPassword').value = '';
}
$('#joinCancel').addEventListener('click', closeJoinModal);
$('#joinModal').addEventListener('click', e => {
  if (e.target === $('#joinModal')) closeJoinModal();
});
$('#joinCode').addEventListener('input', e => {
  e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
});
$('#joinSubmit').addEventListener('click', async () => {
  const code = $('#joinCode').value.trim().toUpperCase();
  const pw = $('#joinPassword').value;
  if (code.length !== 6) { alert('Код должен быть из 6 символов'); return; }
  if (!pw) { alert('Введите пароль'); return; }

  try {
    const snap = await db.collection('chats')
      .where('isPrivate', '==', true)
      .where('inviteCode', '==', code)
      .limit(1).get();

    if (snap.empty) { alert('Чат с таким кодом не найден'); return; }
    const docRef = snap.docs[0];
    const chat = docRef.data();
    const hash = await hashPassword(pw);
    if (hash !== chat.passwordHash) { alert('Неверный пароль'); return; }

    if ((chat.members || []).includes(state.uid)) {
      closeJoinModal();
      switchTab('chats');
      setTimeout(() => openChat(docRef.id), 100);
      return;
    }

    const newMembers = [...(chat.members || []), state.uid].sort();
    const names = { ...(chat.names || {}), [state.uid]: state.profile.name };
    await db.collection('chats').doc(docRef.id).update({ members: newMembers, names });

    closeJoinModal();
    switchTab('chats');
    setTimeout(() => openChat(docRef.id), 400);
  } catch (e) {
    console.error(e);
    alert('Ошибка: ' + e.message);
  }
});

/* ============================================================
   ПЕРЕКЛЮЧЕНИЕ ТАБОВ
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
  if (tab === 'contacts') subscribeContacts();
}
document.querySelectorAll('.nav-item').forEach(btn =>
  btn.addEventListener('click', () => switchTab(btn.dataset.tab))
);

/* ============================================================
   ПРОФИЛЬ
   ============================================================ */
function refreshProfileUI() {
  const p = state.profile;
  if (!p) return;
  applyAvatar($('#profileAvatar'), p.avatar);
  $('#profileName').textContent = p.name;
  $('#profileNick').textContent = p.nickname ? '@' + p.nickname : '';
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
  } catch { alert('Ваш код: ' + state.profile.code); }
});
$('#inviteBtn').addEventListener('click', () => {
  if (!state.profile?.code) return;
  navigator.clipboard?.writeText(state.profile.code);
  alert('Ваш код приглашения: ' + state.profile.code + '\n\n(Скопирован)');
});

/* ============================================================
   НАСТРОЙКИ
   ============================================================ */
document.querySelectorAll('[data-action]').forEach(row => {
  row.addEventListener('click', async () => {
    const a = row.dataset.action;
    if (a === 'edit-profile') {
      alert('Редактирование профиля в разработке.');
    } else if (a === 'my-chats') {
      switchTab('chats');
    } else if (a === 'switch') {
      if (confirm('Выйти из аккаунта?')) await auth.signOut();
    } else if (a === 'delete') {
      if (confirm('Удалить аккаунт? Все данные будут стёрты. Это нельзя отменить.')) {
        try {
          await db.collection('users').doc(state.uid).delete();
          const chatsSnap = await db.collection('chats').where('members', 'array-contains', state.uid).get();
          for (const d of chatsSnap.docs) await d.ref.delete();
          await auth.currentUser.delete();
        } catch (e) {
          console.error(e);
          alert('Не удалось удалить: ' + e.message);
        }
      }
    } else {
      alert('Этот раздел появится позже 🙂');
    }
  });
});

/* Поиск / назад */
searchInput.addEventListener('input', e => renderChats(e.target.value));
$('#backBtn').addEventListener('click', closeChat);

/* Стартовый экран */
showWelcome();
