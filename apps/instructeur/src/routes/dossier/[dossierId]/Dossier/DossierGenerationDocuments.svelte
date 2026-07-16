<script lang="ts">
  import { fillOdtTemplate, getOdtTextContent } from "@odfjs/odfjs";
  import { getBalisesGenerationDocument } from "./genererDocument.ts";
  import { loadActivitesMethodesMoyensDePoursuite } from "$lib/especes/activitesMethodesMoyensDePoursuite.ts";
  import { sendEvenement } from "$lib/shared/aarri.ts";

  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  import type { DescriptionMenacesEspeces } from "@pitchou/types/especes.d.ts";

  let templateFiles: FileList | undefined = $state();
  let template = $derived(templateFiles && templateFiles[0]);

  let erreurGenerationDocument: Error | undefined = $state();

  type Props = {
    dossier: DossierFull;
    espècesImpactées: Promise<DescriptionMenacesEspeces> | undefined;
  };

  let { dossier, espècesImpactées: especesImpactees }: Props = $props();

  let documentGenere: Blob | undefined = $state();
  let urlDocumentGenere: string | undefined = $derived(
    documentGenere && URL.createObjectURL(documentGenere),
  );
  let nomDocumentGenere: string | undefined = $state();

  let texteDocumentGenere: Promise<string> | undefined = $derived(
    documentGenere && documentGenere.arrayBuffer().then(getOdtTextContent),
  );

  async function generateDoc(e: SubmitEvent) {
    e.preventDefault();

    if (!template) {
      throw new Error(`Missing template`);
    }

    let especes_impacts = undefined;

    const {
      identifiantPitchouVersActivitéEtImpactsQuantifiés:
        identifiantPitchouVersActiviteEtImpactsQuantifies,
    } = await loadActivitesMethodesMoyensDePoursuite();

    try {
      // on laisse les erreurs sortir silencieusement ici s'il y en a
      especes_impacts = await especesImpactees;
    } catch (e) {
      // @ts-ignore
      erreurGenerationDocument = e;
      return;
    }

    if (!especes_impacts) {
      // @ts-ignore
      erreurGenerationDocument = new Error(
        "Attention, il est impossible de générer des documents pour ce dossier si aucune liste d'espèce n'a été saisie par le pétitionnaire.",
      );
      return;
    }

    const balises = getBalisesGenerationDocument(
      dossier,
      especes_impacts,
      identifiantPitchouVersActiviteEtImpactsQuantifies,
    );

    console.log("balises", balises);

    const templateAB = await template.arrayBuffer();
    try {
      const documentArrayBuffer = await fillOdtTemplate(templateAB, balises);
      documentGenere = new Blob([documentArrayBuffer], { type: template.type });

      const [part1, part2] = template.name.split(".");
      const datetime = new Date().toISOString().slice(0, "YYYY-MM-DD:HH-MM".length);
      nomDocumentGenere = `${part1}-${datetime}.${part2}`;

      sendEvenement({ type: "générerUnDocument" });
    } catch (err) {
      // @ts-ignore
      erreurGenerationDocument = err;
    }
  }
</script>

<div class="row">
  <h2>Génération de documents</h2>

  <p>
    Générer des documents à partir d'un <a
      target="_blank"
      href="https://betagouv.github.io/pitchou/instruction/document-types/">document-type</a
    >
    et des données de ce dossier
    <br />
    Vous pouvez
    <a
      target="_blank"
      href="https://betagouv.github.io/pitchou/instruction/document-types/creation.html"
      >créer vos propres document-types</a
    >
  </p>

  {#if erreurGenerationDocument}
    <div class="fr-alert fr-alert--error fr-mb-3w">
      <h3 class="fr-alert__title">Erreur lors de la génération du document :</h3>
      <p>{erreurGenerationDocument}</p>
    </div>
  {/if}

  <form onsubmit={generateDoc}>
    <div class="fr-upload-group">
      <label class="fr-label" for="file-upload"
        >Ajouter un document-type
        <!--
                    <span class="fr-hint-text">Taille maximale : 500 Mo. Formats supportés : jpg, png, pdf. Plusieurs fichiers possibles. Lorem ipsum dolor sit amet, consectetur adipiscing.</span>
                -->
      </label>
      <input
        bind:files={templateFiles}
        class="fr-upload"
        type="file"
        accept=".odt"
        id="file-upload"
      />
    </div>

    <button class="fr-btn" type="submit" disabled={!template}>Générer le document !</button>
  </form>

  {#if documentGenere && nomDocumentGenere}
    <div>
      <a class="fr-link fr-link--download" download={nomDocumentGenere} href={urlDocumentGenere}>
        Télécharger le document généré
      </a>
      <details>
        <summary>Voir le texte brut</summary>
        {#await texteDocumentGenere}
          (... en chargement ...)
        {:then texte}
          <div class="texte-document-généré">{texte}</div>
        {/await}
      </details>
    </div>
  {/if}
</div>

<style lang="scss">
  form {
    margin-bottom: 2rem;

    .fr-upload-group {
      margin-bottom: 2rem;
    }
  }

  details {
    cursor: initial;

    summary {
      cursor: pointer;
    }
  }

  .texte-document-généré {
    white-space: preserve;
    padding: 1rem;

    background-color: var(--background-contrast-grey);
  }
</style>
