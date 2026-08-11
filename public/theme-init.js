(function () {
  try {
    var t = localStorage.getItem('claugas-theme');
    if (!t) {
      t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {
    // localStorage/matchMedia unavailable — fall back to light theme, no crash
  }
})();
