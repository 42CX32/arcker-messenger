import { api } from '../utils/api.js';
import { getCurrentUser, setCurrentUser } from '../utils/auth.js';
import { getThemeColors } from '../utils/theme.js';

export default function Profile(container, navigate, currentUser) {
  const colors = getThemeColors();
  const div = document.createElement('div');
  div.className = 'profile-page';
  div.innerHTML = `
    <div class="profile-container">
      <button class="back-btn" id="backBtn">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Back
      </button>
      
      <div class="profile-card glass">
        <div class="profile-avatar-section">
          <div class="profile-avatar-wrapper">
            <img src="${currentUser.avatar || '/src/assets/default-avatar.svg'}" alt="${currentUser.username}" id="profileAvatar">
            <label for="avatarUpload" class="avatar-upload-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </label>
            <input type="file" id="avatarUpload" accept="image/*" style="display:none;">
          </div>
          <h2 id="profileUsername">${currentUser.username}</h2>
          <p class="profile-status">${currentUser.status === 'online' ? '🟢 Online' : 'Offline'}</p>
        </div>
        
        <div class="profile-form">
          <div class="form-group">
            <label>Username</label>
            <input type="text" id="editUsername" value="${currentUser.username}" class="profile-input">
          </div>
          
          <div class="form-group">
            <label>Bio</label>
            <textarea id="editBio" rows="3" class="profile-input" placeholder="Tell something about yourself...">${currentUser.bio || ''}</textarea>
          </div>
          
          <div class="form-group">
            <label>Theme</label>
            <select id="editTheme" class="profile-input">
              <option value="purple" ${currentUser.theme === 'purple' ? 'selected' : ''}>Purple</option>
              <option value="orange" ${currentUser.theme === 'orange' ? 'selected' : ''}>Orange</option>
              <option value="cyber" ${currentUser.theme === 'cyber' ? 'selected' : ''}>Cyber</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Change Password</label>
            <input type="password" id="currentPassword" placeholder="Current password" class="profile-input">
            <input type="password" id="newPassword" placeholder="New password (min 6 chars)" class="profile-input">
            <input type="password" id="confirmPassword" placeholder="Confirm new password" class="profile-input">
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
              <span class="stat-value">${new Date(currentUser.created_at).toLocaleDateString()}</span>
              <span class="stat-label">Joined</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Back button
  div.querySelector('#backBtn').addEventListener('click', () => {
    navigate('messenger');
  });

  // Avatar upload
  const avatarUpload = div.querySelector('#avatarUpload');
  const profileAvatar = div.querySelector('#profileAvatar');

  avatarUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const result = await api.upload('/users/avatar', formData);
      if (result.user) {
        profileAvatar.src = result.user.avatar || '/src/assets/default-avatar.svg';
        // Update current user
        const updated = { ...getCurrentUser(), ...result.user };
        setCurrentUser(updated);
        showSuccess('Avatar updated successfully!');
      }
    } catch (error) {
      showError('Failed to upload avatar');
    }
  });

  // Save profile
  const saveBtn = div.querySelector('#saveProfile');
  const errorDiv = div.querySelector('#profileError');
  const successDiv = div.querySelector('#profileSuccess');

  saveBtn.addEventListener('click', async () => {
    const username = div.querySelector('#editUsername').value.trim();
    const bio = div.querySelector('#editBio').value.trim();
    const theme = div.querySelector('#editTheme').value;
    const currentPassword = div.querySelector('#currentPassword').value;
    const newPassword = div.querySelector('#newPassword').value;
    const confirmPassword = div.querySelector('#confirmPassword').value;

    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';

    try {
      // Update profile
      const profileData = { username, bio, theme };
      const result = await api.put('/users/profile', profileData);
      
      if (result.user) {
        // Update current user
        const updated = { ...getCurrentUser(), ...result.user };
        setCurrentUser(updated);
        showSuccess('Profile updated successfully!');
      }

      // Update password if provided
      if (currentPassword && newPassword) {
        if (newPassword !== confirmPassword) {
          showError('New passwords do not match');
          return;
        }
        if (newPassword.length < 6) {
          showError('New password must be at least 6 characters');
          return;
        }
        await api.put('/users/password', { currentPassword, newPassword });
        showSuccess('Profile and password updated successfully!');
        // Clear password fields
        div.querySelector('#currentPassword').value = '';
        div.querySelector('#newPassword').value = '';
        div.querySelector('#confirmPassword').value = '';
      }
    } catch (error) {
      showError(error.message || 'Failed to update profile');
    }
  });

  function showError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    successDiv.style.display = 'none';
  }

  function showSuccess(message) {
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    errorDiv.style.display = 'none';
  }

  return div;
}