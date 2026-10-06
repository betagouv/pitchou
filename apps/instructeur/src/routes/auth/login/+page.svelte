<script lang="ts">
  import ProConnectLogin from "../../ProConnectLogin.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const loginHref = $derived(`/auth/proconnect?redirectTo=${encodeURIComponent(data.redirectTo)}`);
</script>

<ProConnectLogin href={loginHref} />
