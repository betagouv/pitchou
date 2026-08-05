<script lang="ts">
  import { tick } from "svelte";

  import type { ClassificationEtreVivant } from "@pitchou/types/especes.d.ts";
  import type {
    ReferentielRows,
    TypeImpactRow,
    MethodeRow,
    MoyenDePoursuiteRow,
  } from "@pitchou/common/referentielTypeImpactMethodeMoyenDePoursuite.ts";

  import {
    CLASSIFICATIONS,
    criteresApplicables,
    parClassification,
  } from "./referentielTypeImpact.ts";
  import ReferentielDetailModal from "./ReferentielDetailModal.svelte";
  import type { DetailSection } from "./ReferentielDetailModal.svelte";

  type Props = {
    referentiel: ReferentielRows;
  };

  let { referentiel }: Props = $props();

  const detailModalId = "modale-detail-referentiel";

  // "" means every classification. The saisie form only ever offers one at a time, so filtering
  // here answers the question an instructeurice actually has: what can I fill in for this espèce?
  let classification: ClassificationEtreVivant | "" = $state("");

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

  let detail: {
    title: string;
    subtitle?: string;
    badges: string[];
    sections: DetailSection[];
  } | null = $state(null);
  let triggerDetail: HTMLButtonElement | undefined = $state();

  async function openDetail(next: NonNullable<typeof detail>) {
    detail = next;
    await tick();
    triggerDetail?.click();
  }

  function openTypeImpactDetail(typeImpact: TypeImpactRow) {
    openDetail({
      title: typeImpact.libelle_pitchou,
      subtitle: `${typeImpact.identifiant_pitchou} — ${typeImpact.classification} — code européen ${typeImpact.code_europeen}`,
      badges: criteresApplicables(typeImpact),
      sections: [
        { title: "Libellé de la directive européenne", content: typeImpact.libelle_europeen },
        { title: "Activités Onagre correspondantes", content: typeImpact.activites_onagre },
      ],
    });
  }

  function openValeurDetail(valeur: MethodeRow | MoyenDePoursuiteRow, nature: string) {
    openDetail({
      title: valeur.libelle_pitchou,
      subtitle: `${nature} — ${valeur.classification} — code européen ${valeur.code}`,
      badges: [],
      sections: [{ title: "Libellé de la directive européenne", content: valeur.libelle_europeen }],
    });
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
    <select class="fr-select" id="filtre-classification" bind:value={classification}>
      <option value="">Toutes</option>
      {#each CLASSIFICATIONS as classificationOption}
        <option value={classificationOption}>{classificationOption}</option>
      {/each}
    </select>
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

<h2 class="fr-h4 fr-mt-4w">Méthodes <span class="fr-text--sm">({methodes.length})</span></h2>

<p>
  Proposées lorsque le type d’impact a le critère « Méthode ». La flore n’en a aucune : la directive
  n’en définit pas.
</p>

{#if methodes.length === 0}
  <p class="fr-mb-0">Aucune méthode ne s’applique à cette classification d’espèce.</p>
{:else}
  <div class="fr-table fr-table--bordered overflow-x-auto">
    <table class="w-full min-w-[36rem]">
      <colgroup>
        <col style="width: 110px" />
        <col style="width: 150px" />
        <col />
      </colgroup>
      <thead>
        <tr>
          <th scope="col">Code européen</th>
          <th scope="col">Classification</th>
          <th scope="col">Libellé Pitchou</th>
        </tr>
      </thead>
      <tbody>
        {#each methodes as methode (methode.classification + methode.code)}
          <tr
            class="cursor-pointer hover:bg-[var(--background-contrast-grey)] focus-visible:[outline:2px_solid_var(--bf500)] focus-visible:[outline-offset:-2px]"
            role="button"
            tabindex="0"
            title="Voir le détail de la méthode {methode.code}"
            onclick={() => openValeurDetail(methode, "Méthode")}
            onkeydown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openValeurDetail(methode, "Méthode");
              }
            }}
          >
            <td>{methode.code}</td>
            <td>{methode.classification}</td>
            <td>{methode.libelle_pitchou}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<h2 class="fr-h4 fr-mt-4w">
  Moyens de poursuite <span class="fr-text--sm">({moyensDePoursuite.length})</span>
</h2>

<p>
  Proposés lorsque le type d’impact a le critère « Moyen de poursuite ». Un même code ne désigne pas
  la même chose chez les oiseaux et chez la faune non-oiseau : c’est la classification qui les
  distingue.
</p>

{#if moyensDePoursuite.length === 0}
  <p class="fr-mb-0">Aucun moyen de poursuite ne s’applique à cette classification d’espèce.</p>
{:else}
  <div class="fr-table fr-table--bordered overflow-x-auto">
    <table class="w-full min-w-[36rem]">
      <colgroup>
        <col style="width: 110px" />
        <col style="width: 150px" />
        <col />
      </colgroup>
      <thead>
        <tr>
          <th scope="col">Code européen</th>
          <th scope="col">Classification</th>
          <th scope="col">Libellé Pitchou</th>
        </tr>
      </thead>
      <tbody>
        {#each moyensDePoursuite as moyenDePoursuite (moyenDePoursuite.classification + moyenDePoursuite.code)}
          <tr
            class="cursor-pointer hover:bg-[var(--background-contrast-grey)] focus-visible:[outline:2px_solid_var(--bf500)] focus-visible:[outline-offset:-2px]"
            role="button"
            tabindex="0"
            title="Voir le détail du moyen de poursuite {moyenDePoursuite.code}"
            onclick={() => openValeurDetail(moyenDePoursuite, "Moyen de poursuite")}
            onkeydown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openValeurDetail(moyenDePoursuite, "Moyen de poursuite");
              }
            }}
          >
            <td>{moyenDePoursuite.code}</td>
            <td>{moyenDePoursuite.classification}</td>
            <td>{moyenDePoursuite.libelle_pitchou}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

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
