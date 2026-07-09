<script lang="ts">
  import EnteteDossier from "./Dossier/EnteteDossier.svelte";

  import DossierMessagerie from "./Dossier/DossierMessagerie.svelte";
  import DossierInstruction from "./Dossier/DossierInstruction.svelte";
  import DossierProjet from "./Dossier/DossierProjet.svelte";
  import DossierPorteurDeProjet from "./Dossier/DossierPorteurDeProjet.svelte";
  import DossierAvis from "./Dossier/DossierAvis.svelte";
  import DossierContrôles from "./Dossier/DossierContrôles.svelte";
  import DossierPiecesJointes from "./Dossier/DossierPiecesJointes.svelte";
  import DossierGénérationDocuments from "./Dossier/DossierGénérationDocuments.svelte";
  import { MediaTypeError } from "@pitchou/common/errors.ts";
  import { espècesImpactéesDepuisFichierOdsArrayBuffer } from "$lib/dossier/dossier.ts";
  import { envoyerÉvènement } from "$lib/shared/aarri.ts";
  import debounce from "just-debounce-it";
  import { onMount } from "svelte";
  import { updateNotificationForDossier } from "$lib/dossier/notification.ts";

  import type { DossierComplet } from "@pitchou/types/API_Pitchou.ts";
  import type { DescriptionMenacesEspèces } from "@pitchou/types/especes.d.ts";
  import type Personne from "@pitchou/types/database/public/Personne.ts";
  import type Notification from "@pitchou/types/database/public/Notification.ts";

  type Onglet =
    | "instruction"
    | "projet"
    | "porteur-de-projet"
    | "avis"
    | "controles"
    | "pieces-jointes"
    | "generation-document"
    | "echanges";

  function changerOnglet(nouvelOnglet: Onglet) {
    ongletActif = nouvelOnglet;
    // Mettre à jour l'URL sans recharger la page
    window.history.replaceState(null, "", `#${nouvelOnglet}`);
  }

  function handleTabClick(onglet: Onglet) {
    changerOnglet(onglet);
  }

  // Petitionnaires may upload the impacted-espece file as .ods (Pitchou's
  // template) or as .xlsx; both are parsed by espècesImpactéesDepuisFichierOdsArrayBuffer.
  const EXTENSIONS_ATTENDUES = [".ods", ".xlsx"];

  function getEspècesImpactés(
    dossier: DossierComplet,
  ): ReturnType<typeof espècesImpactéesDepuisFichierOdsArrayBuffer> | undefined {
    const espècesImpactées = dossier.espècesImpactées;

    if (!espècesImpactées || !espècesImpactées.url) {
      return undefined;
    }

    const extension = "." + espècesImpactées.nom?.split(".").pop();

    if (!EXTENSIONS_ATTENDUES.includes(extension)) {
      return Promise.reject(
        new MediaTypeError({ attendu: EXTENSIONS_ATTENDUES.join(", "), obtenu: extension }),
      );
    }

    // Le contenu du fichier est récupéré à la demande depuis l'Object Storage
    return fetch(espècesImpactées.url)
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => espècesImpactéesDepuisFichierOdsArrayBuffer(arrayBuffer));
  }

  type Props = {
    dossier: DossierComplet;
    ongletActifInitial: Onglet;
    messages: any;
    email: string;
    personnesQuiSuiventDossier: NonNullable<Personne["email"]>[];
    dossierActuelSuiviParInstructeurActuel: boolean | undefined;
    notification?: Pick<Notification, "vue" | "date_dernière_mise_à_jour">;
  };

  let {
    dossier,
    ongletActifInitial,
    messages,
    email,
    personnesQuiSuiventDossier,
    dossierActuelSuiviParInstructeurActuel,
    notification,
  }: Props = $props();

  $inspect("Dossier complet", dossier);

  const envoyerÉvènementConsulterUnDossier = debounce(
    () => envoyerÉvènement({ type: "consulterUnDossier", détails: { dossierId: dossier.id } }),
    15 * 60 * 1000,
    true,
  );

  onMount(() => {
    if (notification?.vue === false) {
      // Quand le dossier a une notification non vue par l'instructrice actuelle,
      // elle disparaît au moment de la consultation du dossier.
      updateNotificationForDossier({ dossier: dossier.id, vue: true });
    }
  });

  $effect(() => {
    if (ongletActif === "projet") {
      envoyerÉvènementConsulterUnDossier();
    }
  });

  let ongletActif = $derived(ongletActifInitial);

  let espècesImpactées: Promise<DescriptionMenacesEspèces> | undefined = $derived(
    getEspècesImpactés(dossier),
  );
