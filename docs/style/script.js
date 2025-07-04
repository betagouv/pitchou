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

  codeEl.appendChild(toast);


  toast.classList.add('show');

 
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 1200);
}
