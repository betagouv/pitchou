<script lang="ts">
  let { email }: { email: string } = $props();

  let status = $state<"idle" | "copied" | "error">("idle");

  const message = $derived(
    status === "copied"
      ? "Adresse e-mail copiée."
      : status === "error"
        ? "Copie impossible. Vous pouvez sélectionner l'adresse pour la copier."
        : "",
  );

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(email);
      status = "copied";
    } catch {
      status = "error";
    }
  }
</script>

<div class="min-w-0">
  <div class="flex min-w-0 items-center gap-1">
    <span class="min-w-0 font-semibold [overflow-wrap:anywhere]">{email}</span>
    <button
      type="button"
      class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm shrink-0"
      class:fr-icon-clipboard-line={status !== "copied"}
      class:fr-icon-check-line={status === "copied"}
      aria-label={`Copier l'adresse e-mail ${email}`}
      title={message || "Copier l'adresse e-mail"}
      onclick={copyEmail}
    ></button>
  </div>
  <span role="status" class="sr-only">{message}</span>
  {#if status === "error"}
    <span class="text-xs text-[color:var(--text-default-error)]">Copie impossible</span>
  {/if}
</div>
