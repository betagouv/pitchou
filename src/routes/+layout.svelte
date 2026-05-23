<script>
  // MUST be the first import
  // cf scripts/front-end/before-ses-lockdown.js
  import "$front/before-ses-lockdown.js";

  let { children } = $props();
</script>

{@render children()}
