import { api, setAuthToken } from './api.js';

export function getCurrentUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

export function setCurrentUser(user) {
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  } else {
    localStorage.removeItem('user');
  }
}

export function getAuthToken() {
  return localStorage.getItem('token');
}

export async function login(username, password) {
  const response = await api.post('/auth/login', { username, password });
  if (response.success && response.token) {
    setAuthToken(response.token);
    setCurrentUser(response.user);
    return { success: true, user: response.user };
  }
  return { success: false, error: response.error || 'Login failed' };
}

export async function register(username, password) {
  const response = await api.post('/auth/register', { username, password });
  if (response.success && response.token) {
    setAuthToken(response.token);
    setCurrentUser(response.user);
    return { success: true, user: response.user };
  }
  return { success: false, error: response.error || 'Registration failed' };
}

export async function logoutUser(userId) {
  try {
    await api.post('/auth/logout', { userId });
  } catch (error) {
    console.error('Logout error:', error);
  }
  setAuthToken(null);
  setCurrentUser(null);
}

export function isAuthenticated() {
  return !!getAuthToken() && !!getCurrentUser();
}