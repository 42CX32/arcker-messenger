export default function Login(container, navigate) {
  const div = document.createElement('div');
  div.className = 'login-page';
  div.innerHTML = `
    <div class="login-container">
      <div class="login-card glass">
        <div class="login-header">
          <div class="logo-container">
            <svg class="logo-icon" viewBox="0 0 200 200" width="60" height="60">
              <defs>
                <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#6c5ce7"/>
                  <stop offset="100%" style="stop-color:#00ff88"/>
                </linearGradient>
              </defs>
              <circle cx="100" cy="100" r="90" fill="none" stroke="url(#logoGrad)" stroke-width="8"/>
              <path d="M60 140 L100 60 L140 140 L100 110 Z" fill="url(#logoGrad)"/>
              <circle cx="100" cy="80" r="12" fill="url(#logoGrad)"/>
            </svg>
            <h1 class="logo-text">ARCKER</h1>
            <span class="logo-sub">Messenger</span>
          </div>
          <p class="login-subtitle">Welcome back. Sign in to continue.</p>
        </div>
        <form class="login-form" id="loginForm">
          <div class="input-group">
            <div class="input-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <input type="text" id="loginUsername" placeholder="Username" autocomplete="username" required>
          </div>
          <div class="input-group">
            <div class="input-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <input type="password" id="loginPassword" placeholder="Password" autocomplete="current-password" required>
            <button type="button" class="toggle-password" id="togglePasswordBtn" aria-label="Toggle password visibility">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
        <div class="login-footer">
          <p>Don't have an account? <a href="#" id="showRegisterLink">Create one</a></p>
        </div>
      </div>
      <div class="login-bg-animation">
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
        <div class="orb orb-3"></div>
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
  const showRegisterLink = div.querySelector('#showRegisterLink');

  // ===== Toggle password visibility =====
  toggleBtn.addEventListener('click', function(e) {
    e.preventDefault();
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    // تغییر آیکون
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

  // ===== Show register =====
  showRegisterLink.addEventListener('click', function(e) {
    e.preventDefault();
    navigate('register');
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

    // Show loading
    btnText.style.display = 'none';
    btnLoader.style.display = 'flex';
    loginBtn.disabled = true;
    errorDiv.style.display = 'none';

    try {
      const response = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
        loginBtn.style.background = '#00ff88';
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
      showError('Connection error. Please try again.');
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

  // ===== Enter key support =====
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