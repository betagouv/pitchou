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
  <div class="form-recherche">
    <label class="sr-only" for="recherche-texte">{title}</label>
    <input
      type="text"
      name="recherche-texte"
      id="recherche-texte"
      placeholder={title}
      class="fr-input"
      bind:value={value}
    />
    <button class="fr-btn" type="submit">Chercher</button>
  </div>

  <p class="fr-hint-text">
    Vous pouvez rechercher par départements, communes, nom de projet, porteur de projet, numéro de
    dossier, numéro Onagre.
  </p>
</form>

<style lang="scss">
  .form-recherche {
    display: flex;
    width: 70%;
  }

  .sr-only {
    border: none;
    clip: rect(1px, 1px, 1px, 1px);
    clip-path: inset(50%);
    height: 1px;
    margin: -1px;
    width: 1px;
    overflow: hidden;
    position: absolute !important;
    word-wrap: normal !important;
  }
</style>
