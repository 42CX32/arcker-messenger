import { getSocket, onMessage, onTyping, onStatus, onUnseen, onMessageSeen, onUnseenMessages, onAvatarUpdate, onProfileUpdate, onReactionAdded, onReactionRemoved, sendTyping, sendMessage, markSeen } from '../utils/socket.js';
import { api } from '../utils/api.js';
import { getTheme, setTheme, toggleTheme, getAvailableThemes } from '../utils/theme.js';
import { handleLogout } from '../main.js';
import { getCurrentUser } from '../utils/auth.js';
import { emojiList, getEmojiCategories } from '../utils/emoji.js';

let currentChatUser = null;
let unseenCounts = {};
let isTyping = false;
let replyTo = null;
let typingTimeout = null;

const conversationMessages = new Map();
const CACHE_TTL = 30000;

// حالت‌های ضبط صدا
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let recordingTimer = null;
let recordingSeconds = 0;

export default function Messenger(container, navigate, currentUser) {
  const div = document.createElement('div');
  div.className = 'messenger-app';
  div.innerHTML = `
    <div class="messenger-layout">
      <aside class="sidebar-glass" id="sidebar">
        <div class="sidebar-header">
          <div class="brand-lockup" aria-label="Arcker messenger">
            <div class="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="none">
                <path d="M8.5 10.5c0-2.5 2-4.5 4.5-4.5h6c2.5 0 4.5 2 4.5 4.5v5c0 2.5-2 4.5-4.5 4.5h-2.6L12 24.4V20.6a4.5 4.5 0 0 1-3.5-4.4v-5.7Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>
                <path d="M13 13h6M13 16.5h3.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
              </svg>
            </div>
            <div class="brand-copy">
              <span>ARCKER</span>
              <small>MESSENGER</small>
            </div>
          </div>
          <div class="sidebar-actions">
            <button class="icon-btn" id="themeToggle" title="Toggle Theme" aria-label="Toggle theme">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                ${getTheme() === 'dark' 
                  ? '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />'
                  : '<circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />'
                }
              </svg>
            </button>
          </div>
        </div>

        <div class="user-profile-mini" id="userProfile">
          <div class="avatar-mini" id="avatarMini">
            <img src="${currentUser.avatar || '/src/assets/default-avatar.svg'}" alt="${currentUser.username}">
          </div>
          <div class="user-info-mini">
            <span class="username-mini">${currentUser.username}</span>
            <span class="status-mini online">Online now</span>
          </div>
          <div class="sidebar-actions profile-actions">
            <button class="icon-btn" id="profileBtn" title="Profile" aria-label="Profile">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>
            <button class="icon-btn logout-btn" id="logoutBtn" title="Logout" aria-label="Logout">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>

        <div class="conversations-heading">
          <div>
            <span>Messages</span>
            <small>Your conversations</small>
          </div>
          <span class="conversation-status" title="Live updates enabled"><i></i> Live</span>
        </div>

        <label class="contact-search" for="contactSearch">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" />
          </svg>
          <input id="contactSearch" type="search" placeholder="Search conversations" autocomplete="off">
          <kbd>⌘ K</kbd>
        </label>

        <div class="user-list" id="userList">
          <div class="loading-users">Loading users…</div>
        </div>
      </aside>

      <main class="chat-main" id="chatMain">
        <div class="chat-placeholder" id="chatPlaceholder">
          <div class="placeholder-content">
            <div class="placeholder-orbit" aria-hidden="true">
              <span></span><span></span>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M20 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10Z" />
                <path d="M8 10h8M8 13h5" stroke-linecap="round" />
              </svg>
            </div>
            <p class="eyebrow">ARCKER MESSENGER</p>
            <h2>Every conversation, in one calm place.</h2>
            <p>Select a conversation from the sidebar to begin.</p>
            <div class="placeholder-features" aria-label="Messaging features">
              <span>Instant delivery</span><span>Reactions</span><span>Voice notes</span>
            </div>
          </div>
        </div>

        <div class="chat-container" id="chatContainer" style="display:none;">
          <div class="chat-header" id="chatHeader">
            <div class="chat-user-info">
              <button class="mobile-back-btn" id="mobileBackBtn" aria-label="Back to conversations">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6" /></svg>
              </button>
              <div class="chat-avatar">
                <img id="chatAvatar" src="" alt="" />
                <span class="chat-status" id="chatStatus"></span>
              </div>
              <div class="chat-user-details">
                <span class="chat-username" id="chatUsername">User</span>
                <span class="chat-user-status" id="chatUserStatus">Offline</span>
              </div>
            </div>
            <div class="chat-header-actions">
              <span class="chat-context">Direct conversation</span>
              <!-- دکمه جستجو -->
              <button class="icon-btn" id="searchToggleBtn" title="Search messages" aria-label="Search messages">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>
              <button class="icon-btn" id="profileViewBtn" title="View Profile" aria-label="View profile">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </button>
            </div>
          </div>

          <!-- نوار جستجو (مخفی) -->
          <div class="search-bar" id="searchBar" style="display:none;">
            <div class="message-search-field">
              <input type="text" id="searchInput" placeholder="Search messages…" style="flex:1; padding:6px 12px; border-radius:var(--radius-full); border:1px solid var(--border-color); background:var(--bg-input); color:var(--text-light); outline:none;">
              <button id="searchCloseBtn" style="background:none; border:none; color:var(--text-muted); cursor:pointer;">✕</button>
            </div>
          </div>

          <div class="messages-container" id="messagesContainer">
            <div class="messages-list" id="messagesList"></div>
            <div class="typing-indicator" id="typingIndicator" style="display:none;">
              <span class="typing-dots"><span></span><span></span><span></span></span>
              <span class="typing-text" id="typingText">typing…</span>
            </div>
          </div>

          <div class="message-input-area">
            <div class="input-tools">
              <button class="tool-btn" id="emojiBtn" title="Emoji" aria-label="Emoji picker">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                  <line x1="9" y1="9" x2="9.01" y2="9" />
                  <line x1="15" y1="9" x2="15.01" y2="9" />
                </svg>
              </button>
              <button class="tool-btn" id="attachBtn" title="Attach file" aria-label="Attach file">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
              <!-- دکمه ضبط صدا -->
              <button class="tool-btn" id="recordBtn" title="Voice message" aria-label="Voice message">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <circle cx="12" cy="12" r="6" />
                  <rect x="9" y="3" width="6" height="9" rx="1" />
                  <line x1="12" y1="18" x2="12" y2="21" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                </svg>
              </button>
              <span id="recordingTimer" style="display:none; font-size:0.8rem; color:var(--error); margin-left:4px;">0s</span>
              <div class="reply-preview" id="replyPreview" style="display:none;">
                <div class="reply-content">
                  <span class="reply-label">Replying to</span>
                  <span class="reply-text" id="replyText"></span>
                </div>
                <button class="reply-cancel" id="cancelReply" aria-label="Cancel reply">×</button>
              </div>
            </div>
            <div class="input-row">
              <textarea id="messageInput" rows="1" placeholder="Type a message…"></textarea>
              <button class="send-btn" id="sendBtn" aria-label="Send message">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- Emoji Picker -->
    <div class="emoji-picker" id="emojiPicker" style="display:none;">
      <div class="emoji-header">
        <span>Emojis</span>
        <button class="emoji-close" id="emojiClose" aria-label="Close emojis">×</button>
      </div>
      <div class="emoji-categories" id="emojiCategories"></div>
      <div class="emoji-grid" id="emojiGrid"></div>
    </div>

    <!-- واکنش‌ها: پیکر کوچک -->
    <div class="reaction-picker" id="reactionPicker" style="display:none; position:absolute; background:var(--bg-secondary); border-radius:var(--radius-lg); box-shadow:var(--shadow-xl); padding:6px; z-index:100; border:1px solid var(--border-color);">
      <div style="display:flex; gap:4px; font-size:1.6rem;">
        <span class="reaction-option" data-reaction="❤️">❤️</span>
        <span class="reaction-option" data-reaction="😂">😂</span>
        <span class="reaction-option" data-reaction="😮">😮</span>
        <span class="reaction-option" data-reaction="😢">😢</span>
        <span class="reaction-option" data-reaction="👍">👍</span>
        <span class="reaction-option" data-reaction="👎">👎</span>
        <span class="reaction-option" data-reaction="🔥">🔥</span>
        <span class="reaction-option" data-reaction="✨">✨</span>
      </div>
    </div>

    <!-- پروفایل کاربر -->
    <div class="user-profile-overlay" id="userProfileOverlay" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.55); backdrop-filter:blur(6px); z-index:200; align-items:center; justify-content:center;">
      <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:16px; padding:28px; width:min(320px,90vw); text-align:center; box-shadow:var(--shadow-xl);">
        <img id="upoAvatar" src="" alt="" style="width:88px;height:88px;border-radius:50%;object-fit:cover;margin:0 auto 12px;display:block;border:2px solid var(--border-color);">
        <h3 id="upoUsername" style="margin:0;font-size:1.2rem;color:var(--text-primary);"></h3>
        <p id="upoStatus" style="margin:4px 0 12px;font-size:0.85rem;color:var(--text-muted);"></p>
        <p id="upoBio" style="margin:0 0 16px;font-size:0.9rem;color:var(--text-secondary);white-space:pre-wrap;"></p>
        <button id="upoClose" style="background:var(--accent);color:var(--text-inverse);border:none;border-radius:10px;padding:8px 24px;cursor:pointer;font-size:0.9rem;">Close</button>
      </div>
    </div>
  `;

  // ---- DOM References ----
  const userList = div.querySelector('#userList');
  const messagesList = div.querySelector('#messagesList');
  const messageInput = div.querySelector('#messageInput');
  const sendBtn = div.querySelector('#sendBtn');
  const chatContainer = div.querySelector('#chatContainer');
  const chatPlaceholder = div.querySelector('#chatPlaceholder');
  const chatUsername = div.querySelector('#chatUsername');
  const chatUserStatus = div.querySelector('#chatUserStatus');
  const chatAvatar = div.querySelector('#chatAvatar');
  const chatStatus = div.querySelector('#chatStatus');
  const typingIndicator = div.querySelector('#typingIndicator');
  const typingText = div.querySelector('#typingText');
  const messagesContainer = div.querySelector('#messagesContainer');
  const emojiPicker = div.querySelector('#emojiPicker');
  const emojiBtn = div.querySelector('#emojiBtn');
  const emojiClose = div.querySelector('#emojiClose');
  const emojiGrid = div.querySelector('#emojiGrid');
  const emojiCategories = div.querySelector('#emojiCategories');
  const themeToggle = div.querySelector('#themeToggle');
  const attachBtn = div.querySelector('#attachBtn');
  const replyPreview = div.querySelector('#replyPreview');
  const replyText = div.querySelector('#replyText');
  const cancelReply = div.querySelector('#cancelReply');
  const logoutBtn = div.querySelector('#logoutBtn');
  const profileBtn = div.querySelector('#profileBtn');
  const profileViewBtn = div.querySelector('#profileViewBtn');
  const searchToggleBtn = div.querySelector('#searchToggleBtn');
  const searchBar = div.querySelector('#searchBar');
  const searchInput = div.querySelector('#searchInput');
  const searchCloseBtn = div.querySelector('#searchCloseBtn');
  const contactSearch = div.querySelector('#contactSearch');
  const mobileBackBtn = div.querySelector('#mobileBackBtn');
  const recordBtn = div.querySelector('#recordBtn');
  const recordingTimerEl = div.querySelector('#recordingTimer');
  const reactionPicker = div.querySelector('#reactionPicker');
  const userProfileOverlay = div.querySelector('#userProfileOverlay');

  // ----- State for reactions -----
  let currentMessageForReaction = null;

  let users = [];
  let onlineUsers = new Set();
  let currentUserId = currentUser.id;
  let emojiCategory = 'smileys';

  // ----- Helper Functions (existing) -----
  function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }

  function formatLastSeen(dateStr) {
    if (!dateStr) return 'recently';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 172800) return 'yesterday';
    return date.toLocaleDateString();
  }

  function scrollToBottom() {
    if (messagesContainer) messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function clearReply() {
    replyTo = null;
    replyPreview.style.display = 'none';
    replyText.textContent = '';
  }

  function setReplyTo(msg) {
    replyTo = msg;
    replyPreview.style.display = 'flex';
    replyText.textContent = msg.message.length > 50 ? msg.message.substring(0, 50) + '…' : msg.message;
    messageInput.focus();
  }

  function updateUnseenBadges() { renderUserList(users); }

  function playNotificationSound() {
    try {
      const audio = new Audio('/src/assets/notification.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (e) {}
  }

  function getConversationKey(u1, u2) { return Math.min(u1, u2) + '_' + Math.max(u1, u2); }

  function isCacheValid(key) {
    if (!conversationMessages.has(key)) return false;
    const entry = conversationMessages.get(key);
    return (Date.now() - entry.timestamp) < CACHE_TTL;
  }

  async function loadMessages(otherUserId) {
    const key = getConversationKey(currentUserId, otherUserId);
    try {
      const data = await api.get(`/messages/${currentUserId}/${otherUserId}?limit=100`);
      const messages = data.messages || [];
      // بارگذاری واکنش‌ها برای هر پیام
      const messagesWithReactions = await Promise.all(messages.map(async (msg) => {
        const reactions = await fetchReactions(msg.id);
        return { ...msg, reactions: reactions || [] };
      }));
      conversationMessages.set(key, { messages: messagesWithReactions, timestamp: Date.now() });
      return messagesWithReactions;
    } catch (error) {
      console.error('Failed to load messages:', error);
      if (isCacheValid(key)) return conversationMessages.get(key).messages;
      return [];
    }
  }

  // ---- بارگذاری واکنش‌های یک پیام (API) ----
  async function fetchReactions(messageId) {
    try {
      const data = await api.get(`/messages/${messageId}/reactions`);
      return data.reactions || [];
    } catch (error) {
      console.error('Failed to fetch reactions:', error);
      return [];
    }
  }

  // ---- ارسال واکنش ----
  async function addReaction(messageId, reaction) {
    try {
      await api.post(`/messages/${messageId}/reactions`, { reaction });
      // به‌روزرسانی محلی
      const key = getConversationKey(currentUserId, currentChatUser.id);
      const cached = conversationMessages.get(key);
      if (cached) {
        const msgs = cached.messages.map(msg => {
          if (msg.id === messageId) {
            if (!msg.reactions) msg.reactions = [];
            const existing = msg.reactions.find(r => r.user_id === currentUserId);
            if (existing) {
              existing.reaction = reaction;
            } else {
              msg.reactions.push({ user_id: currentUserId, reaction });
            }
          }
          return msg;
        });
        conversationMessages.set(key, { messages: msgs, timestamp: Date.now() });
        renderMessages(msgs);
      }
    } catch (error) {
      console.error('Add reaction error:', error);
    }
  }

  async function removeReaction(messageId) {
    try {
      await api.delete(`/messages/${messageId}/reactions`);
      const key = getConversationKey(currentUserId, currentChatUser.id);
      const cached = conversationMessages.get(key);
      if (cached) {
        const msgs = cached.messages.map(msg => {
          if (msg.id === messageId && msg.reactions) {
            msg.reactions = msg.reactions.filter(r => r.user_id !== currentUserId);
          }
          return msg;
        });
        conversationMessages.set(key, { messages: msgs, timestamp: Date.now() });
        renderMessages(msgs);
      }
    } catch (error) {
      console.error('Remove reaction error:', error);
    }
  }

  // ---- جستجوی پیام‌ها ----
  async function searchMessages(query) {
    if (!query || query.length < 2) {
      // بازگشت به پیام‌های اصلی
      const key = getConversationKey(currentUserId, currentChatUser.id);
      const cached = conversationMessages.get(key);
      if (cached) renderMessages(cached.messages);
      return;
    }
    try {
      const data = await api.get(`/messages/search?q=${encodeURIComponent(query)}&withUser=${currentChatUser.id}`);
      renderMessages(data.messages || []);
    } catch (error) {
      console.error('Search error:', error);
    }
  }

  // ---- ضبط صدا ----
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      mediaRecorder.ondataavailable = event => audioChunks.push(event.data);
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        sendVoiceMessage(audioBlob);
        // توقف تمام تایمرها
        clearInterval(recordingTimer);
        recordingTimer = null;
        recordingSeconds = 0;
        recordingTimerEl.style.display = 'none';
        recordingTimerEl.textContent = '0s';
        recordBtn.style.color = 'var(--text-muted)';
        isRecording = false;
      };
      mediaRecorder.start();
      isRecording = true;
      recordBtn.style.color = 'var(--error)';
      recordingTimerEl.style.display = 'inline';
      recordingSeconds = 0;
      recordingTimer = setInterval(() => {
        recordingSeconds++;
        recordingTimerEl.textContent = recordingSeconds + 's';
      }, 1000);
    } catch (error) {
      alert('Microphone access denied. Please allow microphone to record voice messages.');
      console.error('Mic error:', error);
    }
  }

  function stopRecording() {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      // توقف تایمر در onstop انجام می‌شود
    }
  }

  function sendVoiceMessage(blob) {
    if (!currentChatUser) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      const base64 = e.target.result;
      const fileData = { type: 'voice', name: 'voice.webm', size: blob.size, data: base64 };
      const messageText = JSON.stringify(fileData);
      // ارسال مثل فایل معمولی
      sendMessage({
        receiver_id: currentChatUser.id,
        message: messageText,
        reply_to_id: null
      });
      // اضافه کردن به چت محلی
      const tempMsg = {
        id: 'pending_' + Date.now(),
        sender_id: currentUserId,
        receiver_id: currentChatUser.id,
        message: messageText,
        time: new Date().toISOString(),
        seen: false,
        deleted: false,
        pending: true
      };
      const key = getConversationKey(currentUserId, currentChatUser.id);
      const existing = conversationMessages.get(key) || { messages: [], timestamp: Date.now() };
      existing.messages.push(tempMsg);
      conversationMessages.set(key, existing);
      renderMessages(existing.messages);
      setTimeout(scrollToBottom, 50);
    };
    reader.readAsDataURL(blob);
  }

  // ---- Render Messages (با واکنش‌ها و دکمه‌های Reply و React) ----
  function renderMessages(messages) {
    if (!messagesList) return;
    if (messages.length === 0) {
      messagesList.innerHTML = `<div class="no-messages">No messages yet. Say hello! 👋</div>`;
      return;
    }
    let lastDate = null, html = '';
    messages.forEach(msg => {
      const msgDate = new Date(msg.time);
      const dateStr = msgDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      if (dateStr !== lastDate) { html += `<div class="message-date">${dateStr}</div>`; lastDate = dateStr; }
      const isOwn = msg.sender_id === currentUserId;
      const time = msgDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const seenMark = isOwn && msg.seen ? '✓✓' : (isOwn ? '✓' : '');

      // واکنش‌ها
      let reactionsHtml = '';
      if (msg.reactions && msg.reactions.length > 0) {
        // گروه‌بندی واکنش‌ها
        const grouped = {};
        msg.reactions.forEach(r => { grouped[r.reaction] = (grouped[r.reaction] || 0) + 1; });
        reactionsHtml = `<div class="message-reactions">${Object.keys(grouped).map(emoji => 
          `<span class="reaction-badge" data-msgid="${msg.id}" data-reaction="${emoji}">${emoji} ${grouped[emoji]}</span>`
        ).join(' ')}</div>`;
      }

      // محتوای پیام
      let content = '';
      let isFile = false, fileData = null, isVoice = false;
      if (typeof msg.message === 'string' && msg.message.startsWith('{') && msg.message.includes('"type"')) {
        try {
          fileData = JSON.parse(msg.message);
          if (fileData.type === 'file') isFile = true;
          if (fileData.type === 'voice') isVoice = true;
        } catch(e) {}
      }
      if (msg.deleted) {
        content = '🗑️ Message deleted';
      } else if (isVoice && fileData && fileData.data) {
        // نمایش پلیر صوتی
        content = `<audio controls style="width:200px; height:40px;" src="${fileData.data}"></audio>`;
      } else if (isFile && fileData && fileData.data) {
        if (fileData.data.startsWith('data:image')) {
          content = `<img src="${fileData.data}" style="max-width:200px;max-height:200px;border-radius:8px;cursor:pointer;" onclick="window.open('${fileData.data}')" />`;
        } else {
          content = `<a href="${fileData.data}" download="${fileData.name}" style="color:var(--accent);text-decoration:underline;">📎 ${fileData.name} (${(fileData.size/1024).toFixed(1)} KB)</a>`;
        }
      } else {
        content = escapeHtml(msg.message);
      }

      // دکمه‌های اکشن (Reply, React)
      const actionsHtml = `
        <div class="message-actions">
          <button class="msg-action reply-action" data-id="${msg.id}" title="Reply">↩</button>
          <button class="msg-action react-action" data-id="${msg.id}" title="React">😊</button>
          ${isOwn ? `<button class="msg-action delete-action" data-id="${msg.id}" title="Delete">🗑</button>` : ''}
        </div>
      `;

      // پاسخ
      let replyHtml = '';
      if (msg.reply_text) {
        replyHtml = `<div class="reply-preview-bubble"><span class="reply-preview-label">↩ Reply</span><span class="reply-preview-text">${escapeHtml(msg.reply_text)}</span></div>`;
      }

      html += `
        <div class="message-bubble ${isOwn ? 'own' : 'other'} ${msg.deleted ? 'deleted' : ''}" data-message-id="${msg.id}">
          ${replyHtml}
          <div class="message-content">${content}</div>
          <div class="message-footer">
            <span class="message-time">${time}</span>
            ${isOwn ? `<span class="message-seen">${seenMark}</span>` : ''}
          </div>
          ${reactionsHtml}
          ${!msg.deleted ? actionsHtml : ''}
        </div>
      `;
    });
    messagesList.innerHTML = html;

    // ---- Event listeners on actions ----
    messagesList.querySelectorAll('.reply-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        const msg = messages.find(m => m.id === id);
        if (msg) setReplyTo(msg);
      });
    });
    messagesList.querySelectorAll('.react-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        const msg = messages.find(m => m.id === id);
        if (msg) {
          currentMessageForReaction = msg;
          // نمایش پیکر واکنش در کنار دکمه
          const rect = btn.getBoundingClientRect();
          reactionPicker.style.display = 'block';
          reactionPicker.style.left = (rect.left - 40) + 'px';
          reactionPicker.style.top = (rect.top - 50) + 'px';
          // ذخیره messageId در پیکر
          reactionPicker.dataset.messageId = id;
        }
      });
    });
    messagesList.querySelectorAll('.delete-action').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        if (confirm('Delete this message?')) {
          try {
            await api.delete(`/messages/${id}`);
            const key = getConversationKey(currentUserId, currentChatUser.id);
            const cached = conversationMessages.get(key);
            if (cached) {
              const msgs = cached.messages.map(m => m.id === id ? { ...m, deleted: true } : m);
              conversationMessages.set(key, { messages: msgs, timestamp: Date.now() });
              renderMessages(msgs);
            }
          } catch (error) {
            console.error('Delete error:', error);
          }
        }
      });
    });
    // واکنش‌های کلیک روی badge برای حذف واکنش خود
    messagesList.querySelectorAll('.reaction-badge').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const msgId = parseInt(el.dataset.msgid);
        const reaction = el.dataset.reaction;
        // اگر کاربر خودش این واکنش را دارد، حذف کند
        const msg = messages.find(m => m.id === msgId);
        if (msg && msg.reactions && msg.reactions.some(r => r.user_id === currentUserId && r.reaction === reaction)) {
          removeReaction(msgId);
        } else {
          addReaction(msgId, reaction);
        }
      });
    });
  }

  // ---- Open Chat (بارگذاری با واکنش‌ها) ----
  function showUserProfile(user) {
    div.querySelector('#upoAvatar').src = user.avatar || '/src/assets/default-avatar.svg';
    div.querySelector('#upoUsername').textContent = user.username;
    const isOnline = onlineUsers.has(user.id);
    div.querySelector('#upoStatus').textContent = isOnline ? 'Online' : `Last seen ${formatLastSeen(user.last_seen)}`;
    div.querySelector('#upoBio').textContent = user.bio || 'No bio yet';
    userProfileOverlay.style.display = 'flex';
  }

  div.querySelector('#upoClose').addEventListener('click', () => {
    userProfileOverlay.style.display = 'none';
  });
  userProfileOverlay.addEventListener('click', (e) => {
    if (e.target === userProfileOverlay) userProfileOverlay.style.display = 'none';
  });

  async function openChat(user) {
    currentChatUser = user;
    div.classList.add('mobile-chat-open');
    chatContainer.style.display = 'flex';
    chatPlaceholder.style.display = 'none';
    chatUsername.textContent = user.username;
    chatAvatar.src = user.avatar || '/src/assets/default-avatar.svg';
    const isOnline = onlineUsers.has(user.id);
    chatUserStatus.textContent = isOnline ? 'Online' : `Last seen ${formatLastSeen(user.last_seen)}`;
    chatStatus.className = `chat-status ${isOnline ? 'online' : 'offline'}`;
    clearReply();
    const messages = await loadMessages(user.id);
    renderMessages(messages);
    setTimeout(scrollToBottom, 100);
    const unseenMessages = messages.filter(m => m.receiver_id === currentUserId && !m.seen).map(m => m.id);
    if (unseenMessages.length > 0) {
      markSeen(unseenMessages);
      unseenCounts[user.id] = 0;
      updateUnseenBadges();
    }
    messageInput.focus();
    userList.querySelectorAll('.user-item').forEach(el => {
      el.classList.toggle('active', parseInt(el.dataset.userId) === user.id);
    });
  }

  // ---- Send Message (Existing) ----
  async function sendMessageHandler() {
    const text = messageInput.value.trim();
    if (!text || !currentChatUser) return;
    const replyId = replyTo ? replyTo.id : null;

    const tempId = 'pending_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const tempMsg = {
      id: tempId,
      sender_id: currentUserId,
      receiver_id: currentChatUser.id,
      message: text,
      time: new Date().toISOString(),
      seen: false,
      reply_to_id: replyId,
      reply_text: replyTo ? replyTo.message : null,
      deleted: false,
      pending: true,
      reactions: []
    };

    const key = getConversationKey(currentUserId, currentChatUser.id);
    const existing = conversationMessages.get(key) || { messages: [], timestamp: Date.now() };
    existing.messages.push(tempMsg);
    existing.timestamp = Date.now();
    conversationMessages.set(key, existing);

    renderMessages(existing.messages);
    setTimeout(scrollToBottom, 50);

    sendMessage({
      receiver_id: currentChatUser.id,
      message: text,
      reply_to_id: replyId
    });

    messageInput.value = '';
    messageInput.style.height = 'auto';
    clearReply();
    sendTyping(currentChatUser.id, false);
    clearTimeout(typingTimeout);
    typingTimeout = null;
    isTyping = false;
  }

  // ---- Render User List (Existing) ----
  function renderUserList(userListData) {
    if (userListData.length === 0) {
      userList.innerHTML = `<div class="empty-users">No users found</div>`;
      return;
    }
    userList.innerHTML = userListData.map(user => {
      const isOnline = onlineUsers.has(user.id);
      const unseen = unseenCounts[user.id] || 0;
      return `
        <div class="user-item ${currentChatUser && currentChatUser.id === user.id ? 'active' : ''}" data-user-id="${user.id}">
          <div class="user-item-avatar">
            <img src="${user.avatar || '/src/assets/default-avatar.svg'}" alt="${user.username}">
            <span class="user-status-dot ${isOnline ? 'online' : 'offline'}"></span>
          </div>
          <div class="user-item-info">
            <div class="user-item-name">
              <span>${user.username}</span>
              ${unseen > 0 ? `<span class="unseen-badge">${unseen}</span>` : ''}
            </div>
            <div class="user-item-status">${isOnline ? 'Online' : `Last seen ${formatLastSeen(user.last_seen)}`}</div>
          </div>
        </div>
      `;
    }).join('');
    userList.querySelectorAll('.user-item').forEach(el => {
      el.addEventListener('click', () => {
        const userId = parseInt(el.dataset.userId);
        const user = users.find(u => u.id === userId);
        if (user) openChat(user);
      });
    });
  }

  // ---- Load Users (Existing) ----
  async function loadUsers() {
    try {
      const data = await api.get('/users');
      users = data.users.filter(u => u.id !== currentUserId);
      renderUserList(users);
    } catch (error) {
      console.error('Failed to load users:', error);
      userList.innerHTML = `<div class="error-text">Failed to load users</div>`;
    }
  }

  // ---- Emoji Picker (Existing) ----
  function initEmojiPicker() {
    const categories = getEmojiCategories();
    emojiCategories.innerHTML = categories.map(cat => `
      <button class="emoji-cat-btn ${cat.key === emojiCategory ? 'active' : ''}" data-category="${cat.key}">${cat.icon}</button>
    `).join('');
    emojiCategories.querySelectorAll('.emoji-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        emojiCategory = btn.dataset.category;
        renderEmojis(emojiCategory);
        emojiCategories.querySelectorAll('.emoji-cat-btn').forEach(b => b.classList.toggle('active', b === btn));
      });
    });
    renderEmojis(emojiCategory);
  }

  function renderEmojis(category) {
    const emojis = emojiList.filter(e => e.category === category);
    emojiGrid.innerHTML = emojis.map(e => `<span class="emoji-item" data-emoji="${e.emoji}">${e.emoji}</span>`).join('');
    emojiGrid.querySelectorAll('.emoji-item').forEach(el => {
      el.addEventListener('click', () => {
        messageInput.value += el.dataset.emoji;
        messageInput.focus();
        emojiPicker.style.display = 'none';
        messageInput.dispatchEvent(new Event('input'));
        handleTyping();
      });
    });
  }

  function handleTyping() {
    if (!currentChatUser) return;
    const text = messageInput.value.trim();
    const hasText = text.length > 0;
    if (hasText !== isTyping) {
      isTyping = hasText;
      sendTyping(currentChatUser.id, hasText);
    }
    if (!hasText) {
      clearTimeout(typingTimeout);
      typingTimeout = null;
    } else {
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        if (messageInput.value.trim() === '') {
          isTyping = false;
          sendTyping(currentChatUser.id, false);
        } else {
          isTyping = false;
          sendTyping(currentChatUser.id, false);
        }
        typingTimeout = null;
      }, 1500);
    }
  }

  // ---- Handle File Upload (با پشتیبانی از فایل‌های صوتی) ----
  function handleFileUpload(file) {
    if (file.size > 10 * 1024 * 1024) {
      alert('File too large. Max 10MB.');
      return;
    }
    if (!currentChatUser) {
      alert('Please select a chat first.');
      return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
      const base64 = e.target.result;
      const fileData = { type: 'file', name: file.name, size: file.size, data: base64 };
      const messageText = JSON.stringify(fileData);
      const tempId = 'pending_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      const tempMsg = {
        id: tempId,
        sender_id: currentUserId,
        receiver_id: currentChatUser.id,
        message: messageText,
        time: new Date().toISOString(),
        seen: false,
        reply_to_id: null,
        reply_text: null,
        deleted: false,
        pending: true,
        reactions: []
      };
      const key = getConversationKey(currentUserId, currentChatUser.id);
      const existing = conversationMessages.get(key) || { messages: [], timestamp: Date.now() };
      existing.messages.push(tempMsg);
      existing.timestamp = Date.now();
      conversationMessages.set(key, existing);
      renderMessages(existing.messages);
      setTimeout(scrollToBottom, 50);

      sendMessage({
        receiver_id: currentChatUser.id,
        message: messageText,
        reply_to_id: null
      });
      sendTyping(currentChatUser.id, false);
      clearTimeout(typingTimeout);
      typingTimeout = null;
      isTyping = false;
    };
    reader.readAsDataURL(file);
  }

  // ---- Socket Listeners (با واکنش‌ها) ----
  const unsubMessage = onMessage((data, isSent) => {
    const msg = data;
    const key = getConversationKey(msg.sender_id, msg.receiver_id);
    let cached = conversationMessages.get(key);
    let msgs = (cached && isCacheValid(key)) ? [...cached.messages] : [];

    if (isSent) {
      const msgTime = new Date(msg.time).getTime();
      const pendingIndex = msgs.findIndex(m =>
        m.pending === true &&
        m.message === msg.message &&
        m.sender_id === msg.sender_id &&
        m.receiver_id === msg.receiver_id &&
        Math.abs(new Date(m.time).getTime() - msgTime) < 3000
      );
      if (pendingIndex !== -1) {
        const pending = msgs[pendingIndex];
        pending.id = msg.id;
        pending.time = msg.time;
        pending.seen = msg.seen;
        pending.pending = false;
        conversationMessages.set(key, { messages: msgs, timestamp: Date.now() });
        if (currentChatUser && key === getConversationKey(currentUserId, currentChatUser.id)) {
          renderMessages(msgs);
        }
        return;
      }
    }

    if (msgs.some(m => m.id === msg.id)) return;

    // بارگذاری واکنش‌ها برای پیام جدید
    fetchReactions(msg.id).then(reactions => {
      msg.reactions = reactions;
    }).catch(() => { msg.reactions = []; });
    msgs.push(msg);
    conversationMessages.set(key, { messages: msgs, timestamp: Date.now() });

    if (currentChatUser && currentChatUser.id === msg.sender_id) {
      renderMessages(msgs);
      setTimeout(scrollToBottom, 50);
      if (!isSent) {
        markSeen([msg.id]);
        unseenCounts[msg.sender_id] = 0;
        updateUnseenBadges();
      }
    } else if (msg.sender_id !== currentUserId) {
      unseenCounts[msg.sender_id] = (unseenCounts[msg.sender_id] || 0) + 1;
      updateUnseenBadges();
      if (Notification.permission === 'granted') {
        new Notification(`New message from ${msg.sender_name || 'User'}`, {
          body: msg.message,
          icon: '/src/assets/logo.svg'
        });
      }
      playNotificationSound();
    }
  });

  const unsubTyping = onTyping((data) => {
    if (data.userId === currentChatUser?.id) {
      if (data.isTyping) {
        typingIndicator.style.display = 'flex';
        typingText.textContent = `${currentChatUser.username} is typing...`;
      } else {
        typingIndicator.style.display = 'none';
      }
    }
  });

  const unsubStatus = onStatus((data) => {
    if (data.type === 'online_list') {
      onlineUsers = new Set(data.users || []);
      renderUserList(users);
      if (currentChatUser) {
        const isOnline = onlineUsers.has(currentChatUser.id);
        chatUserStatus.textContent = isOnline ? 'Online' : `Last seen ${formatLastSeen(currentChatUser.last_seen)}`;
        chatStatus.className = `chat-status ${isOnline ? 'online' : 'offline'}`;
      }
    } else if (data.userId) {
      if (data.status === 'online') onlineUsers.add(data.userId);
      else onlineUsers.delete(data.userId);
      renderUserList(users);
      if (currentChatUser && currentChatUser.id === data.userId) {
        const isOnline = data.status === 'online';
        chatUserStatus.textContent = isOnline ? 'Online' : 'Last seen just now';
        chatStatus.className = `chat-status ${isOnline ? 'online' : 'offline'}`;
      }
    }
  });

  const unsubUnseen = onUnseen((data) => {
    if (data.total > 0) {
      const badge = div.querySelector('.unseen-total');
      if (!badge) {
        const header = div.querySelector('.sidebar-header');
        const span = document.createElement('span');
        span.className = 'unseen-total';
        span.textContent = data.total;
        header.appendChild(span);
      } else {
        badge.textContent = data.total;
      }
    }
  });

  const unsubMessageSeen = onMessageSeen((data) => {
    for (const [key, cached] of conversationMessages) {
      if (!isCacheValid(key)) continue;
      let updated = false;
      const newMsgs = cached.messages.map(msg => {
        if (data.messageIds.includes(msg.id) && msg.receiver_id === data.userId) {
          msg.seen = true;
          updated = true;
        }
        return msg;
      });
      if (updated) {
        conversationMessages.set(key, { messages: newMsgs, timestamp: Date.now() });
        if (currentChatUser && key === getConversationKey(currentUserId, currentChatUser.id)) {
          renderMessages(newMsgs);
        }
      }
    }
  });

  const unsubUnseenMessages = onUnseenMessages((messages) => {
    if (!messages || messages.length === 0) return;
    const grouped = {};
    messages.forEach(msg => {
      const senderId = msg.sender_id;
      if (!grouped[senderId]) grouped[senderId] = [];
      grouped[senderId].push(msg);
    });
    for (const [senderId, msgs] of Object.entries(grouped)) {
      const key = getConversationKey(parseInt(senderId), currentUserId);
      const cached = conversationMessages.get(key);
      const existing = (cached && isCacheValid(key)) ? [...cached.messages] : [];
      const merged = [...existing];
      msgs.forEach(msg => {
        if (!merged.some(m => m.id === msg.id)) merged.push(msg);
      });
      merged.sort((a, b) => new Date(a.time) - new Date(b.time));
      conversationMessages.set(key, { messages: merged, timestamp: Date.now() });
      const unseen = msgs.filter(m => m.receiver_id === currentUserId && !m.seen).length;
      if (unseen > 0) {
        unseenCounts[parseInt(senderId)] = (unseenCounts[parseInt(senderId)] || 0) + unseen;
      }
    }
    updateUnseenBadges();
    if (currentChatUser && grouped[currentChatUser.id]) {
      const key = getConversationKey(currentUserId, currentChatUser.id);
      const cached = conversationMessages.get(key);
      if (cached && isCacheValid(key)) {
        renderMessages(cached.messages);
        setTimeout(scrollToBottom, 100);
        const ids = cached.messages.filter(m => m.receiver_id === currentUserId && !m.seen).map(m => m.id);
        if (ids.length > 0) {
          markSeen(ids);
          unseenCounts[currentChatUser.id] = 0;
          updateUnseenBadges();
        }
      }
    }
    if (Notification.permission === 'granted' && messages.length > 0) {
      const senderNames = [...new Set(messages.map(m => m.sender_name || 'Unknown'))];
      new Notification(`📨 You have ${messages.length} new messages from ${senderNames.join(', ')}`, {
        body: 'Click to open chat',
        icon: '/src/assets/logo.svg'
      });
    }
  });

  const unsubAvatarUpdate = onAvatarUpdate((data) => {
    const { userId, avatar } = data;
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      users[userIndex].avatar = avatar;
      renderUserList(users);
      if (currentChatUser && currentChatUser.id === userId) {
        chatAvatar.src = avatar || '/src/assets/default-avatar.svg';
      }
    }
  });

  const unsubProfileUpdate = onProfileUpdate((data) => {
    const { user } = data;
    if (!user) return;
    const userIndex = users.findIndex(u => u.id === user.id);
    if (userIndex !== -1) {
      users[userIndex] = { ...users[userIndex], ...user };
      renderUserList(users);
      if (currentChatUser && currentChatUser.id === user.id) {
        currentChatUser = users[userIndex];
        chatUsername.textContent = user.username || currentChatUser.username;
        chatAvatar.src = user.avatar || currentChatUser.avatar || '/src/assets/default-avatar.svg';
      }
    }
  });

  // ---- واکنش‌های دریافتی از سوکت ----
  const unsubReactionAdded = onReactionAdded((data) => {
    const { id, reaction, userId } = data;
    const key = getConversationKey(currentUserId, currentChatUser?.id);
    if (!key) return;
    const cached = conversationMessages.get(key);
    if (!cached) return;
    const msgs = cached.messages.map(msg => {
      if (msg.id === id) {
        if (!msg.reactions) msg.reactions = [];
        const existing = msg.reactions.find(r => r.user_id === userId);
        if (existing) {
          existing.reaction = reaction;
        } else {
          msg.reactions.push({ user_id: userId, reaction });
        }
      }
      return msg;
    });
    conversationMessages.set(key, { messages: msgs, timestamp: Date.now() });
    if (currentChatUser && key === getConversationKey(currentUserId, currentChatUser.id)) {
      renderMessages(msgs);
    }
  });

  const unsubReactionRemoved = onReactionRemoved((data) => {
    const { id, userId } = data;
    const key = getConversationKey(currentUserId, currentChatUser?.id);
    if (!key) return;
    const cached = conversationMessages.get(key);
    if (!cached) return;
    const msgs = cached.messages.map(msg => {
      if (msg.id === id && msg.reactions) {
        msg.reactions = msg.reactions.filter(r => r.user_id !== userId);
      }
      return msg;
    });
    conversationMessages.set(key, { messages: msgs, timestamp: Date.now() });
    if (currentChatUser && key === getConversationKey(currentUserId, currentChatUser.id)) {
      renderMessages(msgs);
    }
  });

  // ---- Event Listeners ----
  messageInput.addEventListener('input', handleTyping);

  contactSearch.addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    renderUserList(users.filter(user => user.username.toLowerCase().includes(query)));
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      contactSearch.focus();
    }
  });

  mobileBackBtn.addEventListener('click', () => {
    div.classList.remove('mobile-chat-open');
  });

  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessageHandler();
    }
  });

  sendBtn.addEventListener('click', sendMessageHandler);

  profileViewBtn.addEventListener('click', () => {
    if (currentChatUser) {
      showUserProfile(currentChatUser);
    } else {
      alert('No user selected');
    }
  });

  // ---- Search ----
  searchToggleBtn.addEventListener('click', () => {
    const isVisible = searchBar.style.display !== 'none';
    searchBar.style.display = isVisible ? 'none' : 'block';
    if (!isVisible) {
      searchInput.focus();
    } else {
      searchInput.value = '';
      // بازگشت به پیام‌های اصلی
      const key = getConversationKey(currentUserId, currentChatUser?.id);
      if (key) {
        const cached = conversationMessages.get(key);
        if (cached) renderMessages(cached.messages);
      }
    }
  });
  searchCloseBtn.addEventListener('click', () => {
    searchBar.style.display = 'none';
    searchInput.value = '';
    const key = getConversationKey(currentUserId, currentChatUser?.id);
    if (key) {
      const cached = conversationMessages.get(key);
      if (cached) renderMessages(cached.messages);
    }
  });
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    if (currentChatUser) {
      searchMessages(query);
    }
  });

  // ---- Voice Recording ----
  recordBtn.addEventListener('click', () => {
    if (!currentChatUser) {
      alert('Select a chat first.');
      return;
    }
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  });

  // ---- Reaction Picker ----
  reactionPicker.addEventListener('click', (e) => {
    const target = e.target.closest('.reaction-option');
    if (!target) return;
    const reaction = target.dataset.reaction;
    const messageId = parseInt(reactionPicker.dataset.messageId);
    if (messageId) {
      // اگر کاربر قبلاً این واکنش را داشته، حذفش کن
      const key = getConversationKey(currentUserId, currentChatUser.id);
      const cached = conversationMessages.get(key);
      if (cached) {
        const msg = cached.messages.find(m => m.id === messageId);
        if (msg && msg.reactions && msg.reactions.some(r => r.user_id === currentUserId && r.reaction === reaction)) {
          removeReaction(messageId);
        } else {
          addReaction(messageId, reaction);
        }
      }
      reactionPicker.style.display = 'none';
    }
  });
  document.addEventListener('click', (e) => {
    if (!reactionPicker.contains(e.target) && !e.target.closest('.react-action')) {
      reactionPicker.style.display = 'none';
    }
  });

  // ---- Theme Toggle ----
  themeToggle.addEventListener('click', () => {
    toggleTheme();
    const svg = themeToggle.querySelector('svg');
    const isDark = getTheme() === 'dark';
    if (isDark) {
      svg.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />`;
    } else {
      svg.innerHTML = `<circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />`;
    }
  });

  // ---- Emoji Picker ----
  emojiBtn.addEventListener('click', () => {
    const isVisible = emojiPicker.style.display === 'block';
    emojiPicker.style.display = isVisible ? 'none' : 'block';
    if (!isVisible) initEmojiPicker();
  });

  emojiClose.addEventListener('click', () => { emojiPicker.style.display = 'none'; });
  document.addEventListener('click', (e) => {
    if (!emojiPicker.contains(e.target) && e.target !== emojiBtn && !emojiBtn.contains(e.target)) {
      emojiPicker.style.display = 'none';
    }
  });

  attachBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.pdf,.doc,.docx,.txt,.zip';
    input.multiple = true;
    input.onchange = (e) => {
      const files = e.target.files;
      for (const file of files) handleFileUpload(file);
    };
    input.click();
  });

  // Drag and Drop
  const chatMain = div.querySelector('#chatMain');
  chatMain.addEventListener('dragover', (e) => {
    e.preventDefault();
    chatMain.classList.add('drag-over');
  });
  chatMain.addEventListener('dragleave', (e) => {
    e.preventDefault();
    chatMain.classList.remove('drag-over');
  });
  chatMain.addEventListener('drop', (e) => {
    e.preventDefault();
    chatMain.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    for (const file of files) handleFileUpload(file);
  });

  cancelReply.addEventListener('click', clearReply);

  logoutBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to logout?')) handleLogout();
  });

  profileBtn.addEventListener('click', () => { navigate('profile'); });

  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  loadUsers();

  return div;
}
