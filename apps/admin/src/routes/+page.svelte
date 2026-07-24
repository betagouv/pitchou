<script lang="ts">
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<h1 class="fr-mb-1w">Tableau de bord</h1>
<p class="fr-text--lead fr-mb-4w">Accès rapide aux outils de l'équipe Pitchou.</p>

{#if data.links.length > 0}
  <ul
    class="list-none p-0 m-0 grid gap-6 grid-cols-1 min-[36em]:grid-cols-2 min-[48em]:grid-cols-3"
  >
    {#each data.links as link (link.title)}
      <li class="flex">
        <div class="fr-tile fr-tile--sm fr-tile--horizontal fr-enlarge-link w-full items-center!">
          <div class="fr-tile__body">
            <div class="fr-tile__content pb-0!">
              <h2 class="fr-tile__title">
                <a href={link.href} target="_blank" rel="noopener external" class="after:static!"
                  >{link.title}</a
                >
              </h2>
              <p class="fr-tile__detail mb-0!">{link.detail}</p>
            </div>
          </div>
          <div class="fr-tile__header">
            <div class="fr-tile__pictogram">
              <span
                class="{link.icon} before:[--icon-size:2rem] before:w-8 before:h-8 before:text-[color:var(--text-action-high-blue-france)]"
                aria-hidden="true"
              ></span>
            </div>
          </div>
        </div>
      </li>
    {/each}
  </ul>
{:else}
  <p>
    Aucun lien configuré. Renseignez les variables <code>URL_*</code> dans le fichier
    <code>.env</code>.
  </p>
{/if}
