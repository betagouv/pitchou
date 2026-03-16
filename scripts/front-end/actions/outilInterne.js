
/**
 * Lance le téléchargement du fichier avec les données AARRI pour une personne en particulier à partir de son mail.
 * @param {string} email 
 * @returns {Promise<void>}
 */
export async function téléchargerDonnéesPourPersonne(email) {
    await fetch('/outil-interne/donnees-pour-personne', 
        {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        }
    )
}