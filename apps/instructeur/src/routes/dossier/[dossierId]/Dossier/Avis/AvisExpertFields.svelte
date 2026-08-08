<script lang="ts">
  import DateInput from "../../DateInput.svelte";
  import { uploadSizeHint } from "$lib/upload/uploadSizeHint.ts";
  import type { FrontEndAvisExpert } from "@pitchou/types/API_Pitchou.ts";
  type Props = {
    dossierId: number;
    initial?: FrontEndAvisExpert;
    avis: Partial<
      Pick<FrontEndAvisExpert, "id" | "expert" | "saisine_date" | "avis" | "avis_date">
    >;
    service: string;
    otherExpert: string | null;
    saisineFiles?: FileList;
    avisFiles?: FileList;
  };
  let {
    dossierId,
    initial,
    avis = $bindable(),
    service = $bindable(),
    otherExpert = $bindable(),
    saisineFiles = $bindable(),
    avisFiles = $bindable(),
  }: Props = $props();
  const services = ["CSRPN", "CNPN", "Ministre", "Autre expert"];
</script>

<h4
  class="fr-h6 fr-mt-0 fr-mb-1w fr-pb-1w w-full border-b border-[color:var(--border-default-grey)]"
>
  Expert
</h4>
<div class="fr-fieldset__element">
  <fieldset class="fr-fieldset fr-mb-0">
    <legend class="fr-fieldset__legend">Service ou personne experte</legend>
    {#each services as option}
      {@const id = `service-expert-${option.replace(/\s+/g, "-").toLowerCase()}-${dossierId}`}
      <div class="fr-fieldset__element">
        <div class="fr-radio-group fr-ml-2w">
          <input
            {id}
            type="radio"
            value={option}
            name="serviceOuPersonneExperte"
            bind:group={service}
            onchange={() => {
              if (option !== "Autre expert") otherExpert = null;
            }}
          />
          <label class="fr-label" for={id}>{option}</label>
        </div>
      </div>
    {/each}
    {#if service === "Autre expert"}
      <div class="fr-fieldset__element">
        <div class="fr-input-group fr-mt-3w">
          <label class="fr-label" for="autre-expert-texte">Précisez l'expert</label>
          <input
            class="fr-input"
            type="text"
            id="autre-expert-texte"
            bind:value={otherExpert}
            placeholder="Nom de l'expert"
          />
        </div>
      </div>
    {/if}
  </fieldset>
</div>

<h4
  class="fr-h6 fr-mt-3w fr-mb-1w fr-pb-1w w-full border-b border-[color:var(--border-default-grey)]"
>
  Saisine
</h4>
<div class="fr-fieldset__element">
  <div class="fr-upload-fichier-saisine-group">
    <label class="fr-label" for="upload-fichier-saisine"
      >Fichier de la saisine <span class="fr-hint-text"
        >Indication : {uploadSizeHint()} Formats supportés&nbsp;: pdf</span
      ></label
    >
    {#if initial?.saisine_fichier_url}
      <a
        class="fr-btn fr-btn--secondary fr-btn--sm"
        href={initial.saisine_fichier_url}
        data-sveltekit-reload>Télécharger le fichier de la saisine</a
      >
    {:else}
      <input
        accept=".pdf"
        bind:files={saisineFiles}
        class="fr-upload"
        type="file"
        id="upload-fichier-saisine"
        name="upload"
      />
    {/if}
  </div>
</div>
<div class="fr-fieldset__element">
  <div class="fr-input-group fr-mt-3w">
    <label class="fr-label" for="input-champ-date-saisine">Date saisine</label><DateInput
      id="input-champ-date-saisine"
      label="Date saisine"
      bind:date={avis.saisine_date}
    />
  </div>
</div>

<h4
  class="fr-h6 fr-mt-3w fr-mb-1w fr-pb-1w w-full border-b border-[color:var(--border-default-grey)]"
>
  Avis
</h4>
<div class="fr-fieldset__element">
  <div class="fr-upload-fichier-avis-group">
    <label class="fr-label" for="upload-fichier-avis"
      >Fichier de l'avis de l'expert <span class="fr-hint-text"
        >Indication : {uploadSizeHint()} Formats supportés&nbsp;: pdf</span
      ></label
    >
    {#if initial?.avis_fichier_url}
      <a
        class="fr-btn fr-btn--secondary fr-btn--sm"
        href={initial.avis_fichier_url}
        data-sveltekit-reload>Télécharger le fichier de l'avis</a
      >
    {:else}
      <input
        accept=".pdf"
        bind:files={avisFiles}
        class="fr-upload"
        type="file"
        id="upload-fichier-avis"
        name="upload"
      />
    {/if}
  </div>
</div>
<div class="fr-fieldset__element">
  <div class="fr-input-group fr-mt-3w">
    <label class="fr-label" for="input-champ-date-avis">Date avis</label><DateInput
      id="input-champ-date-avis"
      label="Date avis"
      bind:date={avis.avis_date}
    />
  </div>
</div>
{#if ["Ministre", "CNPN", "CSRPN"].includes(service)}
  <div class="fr-fieldset__element">
    <div class="fr-input-group">
      <p class="fr-label fr-mb-2w">Avis de l’expert</p>
      {#each ["Avis favorable", "Avis favorable tacite", "Avis favorable sous condition", "Avis défavorable"] as value}
        {@const id = `avis-${value.replace(/\s+/g, "-").toLowerCase()}`}
        <div class="fr-fieldset__element">
          <div class="fr-radio-group fr-ml-2w">
            <input type="radio" {id} name="champ-avis" {value} bind:group={avis.avis} /><label
              class="fr-label"
              for={id}>{value}</label
            >
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}
