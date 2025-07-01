document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('code').forEach(code => {
    code.addEventListener('click', function () {
      console.log('Clicked:', code.textContent);
      // Copy to clipboard
      navigator.clipboard
        .writeText(code.textContent)
        .then(() => {
          console.log('Copied to clipboard!');
        })
        .catch(err => {
          console.error('Failed to copy:', err);
        });
    });
  });
});
