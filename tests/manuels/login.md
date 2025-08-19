# Test manuel du login

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

---

- **Affichage de la page de login**  

  Étapes :  
  1. Accéder à la page de connexion par email.  

  Résultat attendu :  
  - La page s’affiche correctement.

- **Envoi d’email pour une adresse valide**  

  Étapes :  
  1. Entrer une adresse email valide.  
  2. Valider le formulaire.  

  Résultat attendu :  
  - Réception d’un email de connexion.

- **Pas d’envoi d’email pour une adresse invalide**  

  Étapes :  
  1. Entrer une adresse email invalide.  
  2. Valider le formulaire.  

  Résultat attendu :  
  - message d'erreur

#### 2) À partir d’une page avec des données privées

- **Affichage correct des données secrètes dans l’email**  

  Étapes :  
  1. Ouvrir l’email reçu.  
  2. Vérifier le contenu du tableau de suivi et la présence des données secrètes.  
  3. Vérifier que l’URL a été nettoyée du secret.  
  4. Vérifier que le secret est bien stocké dans le `localStorage`.  

  Résultat attendu :  
  - Données affichées correctement, URL nettoyée, secret en `localStorage`.


- **Persistance après rafraîchissement**  

  Étapes :  
  1. Depuis une page contenant des données privées, effectuer un rafraîchissement de la page.  

  Résultat attendu :  
  - La même page s’affiche toujours.

- **Déconnexion**  

  Étapes :  
  1. Cliquer sur *Se déconnecter*.  
  2. Vérifier que le token est supprimé du `localStorage`.  
  3. Vérifier la redirection vers la page de connexion.  

  Résultat attendu :  
  - Déconnexion réussie et retour à la page de login.

  



---

#### 3) Avec un token invalide dans le `localStorage`

- **Déconnexion automatique**  

  Étapes :  
  1. Avoir un token invalide stocké dans le `localStorage`.  
  2. Rafraîchir la page.  

  Résultat attendu :  
  - Token supprimé du `localStorage`.  
  - Redirection vers la page d’accueil.