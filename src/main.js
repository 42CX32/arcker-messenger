import './style.css';
import { api, setAuthToken, getAuthToken } from './utils/api.js';
import { logoutUser, getCurrentUser, setCurrentUser } from './utils/auth.js';
import { initTheme, applyTheme } from './utils/theme.js';
import { initSocket, disconnectSocket } from './utils/socket.js';
import Login from './components/Login.js';
import Register from './components/Register.js';
import Messenger from './components/Messenger.js';
import Profile from './components/Profile.js';

console.log('🔵 main.js loaded');

let currentUser = getCurrentUser();
let currentView = 'messenger';
const app = document.getElementById('app');

function navigate(view, data = {}) {
  console.log('🔵 Navigate to:', view);
  currentView = view;
  render(view, data);
}

async function render(view, data = {}) {
  console.log('🔵 Rendering:', view);
  app.innerHTML = '';
  
  if (!currentUser) {
    console.log('🔵 No user, showing Login');
    try {
      const loginElement = Login(app, navigate);
      if (loginElement) {
        app.appendChild(loginElement);
        console.log('✅ Login rendered');
      } else {
        console.error('❌ Login returned null');
        app.innerHTML = '<div style="color:red;">Login component returned null</div>';
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      app.innerHTML = `<div style="color:red;padding:20px;">Login error: ${error.message}</div>`;
    }
    return;
  }

  let component;
  try {
    switch (view) {
      case 'login':
        component = Login(app, navigate);
        break;
      case 'register':
        component = Register(app, navigate);
        break;
      case 'profile':
        component = await Profile(app, navigate, currentUser);
        break;
      case 'messenger':
      default:
        component = await Messenger(app, navigate, currentUser);
        break;
    }
    if (component) {
      app.appendChild(component);
      console.log(`✅ Rendered: ${view}`);
    } else {
      console.error(`❌ Component ${view} returned null/undefined`);
      app.innerHTML = `<div style="color:red;padding:20px;">Component ${view} returned null</div>`;
    }
  } catch (error) {
    console.error('Render error:', error);
    app.innerHTML = `<div style="color:#ff6b6b;padding:20px;font-family:sans-serif;background:#0b0719;height:100vh;overflow:auto;">
      <h2>❌ Render Error</h2>
      <p><strong>${error.message}</strong></p>
      <pre style="background:#1a1a2e;padding:12px;border-radius:8px;font-size:12px;overflow:auto;color:#f0eaff;white-space:pre-wrap;max-height:400px;">${error.stack}</pre>
    </div>`;
  }
}

async function initApp() {
  console.log('🔵 Initializing app...');
  initTheme();
  
  const token = getAuthToken();
  console.log('🔵 Token:', token ? 'exists' : 'none');
  
  if (token) {
    setAuthToken(token);
    try {
      console.log('🔵 Fetching user from /users/me...');
      const response = await api.get('/users/me');
      if (response.user) {
        currentUser = response.user;
        setCurrentUser(currentUser);
        console.log('🔵 User loaded:', currentUser.username);
        await initSocket(token);
        render('messenger');
        return;
      }
    } catch (error) {
      console.error('❌ Auth error:', error);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      currentUser = null;
    }
  }
  
  // فقط اگر توکن وجود داشته باشد، از کاربر ذخیره شده استفاده کن
  // در غیر این صورت، لاگین نشان داده شود
  console.log('🔵 No valid token, showing login');
  currentUser = null;
  setCurrentUser(null);
  render('login');
}

export function handleLogout() {
  if (currentUser) logoutUser(currentUser.id);
  disconnectSocket();
  currentUser = null;
  setCurrentUser(null);
  render('login');
}

export function updateUser(userData) {
  currentUser = userData;
  setCurrentUser(userData);
  render(currentView);
}

initApp();

window.addEventListener('theme-change', (e) => {
  applyTheme(e.detail.theme);
});

export { navigate, render, currentUser };