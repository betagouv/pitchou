<script lang="ts">
  import { endOfYear, getYear, isAfter, isBefore, startOfYear, sub } from "date-fns";
  /*
        Notes pour la prochaine itération

        Résoudre les issues suivantes si ça n'a pas encore été fait :
        - https://github.com/betagouv/pitchou/issues/157

    */

  import Squelette from "../Squelette.svelte";
  import TagPhase from "../TagPhase.svelte";

  import type { DossierRésumé } from "@pitchou/types/API_Pitchou.ts";

  type Props = {
    dossiers?: DossierRésumé[];
    email?: string | undefined;
  };

  let { dossiers = [], email = undefined }: Props = $props();

  const aujourdhui = new Date();

  function trouverDossiersEnContrôle(dossiers: DossierRésumé[]) {
    return dossiers.filter((dossier) => dossier.phase === "Contrôle");
  }

  let dossierEnPhaseContrôle = $derived(trouverDossiersEnContrôle(dossiers));

  function trouverDossiersAvecAPPrisDepuis(
    dossiers: DossierRésumé[],
    dateDebut: Date,
    dateFin: Date | undefined = aujourdhui,
  ) {
    return dossiers.filter((d) => {
      return d.décisionsAdministratives?.find(
        (décision) =>
          décision.date_signature !== null &&
          isAfter(décision.date_signature, dateDebut) &&
          isBefore(décision.date_signature, dateFin),
      );
    });
  }

  let dossierAvecAPDepuisAnneeEnCours = $derived(
    trouverDossiersAvecAPPrisDepuis(dossierEnPhaseContrôle, startOfYear(aujourdhui)),
  );

  let annéeDernière = $derived(sub(aujourdhui, { years: 1 }));

  let dossierAvecAPAnneePrecedente = $derived(
    trouverDossiersAvecAPPrisDepuis(
      dossierEnPhaseContrôle,
      startOfYear(annéeDernière),
      endOfYear(annéeDernière),
    ),
  );

  function trouverDossiersEnAccompagnement(dossiers: DossierRésumé[]) {
    return dossiers.filter((dossier) => dossier.phase === "Accompagnement amont");
  }

  let dossiersEnAccompagnement = $derived(trouverDossiersEnAccompagnement(dossiers));

  function trouverDossiersDeMoinsDe3Ans(dossiers: DossierRésumé[]) {
    return dossiers.filter((d) => isBefore(sub(aujourdhui, { years: 3 }), d.date_dépôt));
  }

  let dossiersEnAccompagnementDeMoinsDe3Ans = $derived(
    trouverDossiersDeMoinsDe3Ans(dossiersEnAccompagnement),
  );

  function trouverDossiersNonScientifiques(dossiers: DossierRésumé[]) {
    return dossiers.filter((d) => d.activité_principale !== "Demande à caractère scientifique");
  }

  let dossiersNonScientifiquesEnAccompagnementDeMoinsDe3Ans = $derived(
    trouverDossiersNonScientifiques(dossiersEnAccompagnementDeMoinsDe3Ans),
  );
</script>

<Squelette nav={false} {email}>
  <div class="fr-grid-row fr-mt-6w fr-grid-row--center">
    <article class="fr-col">
      <header class="fr-mb-2w">
        <h1>Des stats pour les chefs DREAL N-A</h1>
      </header>

      <section>
        <h2 class="fr-mt-2w">Nombre de dossiers&nbsp;: {dossiers.length} dossiers affichés</h2>
      </section>

      <section>
        <h2>Dossiers avec AP</h2>
        <ul>
          <li>
            <strong>
              Nombre de dossiers en phase <TagPhase phase="Contrôle" taille="SM"></TagPhase> (avec AP)
            </strong>&nbsp;: {dossierEnPhaseContrôle.length}
          </li>
          <li>
            <strong>
              Nombre de dossiers en phase <TagPhase phase="Contrôle" taille="SM"></TagPhase>
              avec AP pris en {getYear(aujourdhui)}
            </strong>&nbsp;: {dossierAvecAPDepuisAnneeEnCours.length}
          </li>
          <li>
            <strong>
              Nombre de dossiers en phase <TagPhase phase="Contrôle" taille="SM"></TagPhase>
              avec AP pris en {getYear(annéeDernière)}
            </strong>&nbsp;: {dossierAvecAPAnneePrecedente.length}
          </li>
        </ul>
      </section>

      <section>
        <h2>Accompagnement</h2>
        <ul>
          <li>
            <strong>
              Nombre de dossiers actuellement en phase <TagPhase
                phase="Accompagnement amont"
                taille="SM"
              ></TagPhase>
            </strong>&nbsp;: {dossiersEnAccompagnement.length}
          </li>
          <li>
            <strong>
              Nombre de dossiers actuellement en phase <TagPhase
                phase="Accompagnement amont"
                taille="SM"
              ></TagPhase>
              qui ont moins de 3 ans
            </strong>&nbsp;: {dossiersEnAccompagnementDeMoinsDe3Ans.length}
          </li>
          <li>
            <strong>
              Nombre de dossiers non-scientifiques actuellement en phase <TagPhase
                phase="Accompagnement amont"
                taille="SM"
              ></TagPhase>
              qui ont moins de 3 ans
            </strong>&nbsp;: {dossiersNonScientifiquesEnAccompagnementDeMoinsDe3Ans.length}
          </li>
        </ul>
      </section>
    </article>
  </div>
</Squelette>

<style lang="scss">
</style>
