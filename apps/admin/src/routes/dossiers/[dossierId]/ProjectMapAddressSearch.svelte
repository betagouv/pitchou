<script lang="ts">
  type Props = { address: string; onSearch: () => void };
  let { address = $bindable(), onSearch }: Props = $props();
</script>

<div class="fr-search-bar fr-mb-2w" role="search">
  <label class="fr-label" for="project-map-address"
    >Centrer la carte en recherchant une adresse</label
  >
  <input
    class="fr-input"
    id="project-map-address"
    type="search"
    bind:value={address}
    onkeydown={(event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        onSearch();
      }
    }}
  />
  <button class="fr-btn" type="button" title="Rechercher" onclick={onSearch}>Rechercher</button>
</div>
