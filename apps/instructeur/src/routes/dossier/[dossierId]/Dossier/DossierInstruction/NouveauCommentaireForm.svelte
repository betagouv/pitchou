<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    content = $bindable(""),
    input = $bindable(),
    pending,
    onSubmit,
    children,
  }: {
    content: string;
    input: HTMLTextAreaElement | undefined;
    pending: boolean;
    onSubmit: () => Promise<void>;
    children: Snippet;
  } = $props();
</script>

<form
  class="flex items-start gap-3"
  onsubmit={(event) => {
    event.preventDefault();
    void onSubmit();
  }}
>
  {@render children()}
  <div class="flex grow flex-col items-end gap-2">
    <textarea
      bind:this={input}
      class="fr-input resize-y"
      id="nouveau-commentaire"
      aria-label="Laissez un commentaire"
      placeholder="Laissez un commentaire…"
      rows={2}
      disabled={pending}
      bind:value={content}></textarea>
    {#if content.trim()}
      <button type="submit" class="fr-btn fr-btn--sm" disabled={pending}>Commenter</button>
    {/if}
  </div>
</form>
