<script lang="ts">
  type Props = {
    name: string;
    size?: number;
    label?: string;
  };

  let { name, size = 80, label }: Props = $props();
  const href = $derived(`/artwork/${name}.svg`);
</script>

<svg
  class="fr-artwork shrink-0"
  viewBox="0 0 80 80"
  width={size}
  height={size}
  role={label ? "img" : "presentation"}
  aria-label={label}
  aria-hidden={label ? undefined : "true"}
>
  <use class="fr-artwork-decorative" href="{href}#artwork-decorative" />
  <use class="fr-artwork-minor" href="{href}#artwork-minor" />
  <use class="fr-artwork-major" href="{href}#artwork-major" />
</svg>
