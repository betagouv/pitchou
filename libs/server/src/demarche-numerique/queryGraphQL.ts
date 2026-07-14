// this script gets the dossiers of démarche 88444

import ky from "ky";

const ENDPOINT = "https://www.demarches-simplifiees.fr/api/v2/graphql";

const TIMEOUT_DELAY = 40 * 1000; // milliseconds

export default async function (
  token: string,
  query: string,
  variables: Record<string, any>,
): Promise<any> {
  //console.log('graphQL query', query, variables)

  let response: { errors: any; data: unknown };
  try {
    response = await ky
      .post(ENDPOINT, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "User-Agent": "https://github.com/betagouv/pitchou",
        },
        timeout: TIMEOUT_DELAY,
        json: {
          query,
          variables,
        },
      })
      .json();

    if (response.errors) {
      throw new Error(`Erreur graphQL ${JSON.stringify(response.errors, null, 2)}`);
    }

    return response.data;
  } catch (err) {
    // @ts-ignore
    if (err.name === "TimeoutError") {
      const message = `\nTimeout d'une requête HTTP vers ${ENDPOINT} après ${TIMEOUT_DELAY / 1000} secondes\n\n`;
      const erreurSimple = new Error(message);
      console.error(message);
      throw erreurSimple;
    } else {
      console.error("HTTP error", err);
    }

    throw err;
  }
}
