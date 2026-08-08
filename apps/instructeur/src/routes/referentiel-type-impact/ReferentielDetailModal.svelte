<script lang="ts">
  import type { DetailSection } from "./details.ts";

  type Props = {
    id: string;
    title: string | null;
    subtitle?: string;
    badges?: string[];
    sections?: DetailSection[];
  };

  let { id, title, subtitle, badges = [], sections = [] }: Props = $props();

  const titreId = $derived(`${id}-title`);
</script>

<dialog {id} class="fr-modal" aria-labelledby={titreId}>
  <div class="fr-container fr-container--fluid fr-container-md">
    <div class="fr-grid-row fr-grid-row--center">
      <div class="fr-col-12 fr-col-md-10 fr-col-lg-8">
        <div class="fr-modal__body">
          <div class="fr-modal__header">
            <button class="fr-btn--close fr-btn" title="Fermer" aria-controls={id}>Fermer</button>
          </div>
          <div class="fr-modal__content">
            {#if title}
              <h1 id={titreId} class="fr-modal__title">{title}</h1>

              {#if subtitle}
                <p class="fr-text--sm fr-mb-2w">{subtitle}</p>
              {/if}

              {#if badges.length >= 1}
                <p class="flex flex-wrap gap-2 fr-mb-2w">
                  {#each badges as badge}
                    <span class="fr-badge fr-badge--sm fr-badge--blue-ecume">{badge}</span>
                  {/each}
                </p>
              {/if}

              {#each sections as section}
                <h2 class="fr-h6 fr-mt-2w">{section.title}</h2>
                {#if Array.isArray(section.content)}
                  {#if section.content.length >= 1}
                    <ul>
                      {#each section.content as item}
                        <li>{item}</li>
                      {/each}
                    </ul>
                  {:else}
                    <p>Aucun.</p>
                  {/if}
                {:else}
                  <p class="whitespace-pre-line">{section.content}</p>
                {/if}
              {/each}
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
</dialog>
