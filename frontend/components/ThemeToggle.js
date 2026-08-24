import { useEffect, useState } from 'react';

// Reads/writes the `dark` class on <html>, persisted to localStorage.
// _document.js applies the saved theme before hydration to avoid a flash.
export default function ThemeToggle({ className = '' }) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  if (!mounted) {
    return <span className={`w-9 h-9 inline-block ${className}`} />;
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`grid place-items-center w-9 h-9 rounded-lg border border-ink-200 dark:border-ink-700 text-ink-600 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-800 transition-colors ${className}`}
    >
      <span className="text-base leading-none">{isDark ? '☀️' : '🌙'}</span>
    </button>
  );
}
