<script lang="ts">
  type Props = { id: string; service: string | null; other: string | null };
  let { id, service = $bindable(), other = $bindable() }: Props = $props();
  const services = ["CSRPN", "CNPN", "Ministre", "Autre expert"];
</script>

<fieldset class="fr-fieldset fr-mt-3w">
  <legend class="fr-fieldset__legend--regular fr-fieldset__legend"
    >Service ou personne experte <span
      class="text-[color:var(--text-title-blue-france,#000091)] fr-ml-1v font-bold">*</span
    ></legend
  >
  <div class="w-full flex flex-row [&_.fr-fieldset__element]:flex-[unset]">
    {#each services as option}{@const radioId = `service-expert-${option.replace(/\s+/g, "-").toLowerCase()}-${id}`}
      <div class="fr-fieldset__element">
        <div class="fr-radio-group">
          <input
            required
            type="radio"
            id={radioId}
            name="service-expert-{id}"
            value={option}
            bind:group={service}
            onchange={() => {
              if (option !== "Autre expert") other = null;
            }}
          /><label class="fr-label" for={radioId}>{option}</label>
        </div>
      </div>{/each}
  </div>
</fieldset>
{#if service === "Autre expert"}<div class="fr-input-group fr-mt-3w">
    <label class="fr-label" for="autre-expert-texte-{id}">Précisez l'expert</label><input
      class="fr-input"
      type="text"
      id="autre-expert-texte-{id}"
      bind:value={other}
      placeholder="Nom de l'expert"
    />
  </div>{/if}
