import { api } from '../utils/api.js';

export default function Login(container, navigate) {
  const div = document.createElement('div');
  div.className = 'login-page';
  div.innerHTML = `
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <div class="logo-container">
            <svg 
              class="logo-dna" 
              viewBox="0 0 200 200" 
              width="60" 
              height="60"
              xmlns="http://www.w3.org/2000/svg"
            >
              <!-- Strand 1 (Purple) -->
              <path 
                d="M 50 20 
                   Q 70 50, 50 80 
                   Q 30 110, 50 140 
                   Q 70 170, 50 180" 
                fill="none" 
                stroke="#6C5CE7" 
                stroke-width="6" 
                stroke-linecap="round"
                class="dna-strand-1"
              />
              <!-- Strand 2 (Orange) -->
              <path 
                d="M 150 20 
                   Q 130 50, 150 80 
                   Q 170 110, 150 140 
                   Q 130 170, 150 180" 
                fill="none" 
                stroke="#F97316" 
                stroke-width="6" 
                stroke-linecap="round"
                class="dna-strand-2"
              />
              <!-- Crossbars -->
              <line x1="52" y1="35" x2="148" y2="35" stroke="#6C5CE7" stroke-width="3" opacity="0.6"/>
              <line x1="48" y1="65" x2="152" y2="65" stroke="#F97316" stroke-width="3" opacity="0.6"/>
              <line x1="52" y1="95" x2="148" y2="95" stroke="#6C5CE7" stroke-width="3" opacity="0.6"/>
              <line x1="48" y1="125" x2="152" y2="125" stroke="#F97316" stroke-width="3" opacity="0.6"/>
              <line x1="52" y1="155" x2="148" y2="155" stroke="#6C5CE7" stroke-width="3" opacity="0.6"/>
              <!-- Center axis glow -->
              <line x1="100" y1="10" x2="100" y2="190" stroke="url(#centerGradient)" stroke-width="2" opacity="0.3"/>
              <defs>
                <linearGradient id="centerGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#6C5CE7" stop-opacity="0.8"/>
                  <stop offset="50%" stop-color="#F97316" stop-opacity="0.8"/>
                  <stop offset="100%" stop-color="#6C5CE7" stop-opacity="0.8"/>
                </linearGradient>
              </defs>
            </svg>

            <div class="logo-text-wrapper">
              <h1 class="logo-text"><span>ARCKER</span></h1>
              <span class="logo-sub">Messenger</span>
            </div>
          </div>
          <p class="login-subtitle">Welcome back. Sign in to continue.</p>
        </div>
        <form class="login-form" id="loginForm">
          <div class="input-group">
            <div class="icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <input type="text" id="loginUsername" placeholder="Username" autocomplete="username" required>
          </div>
          <div class="input-group">
            <div class="icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <input type="password" id="loginPassword" placeholder="Password" autocomplete="current-password" required>
            <button type="button" class="toggle-password" id="togglePasswordBtn" aria-label="Toggle password visibility">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
          <div id="loginError" class="error-message" style="display:none;"></div>
          <button type="submit" class="btn-primary" id="loginBtn">
            <span class="btn-text">Sign In</span>
            <span class="btn-loader" style="display:none;">
              <span class="dot"></span><span class="dot"></span><span class="dot"></span>
            </span>
          </button>
        </form>
        <!-- بخش "Don't have an account?" حذف شد -->
      </div>
    </div>
  `;

  // ===== DOM references =====
  const usernameInput = div.querySelector('#loginUsername');
  const passwordInput = div.querySelector('#loginPassword');
  const toggleBtn = div.querySelector('#togglePasswordBtn');
  const errorDiv = div.querySelector('#loginError');
  const loginBtn = div.querySelector('#loginBtn');
  const btnText = loginBtn.querySelector('.btn-text');
  const btnLoader = loginBtn.querySelector('.btn-loader');

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

  // ===== Handle login =====
  const form = div.querySelector('#loginForm');

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      showError('Please fill in all fields');
      return;
    }

    btnText.style.display = 'none';
    btnLoader.style.display = 'flex';
    loginBtn.disabled = true;
    errorDiv.style.display = 'none';

    try {
      const data = await api.post('/auth/login', { username, password });

      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
        loginBtn.style.background = '#49C16D';
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        showError(data.error || 'Invalid username or password');
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
        loginBtn.disabled = false;
      }
    } catch (error) {
      showError(error.message || 'Connection error. Please try again.');
      btnText.style.display = 'inline';
      btnLoader.style.display = 'none';
      loginBtn.disabled = false;
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
      form.dispatchEvent(new Event('submit'));
    }
  });

  usernameInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      passwordInput.focus();
    }
  });

  return div;
}