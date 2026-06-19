<script lang="ts">
  import { page } from "$app/state";
  import ErrorPage from "$front/components/screens/ErrorPage.svelte";
</script>

<ErrorPage status={page.status} message={page.error?.message} />
