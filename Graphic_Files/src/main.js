import './style.css';
import { api, setAuthToken, getAuthToken } from './utils/api.js';
import { logoutUser, getCurrentUser, setCurrentUser } from './utils/auth.js';
import { initTheme, applyTheme } from './utils/theme.js';
import { initSocket, disconnectSocket } from './utils/socket.js';
import Login from './components/Login.js';
import Register from './components/Register.js';
import Messenger from './components/Messenger.js';
import Profile from './components/Profile.js';

let currentUser = getCurrentUser();
let currentView = 'messenger';
const app = document.getElementById('app');

function navigate(view, data = {}) {
  currentView = view;
  render(view, data);
}

async function render(view, data = {}) {
  app.innerHTML = '';
  
  if (!currentUser) {
    const loginElement = Login(app, navigate);
    if (loginElement) app.appendChild(loginElement);
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
    }
  } catch (error) {
    console.error('Render error:', error);
    app.innerHTML = `<div style="color:#ff6b6b;padding:20px;font-family:sans-serif;">
      <h2>❌ Error</h2>
      <p>${error.message}</p>
      <pre style="background:#1a1a2e;padding:12px;border-radius:8px;font-size:12px;overflow:auto;">${error.stack}</pre>
    </div>`;
  }
}

async function initApp() {
  initTheme();
  
  const token = getAuthToken();
  if (token) {
    setAuthToken(token);
    try {
      const response = await api.get('/users/me');
      if (response.user) {
        currentUser = response.user;
        setCurrentUser(currentUser);
        await initSocket(token);
        render('messenger');
        return;
      }
    } catch (error) {
      console.error('Auth error:', error);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      currentUser = null;
    }
  }
  
  const storedUser = getCurrentUser();
  if (storedUser) {
    currentUser = storedUser;
    render('messenger');
    return;
  }
  
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

// Start app
initApp();

// Theme change listener
window.addEventListener('theme-change', (e) => {
  applyTheme(e.detail.theme);
});

export { navigate, render, currentUser };