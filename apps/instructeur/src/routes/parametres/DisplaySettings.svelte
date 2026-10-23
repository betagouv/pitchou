<script lang="ts">
  import { onMount } from "svelte";

  type Scheme = "light" | "dark" | "system";
  let scheme = $state<Scheme>("system");
  let ready = $state(false);
  const choices: { value: Scheme; label: string; description: string; icon: string }[] = [
    {
      value: "light",
      label: "Clair",
      description: "Un fond clair, en permanence.",
      icon: "fr-icon-sun-line",
    },
    {
      value: "dark",
      label: "Sombre",
      description: "Un fond sombre, en permanence.",
      icon: "fr-icon-moon-line",
    },
    {
      value: "system",
      label: "Automatique",
      description: "Suit les préférences de votre appareil.",
      icon: "fr-icon-computer-line",
    },
  ];

  onMount(() => {
    const root = document.documentElement;
    const sync = () => {
      const current = root.dataset.frScheme;
      scheme = current === "light" || current === "dark" ? current : "system";
    };
    sync();
    ready = true;
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-fr-scheme"] });
    return () => observer.disconnect();
  });

  function changeScheme(value: Scheme) {
    scheme = value;
    // DSFR applies the theme, follows system changes and persists the browser preference.
    document.documentElement.dataset.frScheme = value;
  }
</script>

<div
  class="rounded-xl border border-[var(--border-default-grey)] bg-[var(--background-default-grey)] p-5 md:p-6"
>
  <fieldset class="border-0 m-0 p-0 min-w-0" disabled={!ready}>
    <legend class="font-bold text-lg mb-4">Apparence</legend>
    <div class="grid gap-3 sm:grid-cols-3">
      {#each choices as choice (choice.value)}
        <label
          class="theme-choice relative block rounded-lg border p-3 cursor-pointer"
          class:selected={scheme === choice.value}
        >
          <input
            type="radio"
            name="display-scheme"
            value={choice.value}
            checked={scheme === choice.value}
            onchange={() => changeScheme(choice.value)}
            class="sr-only"
          />
          <span class={`theme-preview ${choice.value}`} aria-hidden="true">
            <span class="preview-sidebar"></span>
            <span class="preview-content"><span></span><span></span><span></span></span>
          </span>
          <span class="flex items-center gap-2 mt-3 font-bold">
            <span class={`${choice.icon} fr-icon--sm`} aria-hidden="true"></span>
            {choice.label}
            {#if scheme === choice.value}<span
                class="fr-icon-check-line fr-icon--sm ml-auto"
                aria-hidden="true"
              ></span>{/if}
          </span>
          <span class="block mt-1 text-xs text-[var(--text-mention-grey)]"
            >{choice.description}</span
          >
        </label>
      {/each}
    </div>
  </fieldset>
</div>

<style>
  .theme-choice {
    border-color: var(--border-default-grey);
  }
  .theme-choice:hover {
    background-color: var(--background-alt-grey);
  }
  .theme-choice.selected {
    border-color: var(--border-action-high-blue-france);
    background-color: var(--background-contrast-blue-france);
  }
  .theme-choice:focus-within {
    outline: 2px solid var(--border-action-high-blue-france);
    outline-offset: 3px;
  }
  .theme-preview {
    display: flex;
    height: 5rem;
    border-radius: 0.375rem;
    overflow: hidden;
    border: 1px solid #8885;
    background: #f6f6f6;
  }
  .theme-preview.dark {
    background: #161616;
  }
  .theme-preview.system {
    background: linear-gradient(110deg, #f6f6f6 50%, #161616 50%);
  }
  .preview-sidebar {
    width: 25%;
    background: #9292c544;
    border-right: 1px solid #8883;
  }
  .preview-content {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 1;
    padding: 1rem 0.75rem;
  }
  .preview-content span {
    height: 0.375rem;
    border-radius: 0.125rem;
    background: #92929255;
  }
  .preview-content span:first-child {
    width: 60%;
    background: #8585d9;
  }
  .preview-content span:last-child {
    width: 80%;
  }
</style>