</script>

<svelte:head>
  <title>{`${dossier.nom} — Dossier n°${dossier.id} — Pitchou`}</title>
</svelte:head>

<div class="fr-grid-row fr-mt-2w">
  <div class="fr-col">
    <EnteteDossier {dossier} {dossierActuelSuiviParInstructeurActuel} {email}></EnteteDossier>

    <div class="fr-tabs">
      <ul class="fr-tabs__list" role="tablist" aria-label="Navigation des onglets du dossier">
        <li role="presentation">
          <button
            type="button"
            id="tabpanel-instruction"
            aria-controls="tabpanel-instruction-panel"
            class="fr-tabs__tab {ongletActif === 'instruction' ? 'fr-tabs__tab--selected' : ''}"
            tabindex={ongletActif === "instruction" ? 0 : -1}
            role="tab"
            aria-selected={ongletActif === "instruction"}
            onclick={() => handleTabClick("instruction")}
          >
            Instruction
          </button>
        </li>
        <li role="presentation">
          <button
            type="button"
            id="tabpanel-projet"
            aria-controls="tabpanel-projet-panel"
            class="fr-tabs__tab {ongletActif === 'projet' ? 'fr-tabs__tab--selected' : ''}"
            tabindex={ongletActif === "projet" ? 0 : -1}
            role="tab"
            aria-selected={ongletActif === "projet"}
            onclick={() => handleTabClick("projet")}
          >
            Projet
          </button>
        </li>
        <li role="presentation">
          <button
            type="button"
            id="tabpanel-porteur-de-projet"
            aria-controls="tabpanel-porteur-de-projet-panel"
            class="fr-tabs__tab {ongletActif === 'porteur-de-projet'
              ? 'fr-tabs__tab--selected'
              : ''}"
            tabindex={ongletActif === "porteur-de-projet" ? 0 : -1}
            role="tab"
            aria-selected={ongletActif === "porteur-de-projet"}
            onclick={() => handleTabClick("porteur-de-projet")}
          >
            Porteur de projet
          </button>
        </li>
        <li role="presentation">
          <button
            type="button"
            id="tabpanel-echanges"
            aria-controls="tabpanel-echanges-panel"
            class="fr-tabs__tab {ongletActif === 'echanges' ? 'fr-tabs__tab--selected' : ''}"
            tabindex={ongletActif === "echanges" ? 0 : -1}
            role="tab"
            aria-selected={ongletActif === "echanges"}
            onclick={() => handleTabClick("echanges")}
          >
            Échanges
          </button>
        </li>
        <li role="presentation">
          <button
            type="button"
            id="tabpanel-avis"
            aria-controls="tabpanel-avis-panel"
            class="fr-tabs__tab {ongletActif === 'avis' ? 'fr-tabs__tab--selected' : ''}"
            tabindex={ongletActif === "avis" ? 0 : -1}
            role="tab"
            aria-selected={ongletActif === "avis"}
            onclick={() => handleTabClick("avis")}
          >
            Avis
          </button>
        </li>
        <li role="presentation">
          <button
            type="button"
            id="tabpanel-controles"
            aria-controls="tabpanel-controles-panel"
            class="fr-tabs__tab {ongletActif === 'controles' ? 'fr-tabs__tab--selected' : ''}"
            tabindex={ongletActif === "controles" ? 0 : -1}
            role="tab"
            aria-selected={ongletActif === "controles"}
            onclick={() => handleTabClick("controles")}
          >
            Contrôles
          </button>
        </li>
        <li role="presentation">
          <button
            type="button"
            id="tabpanel-pieces-jointes"
            aria-controls="tabpanel-pieces-jointes-panel"
            class="fr-tabs__tab {ongletActif === 'pieces-jointes' ? 'fr-tabs__tab--selected' : ''}"
            tabindex={ongletActif === "pieces-jointes" ? 0 : -1}
            role="tab"
            aria-selected={ongletActif === "pieces-jointes"}
            onclick={() => handleTabClick("pieces-jointes")}
          >
            Pièces jointes
          </button>
        </li>
        <li role="presentation">
          <button
            type="button"
            id="tabpanel-generation-document"
            aria-controls="tabpanel-generation-document-panel"
            class="fr-tabs__tab {ongletActif === 'generation-document'
              ? 'fr-tabs__tab--selected'
              : ''}"
            tabindex={ongletActif === "generation-document" ? 0 : -1}
            role="tab"
            aria-selected={ongletActif === "generation-document"}
            onclick={() => handleTabClick("generation-document")}
          >
            Génération document
          </button>
        </li>
      </ul>
      <div
        id="tabpanel-instruction-panel"
        aria-labelledby="tabpanel-instruction"
        class="fr-tabs__panel"
        class:fr-tabs__panel--selected={ongletActif === "instruction"}
        role="tabpanel"
        tabindex="0"
      >
        <DossierInstruction
          {dossier}
          {personnesQuiSuiventDossier}
          {dossierActuelSuiviParInstructeurActuel}
          {email}
        ></DossierInstruction>
      </div>
      <div
        id="tabpanel-projet-panel"
        aria-labelledby="tabpanel-projet"
        class="fr-tabs__panel"
        class:fr-tabs__panel--selected={ongletActif === "projet"}
        role="tabpanel"
        tabindex="0"
      >
        <DossierProjet {dossier} {espècesImpactées}></DossierProjet>
      </div>
      <div
        id="tabpanel-porteur-de-projet-panel"
        aria-labelledby="tabpanel-porteur-de-projet"
        class="fr-tabs__panel"
        class:fr-tabs__panel--selected={ongletActif === "porteur-de-projet"}
        role="tabpanel"
        tabindex="0"
      >
        <DossierPorteurDeProjet {dossier}></DossierPorteurDeProjet>
      </div>
      <div
        id="tabpanel-echanges-panel"
        aria-labelledby="tabpanel-echanges"
        class="fr-tabs__panel"
        class:fr-tabs__panel--selected={ongletActif === "echanges"}
        role="tabpanel"
        tabindex="0"
      >
        <DossierMessagerie {dossier} {messages}></DossierMessagerie>
      </div>
      <div
        id="tabpanel-avis-panel"
        aria-labelledby="tabpanel-avis"
        class="fr-tabs__panel"
        class:fr-tabs__panel--selected={ongletActif === "avis"}
        role="tabpanel"
        tabindex="0"
      >
        <DossierAvis {dossier}></DossierAvis>
      </div>
      <div
        id="tabpanel-controles-panel"
        aria-labelledby="tabpanel-controles"
        class="fr-tabs__panel"
        class:fr-tabs__panel--selected={ongletActif === "controles"}
        role="tabpanel"
        tabindex="0"
      >
        <DossierContrôles {dossier}></DossierContrôles>
      </div>
      <div
        id="tabpanel-pieces-jointes-panel"
        aria-labelledby="tabpanel-pieces-jointes"
        class="fr-tabs__panel"
        class:fr-tabs__panel--selected={ongletActif === "pieces-jointes"}
        role="tabpanel"
        tabindex="0"
      >
        <DossierPiecesJointes {dossier} ouvrirOnglet={changerOnglet}></DossierPiecesJointes>
      </div>
      <div
        id="tabpanel-generation-document-panel"
        aria-labelledby="tabpanel-generation-document"
        class="fr-tabs__panel"
        class:fr-tabs__panel--selected={ongletActif === "generation-document"}
        role="tabpanel"
        tabindex="0"
      >
        <DossierGénérationDocuments {dossier} {espècesImpactées}></DossierGénérationDocuments>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
</style>
