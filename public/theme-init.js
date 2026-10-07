/* global window, document */
(() => {
  try {
    if (window.localStorage.getItem('sandbox-theme') === 'red') {
      document.documentElement.setAttribute('data-theme', 'red');
    }
  } catch {
    document.documentElement.removeAttribute('data-theme');
  }
})();
