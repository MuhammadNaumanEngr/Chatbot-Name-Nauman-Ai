// Theme management utility for CSS custom properties

const themes = {
  dark: {
    '--bg-primary': '#111827',
    '--bg-secondary': '#1f2937',
    '--bg-tertiary': '#374151',
    '--text-primary': '#f9fafb',
    '--text-secondary': '#9ca3af',
    '--accent': '#6366f1',
    '--accent-hover': '#4f46e5',
    '--border-color': '#374151'
  },
  light: {
    '--bg-primary': '#ffffff',
    '--bg-secondary': '#f9fafb',
    '--bg-tertiary': '#f3f4f6',
    '--text-primary': '#111827',
    '--text-secondary': '#6b7280',
    '--accent': '#6366f1',
    '--accent-hover': '#4f46e5',
    '--border-color': '#e5e7eb'
  },
  midnight: {
    '--bg-primary': '#0f172a',
    '--bg-secondary': '#1e293b',
    '--bg-tertiary': '#334155',
    '--text-primary': '#f1f5f9',
    '--text-secondary': '#94a3b8',
    '--accent': '#38bdf8',
    '--accent-hover': '#0ea5e9',
    '--border-color': '#334155'
  },
  forest: {
    '--bg-primary': '#0f1f14',
    '--bg-secondary': '#1a2e1f',
    '--bg-tertiary': '#2d4a35',
    '--text-primary': '#ecfdf5',
    '--text-secondary': '#86efac',
    '--accent': '#22c55e',
    '--accent-hover': '#16a34a',
    '--border-color': '#2d4a35'
  },
  sunset: {
    '--bg-primary': '#1c1410',
    '--bg-secondary': '#2d1f17',
    '--bg-tertiary': '#3d2c22',
    '--text-primary': '#fff7ed',
    '--text-secondary': '#fdba74',
    '--accent': '#f97316',
    '--accent-hover': '#ea580c',
    '--border-color': '#3d2c22'
  }
};

const accentPresets = [
  { name: 'indigo', color: '#6366f1' },
  { name: 'violet', color: '#8b5cf6' },
  { name: 'pink', color: '#ec4899' },
  { name: 'rose', color: '#f43f5e' },
  { name: 'orange', color: '#f97316' },
  { name: 'amber', color: '#f59e0b' },
  { name: 'yellow', color: '#eab308' },
  { name: 'green', color: '#22c55e' },
  { name: 'teal', color: '#14b8a6' },
  { name: 'cyan', color: '#06b6d4' }
];

const fontSizes = {
  compact: '13px',
  default: '15px',
  comfortable: '17px'
};

const codeThemes = {
  'one-dark': 'atomOneDark',
  'github-dark': 'githubDark',
  'dracula': 'dracula',
  'solarized-dark': 'solarizedDark'
};

class ThemeManager {
  constructor() {
    this.currentTheme = localStorage.getItem('theme') || 'dark';
    this.accentColor = localStorage.getItem('accentColor') || '#6366f1';
    this.fontSize = localStorage.getItem('fontSize') || 'default';
    this.codeTheme = localStorage.getItem('codeTheme') || 'one-dark';
    this.messageDensity = localStorage.getItem('messageDensity') || 'comfortable';
  }

  init() {
    this.applyTheme(this.currentTheme);
    this.applyAccent(this.accentColor);
    this.applyFontSize(this.fontSize);
  }

  applyTheme(themeName) {
    const theme = themes[themeName];
    if (!theme) return;

    this.currentTheme = themeName;
    localStorage.setItem('theme', themeName);

    // Apply to data-theme attribute on HTML element
    document.documentElement.setAttribute('data-theme', themeName);

    Object.entries(theme).forEach(([prop, value]) => {
      document.documentElement.style.setProperty(prop, value);
    });
  }

  applyAccent(color) {
    this.accentColor = color;
    localStorage.setItem('accentColor', color);
    document.documentElement.style.setProperty('--accent', color);

    // Calculate hover color (darker version)
    const hoverColor = this.darkenColor(color, 15);
    document.documentElement.style.setProperty('--accent-hover', hoverColor);
  }

  applyFontSize(size) {
    this.fontSize = size;
    localStorage.setItem('fontSize', size);
    document.documentElement.style.setProperty('--font-size-base', fontSizes[size] || '15px');
  }

  applyCodeTheme(themeName) {
    this.codeTheme = themeName;
    localStorage.setItem('codeTheme', themeName);
  }

  applyMessageDensity(density) {
    this.messageDensity = density;
    localStorage.setItem('messageDensity', density);
  }

  darkenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max((num >> 16) - amt, 0);
    const G = Math.max((num >> 8 & 0x00FF) - amt, 0);
    const B = Math.max((num & 0x0000FF) - amt, 0);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }

  getTheme() { return this.currentTheme; }
  getAccent() { return this.accentColor; }
  getFontSize() { return this.fontSize; }
  getCodeTheme() { return this.codeTheme; }
  getMessageDensity() { return this.messageDensity; }
}

export const themeManager = new ThemeManager();
export { themes, accentPresets, fontSizes, codeThemes };
export default themeManager;