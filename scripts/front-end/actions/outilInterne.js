
/**
 * Lance le téléchargement du fichier avec les données AARRI pour une personne en particulier à partir de son mail.
 * @param {string} email 
 * @returns {Promise<Blob>}
 */
export async function téléchargerDonnéesPourPersonne(email) {
    const url = '/outil-interne/donnees-pour-personne'

    try {
        const response = await fetch(url, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        })

        if (!response.ok) {
            throw new Error(`Response status: ${response.status}, Response status text: ${response.statusText}`);
        }

        return response.blob()

    } catch (error) {
        // @ts-ignore
        console.error(error.message);
        // @ts-ignore
        throw new Error(error.message)
    }
}