const THEMES = {
  dark: {
    bg: '#0d0806',
    cardBg: 'rgba(30, 18, 13, 0.92)',
    text: '#f0e0d0',
    textMuted: '#8a6b55',
    gold: '#d4a050',
    goldDark: '#b8833a',
    border: 'rgba(139, 90, 60, 0.25)',
    inputBg: 'rgba(255, 255, 255, 0.04)',
    shadow: '0 4px 30px rgba(0,0,0,0.6)',
    bubbleOwn: 'linear-gradient(135deg, #b8833a, #d4a050)',
    bubbleOther: '#4a3228'
  },
  light: {
    bg: '#f5ede6',
    cardBg: 'rgba(255, 248, 240, 0.92)',
    text: '#3e2723',
    textMuted: '#8a6b55',
    gold: '#b8833a',
    goldDark: '#8d6e63',
    border: 'rgba(139, 90, 60, 0.15)',
    inputBg: 'rgba(255, 255, 255, 0.6)',
    shadow: '0 4px 30px rgba(62, 39, 35, 0.12)',
    bubbleOwn: 'linear-gradient(135deg, #d4a050, #e8c080)',
    bubbleOther: '#e8ddd0'
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
  
  root.style.setProperty('--bg-primary', colors.bg);
  root.style.setProperty('--bg-card', colors.cardBg);
  root.style.setProperty('--text-primary', colors.text);
  root.style.setProperty('--text-muted', colors.textMuted);
  root.style.setProperty('--gold', colors.gold);
  root.style.setProperty('--gold-dark', colors.goldDark);
  root.style.setProperty('--border-color', colors.border);
  root.style.setProperty('--input-bg', colors.inputBg);
  root.style.setProperty('--shadow', colors.shadow);
  root.style.setProperty('--bubble-own', colors.bubbleOwn);
  root.style.setProperty('--bubble-other', colors.bubbleOther);
  
  document.body.style.background = colors.bg;
  document.body.style.color = colors.text;
  
  localStorage.setItem('theme', theme);
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