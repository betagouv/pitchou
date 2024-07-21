# Test manuel du login/logout

## Fonctionnement

Dans les grandes lignes, on implémente la sécurité avec des [*capability urls*](https://www.w3.org/TR/capability-urls/)

Un email est envoyé avec une capability url pour se connecter. Cet email contient un **secret**

## Test manuel

1) À partir de rien

- Vérifier que la page de login par email s'affiche
- Vérifier qu'on reçoit bien un email pour une adresse valide
- Vérifier qu'on ne reçoit pas d'email pour une adresse invalide
- Vérifier que l'email affiche des données secrètes correctement (tableau de suivi)
    - Vérifier que l'URL est nettoyée du secret
    - et que celui-ci est dans le localStorage


2) À partir d'une page avec des données privées
- Vérifier que le refresh affiche toujours la même page

- Vérifier que le clic sur "se déconnecter" supprime le token en localStorage et redirige vers la page de login

3) Avec un token en localStorage qui est devenu invalide

- Vérifier qu'un refresh déconnecte (supprime le token du localStorage + redirige vers la page d'accueil)



