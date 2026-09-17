import { getSocket, onMessage, onTyping, onStatus, onUnseen, onMessageSeen, sendTyping, sendMessage, markSeen } from '../utils/socket.js';
import { api } from '../utils/api.js';
import { getTheme, setTheme, toggleTheme, getAvailableThemes } from '../utils/theme.js';
import { handleLogout } from '../main.js';
import { getCurrentUser } from '../utils/auth.js';
import { emojiList, getEmojiCategories } from '../utils/emoji.js';

let typingTimeout = null;
let currentChatUser = null;
let unseenCounts = {};
let isTyping = false;
let replyTo = null;

export default function Messenger(container, navigate, currentUser) {
  const div = document.createElement('div');
  div.className = 'messenger-app';
  div.innerHTML = `
    <div class="messenger-layout">
      <!-- Sidebar -->
      <aside class="sidebar-glass" id="sidebar">
        <div class="sidebar-header">
          <div class="user-profile-mini" id="userProfile">
            <div class="avatar-mini" id="avatarMini">
              <img src="${currentUser.avatar || '/src/assets/default-avatar.svg'}" alt="${currentUser.username}">
            </div>
            <div class="user-info-mini">
              <span class="username-mini">${currentUser.username}</span>
              <span class="status-mini online">Online</span>
            </div>
          </div>
          <div class="sidebar-actions">
            <button class="icon-btn" id="themeToggle" title="Toggle Theme">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${getTheme() === 'dark' 
                  ? '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'
                  : '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'
                }
              </svg>
            </button>
            <button class="icon-btn" id="profileBtn" title="Profile">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </button>
            <button class="icon-btn logout-btn" id="logoutBtn" title="Logout">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
        
        <div class="search-container">
          <div class="search-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <input type="text" id="searchUsers" placeholder="Search users...">
        </div>
        
        <div class="user-list" id="userList">
          <div class="loading-users">Loading users...</div>
        </div>
      </aside>
      
      <!-- Chat Area -->
      <main class="chat-main" id="chatMain">
        <div class="chat-placeholder" id="chatPlaceholder">
          <div class="placeholder-content">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <h2>ARCKER Messenger</h2>
            <p>Select a user to start messaging</p>
          </div>
        </div>
        
        <div class="chat-container" id="chatContainer" style="display:none;">
          <div class="chat-header" id="chatHeader">
            <div class="chat-user-info">
              <div class="chat-avatar">
                <img id="chatAvatar" src="" alt="">
                <span class="chat-status" id="chatStatus"></span>
              </div>
              <div class="chat-user-details">
                <span class="chat-username" id="chatUsername">User</span>
                <span class="chat-user-status" id="chatUserStatus">Offline</span>
              </div>
            </div>
            <div class="chat-header-actions">
              <button class="icon-btn" id="profileViewBtn" title="View Profile">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </button>
            </div>
          </div>
          
          <div class="messages-container" id="messagesContainer">
            <div class="messages-list" id="messagesList"></div>
            <div class="typing-indicator" id="typingIndicator" style="display:none;">
              <span class="typing-dots">
                <span></span><span></span><span></span>
              </span>
              <span class="typing-text" id="typingText">typing...</span>
            </div>
          </div>
          
          <div class="message-input-area">
            <div class="input-tools">
              <button class="tool-btn" id="emojiBtn" title="Emoji">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                  <line x1="9" y1="9" x2="9.01" y2="9"/>
                  <line x1="15" y1="9" x2="15.01" y2="9"/>
                </svg>
              </button>
              <button class="tool-btn" id="attachBtn" title="Attach file">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
              </button>
              <div class="reply-preview" id="replyPreview" style="display:none;">
                <div class="reply-content">
                  <span class="reply-label">Replying to</span>
                  <span class="reply-text" id="replyText"></span>
                </div>
                <button class="reply-cancel" id="cancelReply">×</button>
              </div>
            </div>
            <div class="input-row">
              <textarea id="messageInput" rows="1" placeholder="Type a message..."></textarea>
              <button class="send-btn" id="sendBtn">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
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
        <button class="emoji-close" id="emojiClose">×</button>
      </div>
      <div class="emoji-categories" id="emojiCategories"></div>
      <div class="emoji-grid" id="emojiGrid"></div>
    </div>
  `;

  // ---- DOM References ----
  const userList = div.querySelector('#userList');
  const searchInput = div.querySelector('#searchUsers');
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

  let users = [];
  let onlineUsers = new Set();
  let currentUserId = currentUser.id;
  let allMessages = [];
  let emojiCategory = 'smileys';

  // ---- Helper Functions ----
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  function clearReply() {
    replyTo = null;
    replyPreview.style.display = 'none';
    replyText.textContent = '';
  }

  function setReplyTo(msg) {
    replyTo = msg;
    replyPreview.style.display = 'flex';
    replyText.textContent = msg.message.length > 50 ? msg.message.substring(0, 50) + '...' : msg.message;
    messageInput.focus();
  }

  function updateUnseenBadges() {
    renderUserList(users);
  }

  function playNotificationSound() {
    try {
      const audio = new Audio('/src/assets/notification.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (e) {}
  }

  // ---- Render User List ----
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
            <div class="user-item-status">
              ${isOnline ? 'Online' : `Last seen ${formatLastSeen(user.last_seen)}`}
            </div>
          </div>
        </div>
      `;
    }).join('');

    userList.querySelectorAll('.user-item').forEach(el => {
      el.addEventListener('click', () => {
        const userId = parseInt(el.dataset.userId);
        const user = users.find(u => u.id === userId);
        if (user) {
          openChat(user);
        }
      });
    });
  }

  // ---- Load Users ----
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

  // ---- Render Messages (با پشتیبانی از فایل) ----
  function renderMessages(messages) {
    if (!messagesList) return;

    if (messages.length === 0) {
      messagesList.innerHTML = `<div class="no-messages">No messages yet. Say hello! 👋</div>`;
      return;
    }

    let lastDate = null;
    let html = '';

    messages.forEach(msg => {
      const msgDate = new Date(msg.time);
      const dateStr = msgDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });

      if (dateStr !== lastDate) {
        html += `<div class="message-date">${dateStr}</div>`;
        lastDate = dateStr;
      }

      const isOwn = msg.sender_id === currentUserId;
      const time = msgDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });

      const seenMark = isOwn && msg.seen ? '✓✓' : (isOwn ? '✓' : '');

      let replyHtml = '';
      if (msg.reply_text) {
        replyHtml = `
          <div class="reply-preview-bubble">
            <span class="reply-preview-label">↩ Reply</span>
            <span class="reply-preview-text">${escapeHtml(msg.reply_text)}</span>
          </div>
        `;
      }

      // ---- پردازش محتوای پیام (متن یا فایل) ----
      let content = '';
      let isFile = false;
      let fileData = null;

      if (typeof msg.message === 'string' && msg.message.startsWith('{') && msg.message.includes('"type":"file"')) {
        try {
          fileData = JSON.parse(msg.message);
          isFile = true;
        } catch(e) {
          console.error('Failed to parse file data:', e);
        }
      }

      if (msg.deleted) {
        content = '🗑️ Message deleted';
      } else if (isFile && fileData && fileData.data) {
        if (fileData.data.startsWith('data:image')) {
          content = `<img src="${fileData.data}" style="max-width:200px;max-height:200px;border-radius:8px;cursor:pointer;" onclick="window.open('${fileData.data}')" />`;
        } else {
          content = `<a href="${fileData.data}" download="${fileData.name}" style="color:var(--gold);text-decoration:underline;">📎 ${fileData.name} (${(fileData.size/1024).toFixed(1)} KB)</a>`;
        }
      } else {
        content = escapeHtml(msg.message);
      }

      html += `
        <div class="message-bubble ${isOwn ? 'own' : 'other'} ${msg.deleted ? 'deleted' : ''}" data-message-id="${msg.id}">
          ${replyHtml}
          <div class="message-content">${content}</div>
          <div class="message-footer">
            <span class="message-time">${time}</span>
            ${isOwn ? `<span class="message-seen">${seenMark}</span>` : ''}
          </div>
        </div>
      `;
    });

    messagesList.innerHTML = html;
    setTimeout(scrollToBottom, 50);
  }

  // ---- Load Messages ----
  async function loadMessages(otherUserId) {
    try {
      const data = await api.get(`/messages/${currentUserId}/${otherUserId}?limit=100`);
      allMessages = data.messages || [];
      renderMessages(allMessages);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }

  // ---- Open Chat ----
  async function openChat(user) {
    currentChatUser = user;
    chatContainer.style.display = 'flex';
    chatPlaceholder.style.display = 'none';

    chatUsername.textContent = user.username;
    chatAvatar.src = user.avatar || '/src/assets/default-avatar.svg';
    const isOnline = onlineUsers.has(user.id);
    chatUserStatus.textContent = isOnline ? 'Online' : `Last seen ${formatLastSeen(user.last_seen)}`;
    chatStatus.className = `chat-status ${isOnline ? 'online' : 'offline'}`;

    clearReply();
    await loadMessages(user.id);

    const unseenMessages = allMessages
      .filter(m => m.receiver_id === currentUserId && !m.seen)
      .map(m => m.id);
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

  // ---- Send Message ----
  async function sendMessageHandler() {
    const text = messageInput.value.trim();
    if (!text || !currentChatUser) return;

    const replyId = replyTo ? replyTo.id : null;

    sendMessage({
      receiver_id: currentChatUser.id,
      message: text,
      reply_to_id: replyId
    });

    messageInput.value = '';
    messageInput.style.height = 'auto';
    clearReply();

    const tempMsg = {
      id: Date.now(),
      sender_id: currentUserId,
      receiver_id: currentChatUser.id,
      message: text,
      time: new Date().toISOString(),
      seen: false,
      reply_to_id: replyId,
      reply_text: replyTo ? replyTo.message : null,
      deleted: false
    };
    allMessages.push(tempMsg);
    renderMessages(allMessages);
    setTimeout(scrollToBottom, 50);
  }

  // ---- Emoji Picker ----
  function initEmojiPicker() {
    const categories = getEmojiCategories();
    emojiCategories.innerHTML = categories.map(cat => `
      <button class="emoji-cat-btn ${cat.key === emojiCategory ? 'active' : ''}" data-category="${cat.key}">
        ${cat.icon}
      </button>
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
    emojiGrid.innerHTML = emojis.map(e => `
      <span class="emoji-item" data-emoji="${e.emoji}">${e.emoji}</span>
    `).join('');

    emojiGrid.querySelectorAll('.emoji-item').forEach(el => {
      el.addEventListener('click', () => {
        messageInput.value += el.dataset.emoji;
        messageInput.focus();
        emojiPicker.style.display = 'none';
        messageInput.dispatchEvent(new Event('input'));
      });
    });
  }

  // ---- Handle File Upload ----
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
        const base64 = e.target.result; // data:image/png;base64,...
        const fileData = {
            type: 'file',
            name: file.name,
            size: file.size,
            data: base64
        };
        const messageText = JSON.stringify(fileData);
        sendMessage({
            receiver_id: currentChatUser.id,
            message: messageText,
            reply_to_id: null
        });
        const tempMsg = {
            id: Date.now(),
            sender_id: currentUserId,
            receiver_id: currentChatUser.id,
            message: messageText,
            time: new Date().toISOString(),
            seen: false,
            deleted: false
        };
        allMessages.push(tempMsg);
        renderMessages(allMessages);
        setTimeout(scrollToBottom, 50);
    };
    reader.readAsDataURL(file);
  }

  // ---- Socket Listeners ----
  const unsubMessage = onMessage((data) => {
    const msg = data;
    if (msg.sender_id === currentChatUser?.id) {
      allMessages.push(msg);
      renderMessages(allMessages);
      setTimeout(scrollToBottom, 50);
      markSeen([msg.id]);
      unseenCounts[msg.sender_id] = 0;
      updateUnseenBadges();
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
      if (data.status === 'online') {
        onlineUsers.add(data.userId);
      } else {
        onlineUsers.delete(data.userId);
      }
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
    allMessages = allMessages.map(msg => {
        if (data.messageIds.includes(msg.id)) {
            if (msg.receiver_id === data.userId) {
                msg.seen = true;
            }
        }
        return msg;
    });
    renderMessages(allMessages);
  });

  // ---- Event Listeners ----
  // Typing detection
  messageInput.addEventListener('input', () => {
    const text = messageInput.value.trim();
    const hasText = text.length > 0;

    if (hasText !== isTyping && currentChatUser) {
      isTyping = hasText;
      sendTyping(currentChatUser.id, hasText);
    }

    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
  });

  // Enter to send
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessageHandler();
    }
  });

  // Send button
  sendBtn.addEventListener('click', sendMessageHandler);

  // ---- Theme Toggle ----
  themeToggle.addEventListener('click', () => {
    toggleTheme();
    const svg = themeToggle.querySelector('svg');
    const isDark = getTheme() === 'dark';
    if (isDark) {
      svg.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`;
    } else {
      svg.innerHTML = `<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`;
    }
  });

  // ---- Emoji ----
  emojiBtn.addEventListener('click', () => {
    const isVisible = emojiPicker.style.display === 'block';
    emojiPicker.style.display = isVisible ? 'none' : 'block';
    if (!isVisible) {
      initEmojiPicker();
    }
  });

  emojiClose.addEventListener('click', () => {
    emojiPicker.style.display = 'none';
  });

  document.addEventListener('click', (e) => {
    if (!emojiPicker.contains(e.target) && e.target !== emojiBtn && !emojiBtn.contains(e.target)) {
      emojiPicker.style.display = 'none';
    }
  });

  // ---- Attach ----
  attachBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.pdf,.doc,.docx,.txt,.zip';
    input.multiple = true;
    input.onchange = (e) => {
      const files = e.target.files;
      for (const file of files) {
        handleFileUpload(file);
      }
    };
    input.click();
  });

  // ---- Drag and Drop ----
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
    for (const file of files) {
      handleFileUpload(file);
    }
  });

  // ---- Cancel Reply ----
  cancelReply.addEventListener('click', clearReply);

  // ---- Logout ----
  logoutBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to logout?')) {
      handleLogout();
    }
  });

  // ---- Profile ----
  profileBtn.addEventListener('click', () => {
    navigate('profile');
  });

  // ---- Search ----
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (!query) {
      renderUserList(users);
      return;
    }
    const filtered = users.filter(u => u.username.toLowerCase().includes(query));
    renderUserList(filtered);
  });

  // ---- Notification permission ----
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  // ---- Load initial data ----
  loadUsers();

  return div;
}