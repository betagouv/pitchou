<script lang="ts">
  type Props = {
    title: string;
    updateTextSearch: (value: string) => void;
  };

  let { title, updateTextSearch }: Props = $props();

  let value = $state("");

  function onUpdateSelectedValue(e: SubmitEvent) {
    e.preventDefault();
    updateTextSearch(value);
    value = "";
  }
</script>

<form onsubmit={onUpdateSelectedValue} role="search">
  <div class="flex w-[70%]">
    <label class="fr-sr-only" for="recherche-texte">{title}</label>
    <input
      type="text"
      name="recherche-texte"
      id="recherche-texte"
      placeholder={title}
      class="fr-input"
      bind:value
    />
    <button class="fr-btn" type="submit">Chercher</button>
  </div>

  <p class="fr-hint-text">
    Vous pouvez rechercher par départements, communes, nom de projet, porteur de projet, numéro de
    dossier, numéro Onagre.
  </p>
</form>
