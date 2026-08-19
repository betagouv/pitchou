<script lang="ts">
  type Props = {
    log: string;
    truncated: boolean;
  };

  let { log, truncated }: Props = $props();

  let logElement: HTMLPreElement | undefined = $state();
  let autoScroll = true;

  // Follow the log tail unless the admin scrolled up to read something.
  $effect(() => {
    log;
    if (logElement && autoScroll) logElement.scrollTop = logElement.scrollHeight;
  });

  function onLogScroll() {
    if (!logElement) return;
    autoScroll = logElement.scrollHeight - logElement.scrollTop - logElement.clientHeight < 40;
  }
</script>

<div class="fr-mt-2w">
  <h3 class="my-0 text-sm font-semibold">Journal d'exécution</h3>
  {#if truncated}
    <p class="my-0 text-xs text-gray-500">
      Le début du journal a été tronqué (limite de mémoire atteinte).
    </p>
  {/if}
  <pre
    bind:this={logElement}
    onscroll={onLogScroll}
    class="mt-1 max-h-[32rem] overflow-auto rounded bg-gray-900 p-3 text-xs whitespace-pre-wrap text-gray-100">{log ||
      "En attente des premières lignes…"}</pre>
</div>
