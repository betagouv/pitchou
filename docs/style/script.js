document.addEventListener('DOMContentLoaded', function () {
  // Gestion des codes inline
  document.querySelectorAll('code:not(pre code)').forEach(code => {
    code.addEventListener('click', function (event) {
      copyToClipboard(code.textContent, code);
    });
  });

  // Gestion des blocs de code
  document.querySelectorAll('pre').forEach(pre => {
    pre.addEventListener('click', function (event) {
      const codeElement = pre.querySelector('code');
      if (codeElement) {
        copyToClipboard(codeElement.textContent, pre);
      }
    });
  });
});

function copyToClipboard(text, element) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      // Effet visuel de succès
      element.classList.add('copied');
      
      // Feedback sonore subtil (optionnel)
      if (window.navigator.vibrate) {
        window.navigator.vibrate(50); // Vibration courte sur mobile
      }
      
      // Retour à l'état normal après 2 secondes
      setTimeout(() => {
        element.classList.remove('copied');
      }, 2000);
    })
    .catch(err => {
      console.error('Erreur lors de la copie :', err);
      
      // Feedback d'erreur visuel
      element.style.backgroundColor = '#f8d7da';
      element.style.borderColor = '#f5c6cb';
      element.style.color = '#721c24';
      
      setTimeout(() => {
        element.style.backgroundColor = '';
        element.style.borderColor = '';
        element.style.color = '';
      }, 2000);
    });
}
