document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('code').forEach(code => {
    code.addEventListener('click', function () {

      navigator.clipboard
        .writeText(code.textContent)
        .then(() => {
            faireApparaîtreToastCopié()
        })
        .catch(err => {
          console.error('Une erreur est survenue lors de la copie : ', err);
        });
    });
  });
});

function faireApparaîtreToastCopié(event) {
  const codeEl = event.currentTarget;


  const toast = document.createElement('p');
  toast.className = 'copy-toast';
  toast.textContent = 'Copié !';

  // Positionner le toast : on le place en absolute, relatif à la balise code
  // Donc on doit rendre la balise code position: relative
  codeEl.style.position = 'relative';


  codeEl.appendChild(toast);


  toast.classList.add('show');

 
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
      codeEl.style.position = '';
    }, 300);
  }, 1200);
}
