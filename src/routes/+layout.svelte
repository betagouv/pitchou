<script>
  // MUST be the first import
  // cf scripts/front-end/before-ses-lockdown.ts
  import "$front/before-ses-lockdown.ts";

  import { afterNavigate, goto } from "$app/navigation";

  import BandeauEnvironnement from "$front/components/BandeauEnvironnement.svelte";

  let { children } = $props();

  afterNavigate(({ to }) => {
    if (!to) return;
    const urlHasSecret = to.url.searchParams.has("secret");
    if (!urlHasSecret) return;
    const cleaned = new URL(to.url);
    cleaned.searchParams.delete("secret");
    void goto(cleaned, { replaceState: true, invalidateAll: false, noScroll: true });
  });
</script>

<BandeauEnvironnement />

{@render children()}
