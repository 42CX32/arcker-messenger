import { api } from '../utils/api.js';
import { getCurrentUser, setCurrentUser } from '../utils/auth.js';
import { getThemeColors } from '../utils/theme.js';
import { getSocket } from '../utils/socket.js';

export default function Profile(container, navigate, currentUser) {
  const colors = getThemeColors();
  const div = document.createElement('div');
  div.className = 'profile-page';
  div.innerHTML = `
    <div class="profile-container">
      <div class="profile-header">
        <button class="back-btn" id="backBtn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back
        </button>
        <h2>Profile</h2>
        <div style="width:60px;"></div>
      </div>
      
      <div class="profile-card">
        <div class="profile-avatar-section">
          <div class="profile-avatar-wrapper">
            <img src="${currentUser.avatar || '/src/assets/default-avatar.svg'}" alt="${currentUser.username}" id="profileAvatar">
            <label for="avatarUpload" class="avatar-upload-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </label>
            <input type="file" id="avatarUpload" accept="image/*" style="display:none;">
          </div>
          <h2 id="profileUsername">${currentUser.username}</h2>
          <p class="profile-status">${currentUser.status === 'online' ? '● Online' : '○ Offline'}</p>
        </div>
        
        <div class="profile-form">
          <div class="form-group">
            <label>Username</label>
            <input type="text" id="editUsername" value="${currentUser.username}" class="profile-input">
          </div>
          
          <div class="form-group">
            <label>Bio</label>
            <textarea id="editBio" rows="3" class="profile-input" placeholder="Tell something about yourself…">${currentUser.bio || ''}</textarea>
          </div>
          
          <div class="form-group">
            <label>Theme</label>
            <div class="theme-selector" id="themeSelector">
              <div class="theme-option-small ${currentUser.theme === 'purple' || !currentUser.theme ? 'active' : ''}" data-theme="purple">
                <span class="theme-dot theme-purple"></span> Purple
              </div>
              <div class="theme-option-small ${currentUser.theme === 'orange' ? 'active' : ''}" data-theme="orange">
                <span class="theme-dot theme-orange"></span> Orange
              </div>
              <div class="theme-option-small ${currentUser.theme === 'cyber' ? 'active' : ''}" data-theme="cyber">
                <span class="theme-dot theme-cyber"></span> Cyber
              </div>
            </div>
          </div>
          
          <div id="profileError" class="error-message" style="display:none;"></div>
          <div id="profileSuccess" class="success-message" style="display:none;"></div>
          
          <button class="btn-primary save-profile-btn" id="saveProfile">
            Save Changes
          </button>
          
          <div class="profile-stats">
            <div class="stat-item">
              <span class="stat-value">${currentUser.total_messages || 0}</span>
              <span class="stat-label">Messages</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">${new Date(currentUser.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <span class="stat-label">Joined</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // ===== DOM references =====
  const backBtn = div.querySelector('#backBtn');
  const avatarUpload = div.querySelector('#avatarUpload');
  const profileAvatar = div.querySelector('#profileAvatar');
  const editUsername = div.querySelector('#editUsername');
  const editBio = div.querySelector('#editBio');
  const themeSelector = div.querySelector('#themeSelector');
  const saveBtn = div.querySelector('#saveProfile');
  const errorDiv = div.querySelector('#profileError');
  const successDiv = div.querySelector('#profileSuccess');

  let selectedTheme = currentUser.theme || 'purple';

  // ---- Back ----
  backBtn.addEventListener('click', () => {
    navigate('messenger');
  });

  // ---- Theme Selector ----
  themeSelector.querySelectorAll('.theme-option-small').forEach(el => {
    el.addEventListener('click', () => {
      const theme = el.dataset.theme;
      selectedTheme = theme;
      themeSelector.querySelectorAll('.theme-option-small').forEach(e => e.classList.remove('active'));
      el.classList.add('active');
    });
  });

  // ---- Avatar Upload ----
  avatarUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // پیش‌نمایش فوری
    const reader = new FileReader();
    reader.onload = (e) => {
      profileAvatar.src = e.target.result;
    };
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const result = await api.upload('/users/avatar', formData);
      if (result.user) {
        // به‌روزرسانی کاربر جاری
        const updated = { ...getCurrentUser(), ...result.user };
        setCurrentUser(updated);
        profileAvatar.src = result.user.avatar || '/src/assets/default-avatar.svg';
        showSuccess('Avatar updated successfully! ✨');

        // ارسال رویداد از طریق Socket برای به‌روزرسانی سایر کاربران
        const socket = getSocket();
        if (socket && socket.connected) {
          // استفاده از userId از کاربر به‌روز شده
          socket.emit('avatar_update', { 
            userId: updated.id, 
            avatar: result.user.avatar 
          });
          console.log('📤 Avatar update emitted via socket');
        } else {
          console.warn('⚠️ Socket not connected, avatar update not broadcast');
        }
      }
    } catch (error) {
      showError('Failed to upload avatar');
      console.error('Avatar upload error:', error);
    }
  });

  // ---- Save Profile (without password) ----
  saveBtn.addEventListener('click', async () => {
    const username = editUsername.value.trim();
    const bio = editBio.value.trim();
    const theme = selectedTheme;

    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';

    try {
      const profileData = { username, bio, theme };
      const result = await api.put('/users/profile', profileData);

      if (result.user) {
        const updated = { ...getCurrentUser(), ...result.user };
        setCurrentUser(updated);
        showSuccess('✅ Profile updated successfully!');
      }
    } catch (error) {
      showError(error.message || '❌ Failed to update profile');
    }
  });

  function showError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    successDiv.style.display = 'none';
    setTimeout(() => { errorDiv.style.display = 'none'; }, 5000);
  }

  function showSuccess(message) {
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    errorDiv.style.display = 'none';
    setTimeout(() => { successDiv.style.display = 'none'; }, 4000);
  }

  return div;
}