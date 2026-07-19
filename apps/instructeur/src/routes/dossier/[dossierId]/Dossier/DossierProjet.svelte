<script lang="ts">
  import DownloadButton from "$lib/components/DownloadButton.svelte";
  import CartographieProjet from "$lib/components/CartographieProjet.svelte";
  import EspecesProtegeesGroupedByImpact from "$lib/components/EspecesProtegeesGroupedByImpact.svelte";
  import { formatDateAbsolute, formatDateRelative } from "$lib/dossier/displayDossier.ts";
  import { byteFormat } from "@pitchou/common/typeFormat.ts";
  import { loadActivitesMethodesMoyensDePoursuite } from "$lib/especes/activitesMethodesMoyensDePoursuite.ts";
  import Loader from "$lib/components/Loader.svelte";
  import { originDemarcheNumerique } from "@pitchou/common/constants.ts";
  import { sendEvenement } from "$lib/shared/aarri.ts";

  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  import type { DescriptionMenacesEspeces } from "@pitchou/types/especes.d.ts";

  type Props = {
    dossier: DossierFull;
    especesImpactees: Promise<DescriptionMenacesEspeces> | undefined;
  };

  let { dossier, especesImpactees }: Props = $props();

  const numdos = $derived(dossier.demarche_numerique_number);
  const demarcheNumber = $derived(dossier.demarche_number);

  /**
   * Computes the number of espèces CNPN
   * and the number of espèces ministérielles
   * in the list of espèces impacted by this project
   */
  function getNumberEspecesMinisterielleCNPN(_especesImpactees: DescriptionMenacesEspeces): {
    numberEspecesCNPN: number;
    numberEspecesMinisterielles: number;
  } {
    const allEspecesImpactees = [
      ...(_especesImpactees["faune non-oiseau"] ?? []),
      ...(_especesImpactees["flore"] ?? []),
      ...(_especesImpactees["oiseau"] ?? []),
    ];

    const numbers = allEspecesImpactees.reduce(
      (acc, { espèce: espece }) => {
        if (espece.espèceCNPN) {
          acc["numberEspecesCNPN"] += 1;
        }
        if (espece.espèceMinistérielle) {
          acc["numberEspecesMinisterielles"] += 1;
        }
        return acc;
      },
      { numberEspecesCNPN: 0, numberEspecesMinisterielles: 0 },
    );
    return numbers;
  }

  async function makeFileContentBlob() {
    const especes = dossier.especesImpactees;
    if (!especes) {
      throw new Error("Aucun fichier espèces impactées à télécharger");
    }

    sendEvenement({
      type: "téléchargerListeÉspècesImpactées",
      détails: { dossierId: dossier.id },
    });

    const response = await fetch(especes.url);
    return response.blob();
  }

  function makeFilename() {
    return dossier.especesImpactees?.name || "fichier";
  }

  const cartographieProjet = $derived(dossier.projet_map);

  function makeCartographieBlob() {
    const fc = dossier.projet_map;
    if (!fc) {
      throw new Error("Aucune cartographie du projet à télécharger");
    }

    sendEvenement({
      type: "téléchargerCartographieProjet",
      détails: { dossierId: dossier.id },
    });

    return new Blob([JSON.stringify(fc)], { type: "application/geo+json" });
  }

  function makeCartographieFilename() {
    return `cartographie-${dossier.id}.geojson`;
  }

  const referentielsPromise = loadActivitesMethodesMoyensDePoursuite();

  // @ts-ignore
  let scientifiquesIntervenants: { nom_complet: string; qualification: string }[] | undefined =
    $derived(dossier.scientifique_intervenants);

  // @ts-ignore
  let scientifiqueFinaliteDemande: string[] | undefined = $derived(
    dossier.scientifique_demande_purposes,
  );

  function truncateNomFichier(filename: string | null, maxLength = 43, ellipsis = "(…)") {
    if (!filename) {
      return "(fichier sans nom)";
    }

    if (filename.length <= maxLength) {
      return filename;
    }

    const lastDotIndex = filename.lastIndexOf(".");

    const extension = filename.substring(lastDotIndex);
    const nameWithoutExt = filename.substring(0, lastDotIndex);

    const availableLength = maxLength - extension.length - ellipsis.length;

    return nameWithoutExt.substring(0, availableLength) + ellipsis + extension;
  }
</script>

