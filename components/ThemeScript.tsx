// Inlined script to prevent flash of unstyled content for theme
export function ThemeScript() {
  const script = `
    (function() {
      try {
        var theme = localStorage.getItem('et_theme') || 'dark';
        if (theme === 'system') {
          theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        document.documentElement.classList.toggle('light', theme === 'light');
      } catch(e) {}
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
