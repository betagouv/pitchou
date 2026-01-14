export type ÉvènementMétrique =
	| {
			// Cliquer sur un lien de connexion
			type: 'seConnecter'
	  }
	| {
			// Appuyer sur un bouton pour suivre un dossier
			type: 'suivreUnDossier'
			détails: {
				dossierId: number
			}
	  }
	| {
			type: 'rechercherDesDossiers'
	  }
	| {
			// Rejoindre un groupe instructrice sur Démarche Numérique pour la première fois pour une démarche donnée
			type: 'rejoindreGroupeInstructricePourLaPremièreFois'
			détails: {
				numéro_démarche: number
			}
	  };
