<script lang="ts">
  type Props = { address: string; onSearch: () => void };
  let { address = $bindable(), onSearch }: Props = $props();
</script>

<div class="fr-input-group fr-mb-2w" role="search">
  <label class="fr-label" for="project-map-address">
    Centrer la carte en recherchant une adresse
    <span class="fr-hint-text" id="project-map-address-hint">
      Saisissez une adresse, une voie, un lieu-dit ou une commune. Exemple : 11 rue Réaumur, Paris
    </span>
  </label>
  <div class="relative">
    <input
      class="fr-input w-full pr-12"
      class:italic={!address}
      id="project-map-address"
      type="search"
      placeholder="Commencez à saisir"
      aria-describedby="project-map-address-hint"
      bind:value={address}
      onkeydown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onSearch();
        }
      }}
    />
    <button
      class="absolute right-3 top-1/2 -translate-y-1/2 border-0 bg-transparent cursor-pointer text-[color:var(--text-action-high-blue-france)]"
      type="button"
      title="Rechercher"
      onclick={onSearch}
    >
      <span class="fr-icon-search-line" aria-hidden="true"></span>
      <span class="fr-sr-only">Rechercher</span>
    </button>
  </div>
</div>
