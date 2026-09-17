import { api } from '../utils/api.js';

export default function Register(container, navigate) {
  const div = document.createElement('div');
  div.className = 'login-page';
  div.innerHTML = `
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <div class="logo-container">
            <svg class="logo-icon" viewBox="0 0 200 200" width="52" height="52">
              <defs>
                <linearGradient id="logoGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#A77A54"/>
                  <stop offset="100%" style="stop-color:#C79A72"/>
                </linearGradient>
              </defs>
              <circle cx="100" cy="100" r="90" fill="none" stroke="url(#logoGrad2)" stroke-width="8"/>
              <path d="M60 140 L100 60 L140 140 L100 110 Z" fill="url(#logoGrad2)"/>
              <circle cx="100" cy="80" r="12" fill="url(#logoGrad2)"/>
            </svg>
            <h1 class="logo-text"><span>ARCKER</span></h1>
            <span class="logo-sub">Messenger</span>
          </div>
          <p class="login-subtitle">Create your account. Join the future.</p>
        </div>
        <form class="login-form" id="registerForm">
          <div class="input-group">
            <div class="icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <input type="text" id="regUsername" placeholder="Choose a username" required>
          </div>
          <div class="input-group">
            <div class="icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <input type="password" id="regPassword" placeholder="Create a password (min 6 chars)" required>
            <button type="button" class="toggle-password" id="regTogglePassword" aria-label="Toggle password visibility">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
          <div class="input-group">
            <div class="icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <input type="password" id="regConfirmPassword" placeholder="Confirm password" required>
          </div>
          <div id="registerError" class="error-message" style="display:none;"></div>
          <button type="submit" class="btn-primary" id="registerBtn">
            <span class="btn-text">Create Account</span>
            <span class="btn-loader" style="display:none;">
              <span class="dot"></span><span class="dot"></span><span class="dot"></span>
            </span>
          </button>
        </form>
        <div class="login-footer">
          <p>Already have an account? <a href="#" id="showLoginLink">Sign In</a></p>
        </div>
      </div>
    </div>
  `;

  // ===== DOM references =====
  const usernameInput = div.querySelector('#regUsername');
  const passwordInput = div.querySelector('#regPassword');
  const confirmInput = div.querySelector('#regConfirmPassword');
  const toggleBtn = div.querySelector('#regTogglePassword');
  const errorDiv = div.querySelector('#registerError');
  const registerBtn = div.querySelector('#registerBtn');
  const btnText = registerBtn.querySelector('.btn-text');
  const btnLoader = registerBtn.querySelector('.btn-loader');
  const showLoginLink = div.querySelector('#showLoginLink');

  // ===== Toggle password visibility =====
  toggleBtn.addEventListener('click', function(e) {
    e.preventDefault();
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    const svg = this.querySelector('svg');
    if (type === 'text') {
      svg.innerHTML = `
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      `;
    } else {
      svg.innerHTML = `
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      `;
    }
  });

  // ===== Show login =====
  showLoginLink.addEventListener('click', function(e) {
    e.preventDefault();
    navigate('login');
  });

  // ===== Handle register =====
  const form = div.querySelector('#registerForm');

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const confirm = confirmInput.value;

    if (!username || !password || !confirm) {
      showError('Please fill in all fields');
      return;
    }

    if (password !== confirm) {
      showError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      showError('Password must be at least 6 characters');
      return;
    }

    if (username.length < 3 || username.length > 20) {
      showError('Username must be 3-20 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      showError('Username can only contain letters, numbers, and underscores');
      return;
    }

    btnText.style.display = 'none';
    btnLoader.style.display = 'flex';
    registerBtn.disabled = true;
    errorDiv.style.display = 'none';

    try {
      const data = await api.post('/auth/register', { username, password });

      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
        registerBtn.style.background = '#49C16D';
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        showError(data.error || 'Registration failed');
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
        registerBtn.disabled = false;
      }
    } catch (error) {
      showError(error.message || 'Connection error. Please try again.');
      btnText.style.display = 'inline';
      btnLoader.style.display = 'none';
      registerBtn.disabled = false;
    }
  });

  function showError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    errorDiv.style.animation = 'shake 0.5s ease';
    setTimeout(() => {
      errorDiv.style.animation = '';
    }, 500);
  }

  passwordInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      confirmInput.focus();
    }
  });

  confirmInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      form.dispatchEvent(new Event('submit'));
    }
  });

  return div;
}