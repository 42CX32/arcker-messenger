const THEMES = {
  dark: {
    bg: '#1B1715',
    bgSecondary: '#2A221D',
    bgCard: '#E7D8C8',
    bgSurface: '#F4ECE3',
    bgInput: 'rgba(255, 255, 255, 0.06)',
    bgHover: 'rgba(255, 255, 255, 0.04)',
    bgActive: 'rgba(167, 122, 84, 0.10)',
    text: '#FFFDF9',
    textPrimary: '#2D2520',
    textSecondary: '#4A3E38',
    textMuted: '#8B7B70',
    textLight: '#FFFDF9',
    textInverse: '#FFFDF9',
    accent: '#A77A54',
    accentHover: '#C79A72',
    accentLight: '#D4B49A',
    accentGlow: 'rgba(167, 122, 84, 0.15)',
    border: 'rgba(255, 255, 255, 0.08)',
    borderLight: 'rgba(255, 255, 255, 0.04)',
    borderCard: 'rgba(45, 37, 32, 0.06)',
    shadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
    shadowMd: '0 8px 32px rgba(0, 0, 0, 0.06)',
    shadowLg: '0 16px 56px rgba(0, 0, 0, 0.08)',
    shadowXl: '0 24px 80px rgba(0, 0, 0, 0.10)',
    shadowGlow: '0 0 40px rgba(167, 122, 84, 0.08)',
    online: '#49C16D',
    offline: '#B0A89E',
    error: '#C84A4A',
    bubbleOwn: 'var(--accent)',
    bubbleOther: 'var(--bg-secondary)'
  },
  light: {
    bg: '#F8F5F2',
    bgSecondary: '#FFFFFF',
    bgCard: '#FFFFFF',
    bgSurface: '#F0EBE6',
    bgInput: 'rgba(0, 0, 0, 0.04)',
    bgHover: 'rgba(0, 0, 0, 0.03)',
    bgActive: 'rgba(167, 122, 84, 0.06)',
    text: '#1B1715',
    textPrimary: '#1B1715',
    textSecondary: '#4A3E38',
    textMuted: '#8B7B70',
    textLight: '#2D2520',
    textInverse: '#FFFDF9',
    accent: '#A77A54',
    accentHover: '#C79A72',
    accentLight: '#D4B49A',
    accentGlow: 'rgba(167, 122, 84, 0.10)',
    border: 'rgba(0, 0, 0, 0.08)',
    borderLight: 'rgba(0, 0, 0, 0.04)',
    borderCard: 'rgba(0, 0, 0, 0.06)',
    shadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
    shadowMd: '0 8px 32px rgba(0, 0, 0, 0.06)',
    shadowLg: '0 16px 56px rgba(0, 0, 0, 0.08)',
    shadowXl: '0 24px 80px rgba(0, 0, 0, 0.10)',
    shadowGlow: '0 0 40px rgba(167, 122, 84, 0.04)',
    online: '#49C16D',
    offline: '#B0A89E',
    error: '#C84A4A',
    bubbleOwn: 'var(--accent)',
    bubbleOther: 'var(--bg-secondary)'
  }
};

let currentTheme = localStorage.getItem('theme') || 'dark';

export function getTheme() {
  return currentTheme;
}

export function getThemeColors() {
  return THEMES[currentTheme] || THEMES.dark;
}

export function setTheme(theme) {
  if (THEMES[theme]) {
    currentTheme = theme;
    localStorage.setItem('theme', theme);
    applyTheme(theme);
    window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme } }));
  }
}

export function toggleTheme() {
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
}

export function applyTheme(theme) {
  const colors = THEMES[theme] || THEMES.dark;
  const root = document.documentElement;
  
  // حذف کلاس‌های قبلی
  document.body.classList.remove('theme-dark', 'theme-light');
  
  // اضافه کردن کلاس جدید
  if (theme === 'light') {
    document.body.classList.add('theme-light');
  } else {
    document.body.classList.add('theme-dark');
  }
  
  // تنظیم متغیرهای CSS
  root.style.setProperty('--bg-primary', colors.bg);
  root.style.setProperty('--bg-secondary', colors.bgSecondary);
  root.style.setProperty('--bg-card', colors.bgCard);
  root.style.setProperty('--bg-surface', colors.bgSurface);
  root.style.setProperty('--bg-input', colors.bgInput);
  root.style.setProperty('--bg-hover', colors.bgHover);
  root.style.setProperty('--bg-active', colors.bgActive);
  
  root.style.setProperty('--text-primary', colors.textPrimary);
  root.style.setProperty('--text-secondary', colors.textSecondary);
  root.style.setProperty('--text-muted', colors.textMuted);
  root.style.setProperty('--text-light', colors.textLight);
  root.style.setProperty('--text-inverse', colors.textInverse);
  
  root.style.setProperty('--accent', colors.accent);
  root.style.setProperty('--accent-hover', colors.accentHover);
  root.style.setProperty('--accent-light', colors.accentLight);
  root.style.setProperty('--accent-glow', colors.accentGlow);
  
  root.style.setProperty('--border-color', colors.border);
  root.style.setProperty('--border-light', colors.borderLight);
  root.style.setProperty('--border-card', colors.borderCard);
  
  root.style.setProperty('--shadow-sm', colors.shadow);
  root.style.setProperty('--shadow-md', colors.shadowMd);
  root.style.setProperty('--shadow-lg', colors.shadowLg);
  root.style.setProperty('--shadow-xl', colors.shadowXl);
  root.style.setProperty('--shadow-glow', colors.shadowGlow);
  
  root.style.setProperty('--online', colors.online);
  root.style.setProperty('--offline', colors.offline);
  root.style.setProperty('--error', colors.error);
  
  root.style.setProperty('--bubble-own', colors.bubbleOwn);
  root.style.setProperty('--bubble-other', colors.bubbleOther);
  
  // تنظیم پس‌زمینه و رنگ بدنه
  document.body.style.background = colors.bg;
  document.body.style.color = colors.text;
  
  // ذخیره در localStorage
  localStorage.setItem('theme', theme);
  
  console.log(`🎨 Theme applied: ${theme}`);
}

export function initTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  if (THEMES[saved]) {
    currentTheme = saved;
  } else {
    currentTheme = 'dark';
  }
  applyTheme(currentTheme);
}

export function getAvailableThemes() {
  return ['dark', 'light'];
}