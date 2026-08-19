<script lang="ts">
  import { tick } from "svelte";

  import type { ClassificationEtreVivant } from "@pitchou/types/especes.d.ts";
  import type {
    ReferentielRows,
    TypeImpactRow,
    MethodeRow,
    MoyenDePoursuiteRow,
  } from "@pitchou/common/referentielTypeImpactMethodeMoyenDePoursuite.ts";

  import { CLASSIFICATIONS, criteresApplicables, parClassification } from "./typeImpacts.ts";
  import ReferentielDetailModal from "./ReferentielDetailModal.svelte";
  import Select from "@pitchou/ui/Select.svelte";
  import ReferentielValueTable from "./ReferentielValueTable.svelte";
  import { referentielValueDetail, typeImpactDetail, type ReferentielDetail } from "./details.ts";

  type Props = {
    referentiel: ReferentielRows;
  };

  let { referentiel }: Props = $props();

  const detailModalId = "modale-detail-referentiel";

  // "" means every classification. The saisie form only ever offers one at a time, so filtering
  // here answers the question an instructeurice actually has: what can I fill in for this espèce?
  let classification: ClassificationEtreVivant | "" = $state("");

  const classificationOptions = [
    { value: "" as ClassificationEtreVivant | "", label: "Toutes" },
    ...CLASSIFICATIONS.map((classificationOption) => ({
      value: classificationOption,
      label: classificationOption,
    })),
  ];

  const typesImpact = $derived(
    parClassification(
      referentiel.typesImpact.filter((t) => !classification || t.classification === classification),
    ),
  );
  const methodes = $derived(
    parClassification(
      referentiel.methodes.filter((m) => !classification || m.classification === classification),
    ),
  );
  const moyensDePoursuite = $derived(
    parClassification(
      referentiel.moyensDePoursuite.filter(
        (m) => !classification || m.classification === classification,
      ),
    ),
  );

  let detail: ReferentielDetail | null = $state(null);
  let triggerDetail: HTMLButtonElement | undefined = $state();

  async function openDetail(next: NonNullable<typeof detail>) {
    detail = next;
    await tick();
    triggerDetail?.click();
  }

  function openTypeImpactDetail(typeImpact: TypeImpactRow) {
    openDetail(typeImpactDetail(typeImpact));
  }

  function openValeurDetail(valeur: MethodeRow | MoyenDePoursuiteRow, nature: string) {
    openDetail(referentielValueDetail(valeur, nature));
  }
</script>

<div class="flex flex-col fr-mt-4w gap-4">
  <h1 class="fr-mb-0">Référentiel des types d’impact et de leurs critères</h1>

  <p class="fr-mb-0">
    Un impact sur une espèce protégée se décrit par un type d’impact et par les critères qui
    s’appliquent à ce type. Cette page liste le référentiel utilisé par Pitchou pour la saisie des
    espèces impactées et pour le rapportage européen. Un critère applicable peut être renseigné,
    sans que sa saisie soit imposée.
  </p>

  <p class="fr-mb-0 fr-text--sm">
    Les codes et les libellés européens proviennent des directives « Oiseaux » et « Habitats », via
    le schéma de rapportage
    <a
      href="https://dd.eionet.europa.eu/schemas/habides-2.0/derogations.xsd"
      target="_blank"
      rel="noopener external"
      title="Schéma de rapportage HaBiDeS+ — nouvelle fenêtre">HaBiDeS+</a
    >. Cliquez sur une ligne pour lire le libellé européen complet.
  </p>

  <div class="fr-select-group max-w-md fr-mb-0">
    <label class="fr-label" for="filtre-classification">Classification d’espèce</label>
    <Select
      id="filtre-classification"
      class="fr-mt-1w"
      options={classificationOptions}
      bind:value={classification}
    />
  </div>
</div>

<h2 class="fr-h4 fr-mt-4w">
  Types d’impact <span class="fr-text--sm">({typesImpact.length})</span>
</h2>

<div class="fr-table fr-table--bordered overflow-x-auto">
  <table class="w-full min-w-[48rem]">
    <colgroup>
      <col style="width: 110px" />
      <col />
      <col style="width: 150px" />
      <col style="width: 110px" />
      <col />
    </colgroup>
    <thead>
      <tr>
        <th scope="col">Identifiant Pitchou</th>
        <th scope="col">Libellé Pitchou</th>
        <th scope="col">Classification</th>
        <th scope="col">Code européen</th>
        <th scope="col">Critères applicables</th>
      </tr>
    </thead>
    <tbody>
      {#each typesImpact as typeImpact (typeImpact.identifiant_pitchou)}
        {@const criteres = criteresApplicables(typeImpact)}
        <tr
          class="cursor-pointer hover:bg-[var(--background-contrast-grey)] focus-visible:[outline:2px_solid_var(--bf500)] focus-visible:[outline-offset:-2px]"
          role="button"
          tabindex="0"
          title="Voir le détail de {typeImpact.libelle_pitchou}"
          onclick={() => openTypeImpactDetail(typeImpact)}
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openTypeImpactDetail(typeImpact);
            }
          }}
        >
          <td>{typeImpact.identifiant_pitchou}</td>
          <td>{typeImpact.libelle_pitchou}</td>
          <td>{typeImpact.classification}</td>
          <td>{typeImpact.code_europeen}</td>
          <td>
            {#if criteres.length >= 1}
              <span class="flex flex-wrap gap-1">
                {#each criteres as critere}
                  <span class="fr-badge fr-badge--sm fr-badge--blue-ecume">{critere}</span>
                {/each}
              </span>
            {:else}
              <span class="fr-text--sm">Aucun</span>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<ReferentielValueTable
  title="Méthodes"
  description="Proposées lorsque le type d’impact a le critère « Méthode ». La flore n’en a aucune : la directive n’en définit pas."
  emptyMessage="Aucune méthode ne s’applique à cette classification d’espèce."
  values={methodes}
  onOpen={openValeurDetail}
/>
<ReferentielValueTable
  title="Moyens de poursuite"
  description="Proposés lorsque le type d’impact a le critère « Moyen de poursuite ». Un même code ne désigne pas la même chose chez les oiseaux et chez la faune non-oiseau : c’est la classification qui les distingue."
  emptyMessage="Aucun moyen de poursuite ne s’applique à cette classification d’espèce."
  values={moyensDePoursuite}
  onOpen={openValeurDetail}
/>

<button
  bind:this={triggerDetail}
  type="button"
  class="fr-sr-only"
  aria-controls={detailModalId}
  data-fr-opened="false"
  tabindex="-1"
  aria-hidden="true"
>
  Voir le détail
</button>

<ReferentielDetailModal
  id={detailModalId}
  title={detail?.title ?? null}
  subtitle={detail?.subtitle}
  badges={detail?.badges ?? []}
  sections={detail?.sections ?? []}
/>