<section class="row">
  <section class="column">
    <h2>Informations du projet</h2>
    <p>
      <strong>Dossier n°&nbsp;:</strong>
      {dossier.demarche_numerique_number ?? "non renseigné"}
    </p>
    <p>
      <strong>Un état des lieux écologique complet a-t-il été réalisé ?&nbsp;:</strong>
      {#if typeof dossier.ecological_inventory_completed === "boolean"}
        {dossier.ecological_inventory_completed ? "Oui" : "Non"}
      {:else}
        Non renseigné
      {/if}
    </p>

    <p>
      <strong
        >Des spécimens ou habitats d'espèces protégées sont-ils présents dans l'aire d'influence du
        projet ?&nbsp;:</strong
      >
      {#if typeof dossier.especes_present_in_influence_area === "boolean"}
        {dossier.especes_present_in_influence_area ? "Oui" : "Non"}
      {:else}
        Non renseigné
      {/if}
    </p>

    <p>
      <strong
        >Après mises en oeuvre de mesures d'évitement et de réduction, un risque suffisamment
        caractérisé pour les espèces protégées demeure-t-il ?&nbsp;:</strong
      >
      {#if typeof dossier.risk_despite_erc_mesures === "boolean"}
        {dossier.risk_despite_erc_mesures ? "Oui" : "Non"}
      {:else}
        Non renseigné
      {/if}
    </p>

    <p>
      <strong>Description&nbsp;:</strong>
      {dossier.description && dossier.description.length >= 1
        ? dossier.description
        : "Non renseignée"}
    </p>

    <p>
      <strong
        >Synthèse des éléments démontrant qu'il n'existe aucune alternative au projet&nbsp;:</strong
      >
      {dossier.no_other_satisfactory_solution_justification &&
      dossier.no_other_satisfactory_solution_justification.length >= 1
        ? dossier.no_other_satisfactory_solution_justification
        : `Non renseignée`}
    </p>

    <p>
      <strong>Motif de la dérogation&nbsp;:</strong>
      {dossier.motif_derogation ?? `Non renseigné`}
    </p>

    <p>
      <strong>Synthèse des éléments justifiant le motif de la dérogation&nbsp;:</strong>
      {dossier.motif_derogation_justification && dossier.motif_derogation_justification.length >= 1
        ? dossier.motif_derogation_justification
        : `Non renseignée`}
    </p>

    <p>
      <strong>Date de début d'intervention ou des travaux&nbsp;:</strong>
      {#if dossier.intervention_start_date}
        <time datetime={dossier.intervention_start_date.toISOString()}>
          {formatDateRelative(dossier.intervention_start_date)}
        </time>
      {:else}
        Non renseignée
      {/if}
    </p>

    <p>
      <strong>Date de fin d'intervention ou des travaux&nbsp;:</strong>
      {#if dossier.intervention_end_date}
        <time datetime={new Date(dossier.intervention_end_date).toISOString()}>
          {formatDateRelative(dossier.intervention_end_date)}
        </time>
      {:else}
        Non renseignée
      {/if}
    </p>

    <p>
      <strong>Date de mise en service de l'exploitation&nbsp;:</strong>
      {#if dossier.commissioning_date}
        <time datetime={new Date(dossier.commissioning_date).toISOString()}>
          {formatDateRelative(dossier.commissioning_date)}
        </time>
      {:else}
        Non renseignée
      {/if}
    </p>

    <p>
      <strong>Durée de la dérogation&nbsp;:</strong>
      {dossier.intervention_duration ? dossier.intervention_duration + " années" : "Non renseignée"}
    </p>
    <div class="container-title-especes-impactees">
      <h2>Espèces impactées</h2>
      {#if dossier.especesImpactees}
        <!-- In Svelte, a child component does not have access to the style classes defined in the parent component in which it is called. So we use an inline style. -->
        {@const styleDownloadButton = "width: 15rem;"}
        <DownloadButton
          {makeFileContentBlob}
          {makeFilename}
          style={styleDownloadButton}
          classname="fr-btn fr-btn--secondary"
          label="Télécharger le fichier des espèces impactées"
        />
      {/if}
    </div>
    {#if dossier.especesImpactees}
      {#if especesImpactees}
        {#await Promise.all([especesImpactees, referentielsPromise])}
          <Loader></Loader>
        {:then [especesImpactees, { identifiantPitchouVersActivitéEtImpactsQuantifiés: identifiantPitchouVersActiviteEtImpactsQuantifies }]}
          {@const { numberEspecesCNPN, numberEspecesMinisterielles } =
            getNumberEspecesMinisterielleCNPN(especesImpactees)}
          <p class="fr-badge fr-badge--blue-ecume">
            {numberEspecesCNPN}
            {numberEspecesCNPN > 1 ? "espèces" : "espèce"} CNPN
          </p>
          <p class="fr-badge fr-badge--blue-ecume">
            {numberEspecesMinisterielles}
            {numberEspecesCNPN > 1 ? "espèces" : "espèce"} Ministère
          </p>
          <EspecesProtegeesGroupedByImpact
            espècesImpactées={especesImpactees}
            identifiantPitchouVersActivitéEtImpactsQuantifiés={identifiantPitchouVersActiviteEtImpactsQuantifies}
          />
        {/await}
      {/if}
    {:else}
      <p>Aucune données sur les espèces impactées n'a été fournie par le pétitionnaire</p>
    {/if}

    {#if cartographieProjet && cartographieProjet.features.length >= 1}
      <div class="container-title-cartographie">
        <h2>Cartographie du projet</h2>
        <!-- Inline style because a child component does not access the parent's classes -->
        <DownloadButton
          makeFileContentBlob={makeCartographieBlob}
          makeFilename={makeCartographieFilename}
          style="width: 15rem;"
          classname="fr-btn fr-btn--secondary"
          label="Télécharger la cartographie (.geojson)"
        />
      </div>
      <p>
        Cartographie du projet&nbsp;: {cartographieProjet.features.length}
        {cartographieProjet.features.length > 1 ? "zones tracées" : "zone tracée"}
      </p>
      <CartographieProjet featureCollection={cartographieProjet} />
    {/if}

    {#if dossier.scientifique_demande_type}
      <h2>Données scientifiques</h2>
      <h3>Type de demande</h3>
      <ul>
        {#each dossier.scientifique_demande_type as typeDemande}
          <li>{typeDemande}</li>
        {/each}
      </ul>

      <h3>Programme de suivi antérieur</h3>
      <p>
        {#if dossier.scientifique_previous_assessment === null}
          Non renseigné
        {:else}
          {dossier.scientifique_previous_assessment ? "Oui" : "Non"}
        {/if}
      </p>

      <h3>Finalité de la demande</h3>
      {#if Array.isArray(scientifiqueFinaliteDemande) && scientifiqueFinaliteDemande.length >= 1}
        <ul>
          {#each scientifiqueFinaliteDemande as finalite}
            <li>{finalite}</li>
          {/each}
        </ul>
      {:else}
        Non renseigné
      {/if}

      <h3>Protocole de suivi</h3>
      <p>
        {dossier.scientifique_suivi_protocol_description ?? "Non renseigné"}
      </p>

      <h3>Méthodes</h3>

      <p>
        <strong> Modes de capture&nbsp;:</strong>
        {dossier.scientifique_capture_mode && dossier.scientifique_capture_mode.length >= 1
          ? dossier.scientifique_capture_mode.join(", ")
          : "Non renseignées"}
      </p>
      <p>
        <strong> Source lumineuse&nbsp;:</strong>
        {dossier.scientifique_light_source_conditions ?? "Non renseignée"}
      </p>
      <p>
        <strong> Marquage&nbsp;:</strong>
        {dossier.scientifique_marking_conditions ?? "Non renseigné"}
      </p>
      <p>
        <strong> Transport&nbsp;:</strong>
        {dossier.scientifique_transport_conditions ?? "Non renseigné"}
      </p>

      <h3>Périmètre et intervenant.e.s</h3>
      <p>
        <strong> Périmètre&nbsp;: </strong>{dossier.scientifique_intervention_perimeter ??
          "Non renseigné"}
      </p>
      <p>
        <strong> Intervenant.e.s&nbsp;: </strong>
        {#if scientifiquesIntervenants && scientifiquesIntervenants.length >= 1}
          {#each scientifiquesIntervenants as { nom_complet, qualification }}
            {nom_complet} - {qualification}
          {/each}
        {:else}
          Non renseigné.e.s
        {/if}
      </p>
      <p>
        <strong> Précisions&nbsp;: </strong>{dossier.scientifique_other_intervenants_details ??
          "Non renseignées"}
      </p>
    {/if}
  </section>

  <section class="column">
    <h2>{dossier.piecesJointesPetitionnaires.length} pièces jointes</h2>
    {#if dossier.piecesJointesPetitionnaires.length === 0}
      (aucune pièce jointe n'a été déposée par le pétitionnaire)
    {:else}
      <ul class="pieces-jointes-petitionnaire">
        {#each dossier.piecesJointesPetitionnaires as { url, demarche_numerique_created_at, name, media_type, size }}
          <li>
            <a class="fr-link fr-link--download" href={url} title={name} data-sveltekit-reload>
              <!--
                            We truncate the name because if it wraps onto 2 lines, the DSFR makes the second
                            line overlap with the details below
                        -->
              {truncateNomFichier(name)}
              <span class="fr-link__detail">
                {media_type} - {byteFormat.format(size)}{demarche_numerique_created_at
                  ? ` - Date de dépôt : ${formatDateAbsolute(demarche_numerique_created_at)}`
                  : ""}
              </span>
            </a>
          </li>
        {/each}
      </ul>
    {/if}

    <h2>Dossier déposé</h2>
    <a
      class="fr-btn fr-btn--secondary fr-mb-1w"
      target="_blank"
      href={`${originDemarcheNumerique}/procedures/${demarcheNumber}/dossiers/${numdos}`}
      >Dossier sur Démarche Numérique</a
    >
  </section>
</section>

<style lang="scss">
  .column {
    h2 {
      margin-top: 3rem;
    }
    & > :nth-child(1) {
      margin-top: 0;
    }
  }
  .row {
    display: flex;
    flex-direction: row;

    & > :nth-child(1) {
      flex: 3;
      margin-right: 1rem;
    }

    & > :nth-child(2) {
      flex: 2;
    }
  }

  .container-title-especes-impactees {
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .container-title-especes-impactees h2 {
    margin: 0;
    white-space: nowrap;
  }

  .container-title-cartographie {
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    margin-top: 3rem;
  }

  .container-title-cartographie h2 {
    margin: 0;
    white-space: nowrap;
  }

  .pieces-jointes-petitionnaire {
    list-style: none;
    padding: 0;

    li {
      margin-bottom: 0.3rem;
    }
  }
</style>
