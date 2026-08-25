<script lang="ts">
  /**
   * A DSFR pictogram. Unlike an `fr-icon-*` glyph, it is three-colour artwork drawn on an 80×80
   * grid, so it needs room to stay legible. The `<use>` layers let the DSFR recolour it per
   * theme instead of the fills hardcoded in the file.
   */
  type Props = {
    /** File name under `static/artwork`, without the extension. */
    name: string;
    /** Rendered side, in pixels. Below ~32 the fine details of the artwork close up. */
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
