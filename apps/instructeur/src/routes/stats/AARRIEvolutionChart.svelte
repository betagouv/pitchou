<script lang="ts">
  import type { IndicatorsAARRI } from "@pitchou/types/API_Pitchou.ts";

  type Props = {
    indicators: IndicatorsAARRI[];
  };

  let { indicators }: Props = $props();

  // SVG geometry (user units, scaled responsively via viewBox)
  const WIDTH = 840;
  const HEIGHT = 360;
  const MARGIN = { top: 16, right: 44, bottom: 64, left: 44 };
  const innerWidth = WIDTH - MARGIN.left - MARGIN.right;
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

  // One curve per AARRI phase. Colors match the bars in IndicatorsAARRI.svelte.
  const series = [
    {
      key: "nombreUtilisateuriceAcquis",
      label: "Acquis",
      color: "var(--artwork-minor-brown-caramel)",
    },
    {
      key: "nombreUtilisateuriceActif",
      label: "Activé",
      color: "var(--artwork-minor-green-menthe)",
    },
    {
      key: "nombreUtilisateuriceRetenu",
      label: "Retenu",
      color: "var(--artwork-minor-yellow-moutarde)",
    },
    {
      key: "nombreUtilisateuriceImpact",
      label: "Impact",
      color: "var(--artwork-minor-red-marianne)",
    },
  ] as const;

  type SeriesKey = (typeof series)[number]["key"];

  // Points ordered chronologically (the API returns them most-recent first).
  let points = $derived([...indicators].sort((a, b) => +new Date(a.date) - +new Date(b.date)));

  let maxValue = $derived(
    Math.max(1, ...points.flatMap((point) => series.map((s) => point[s.key]))),
  );

  // Picks the spacing between Y-axis gridlines so the labels are round numbers
  // (1/2/5 × a power of 10), aiming for ~targetTicks lines. We only plot integer
  // user counts, so the step is clamped to at least 1 (never fractional).
  function niceStep(max: number, targetTicks: number): number {
    const rough = max / targetTicks;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
    const normalized = rough / magnitude;
    const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
    return Math.max(1, step * magnitude);
  }

  let step = $derived(niceStep(maxValue, 4));
  let yMax = $derived(Math.ceil(maxValue / step) * step);
  let yTicks = $derived(Array.from({ length: yMax / step + 1 }, (_, i) => i * step));

  // Show at most ~8 date labels on the x axis to avoid clutter.
  let xLabelStep = $derived(Math.max(1, Math.ceil(points.length / 8)));

  function x(index: number): number {
    if (points.length <= 1) return MARGIN.left + innerWidth / 2;
    return MARGIN.left + (index / (points.length - 1)) * innerWidth;
  }
  function y(value: number): number {
    return MARGIN.top + innerHeight - (value / yMax) * innerHeight;
  }

  function linePath(key: SeriesKey): string {
    return points.map((point, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(point[key])}`).join(" ");
  }

  const shortDateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
  function labelDate(date: string | Date): string {
    return shortDateFormat.format(new Date(date));
  }

  const longDateFormat = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Index of the week currently hovered (null when the cursor is outside).
  let hoveredIndex: number | null = $state(null);

  // Width of one transparent hit area (one per week).
  let columnWidth = $derived(points.length > 1 ? innerWidth / (points.length - 1) : innerWidth);

  // Tooltip box geometry. One header row (date) + one row per phase.
  const TOOLTIP_WIDTH = 172;
  const TOOLTIP_ROW = 18;
  let tooltipHeight = $derived(14 + (series.length + 1) * TOOLTIP_ROW);

  // Keep the tooltip inside the chart: flip it to the left near the right edge.
  function tooltipX(index: number): number {
    const px = x(index);
    return px + 12 + TOOLTIP_WIDTH > WIDTH ? px - 12 - TOOLTIP_WIDTH : px + 12;
  }
</script>

{#if points.length === 0}
  <p>Aucune donnée à afficher pour le moment.</p>
{:else}
  <figure class="aarri-chart">
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Évolution du nombre d'utilisateurices par phase AARRI au cours du temps"
      onmouseleave={() => (hoveredIndex = null)}
    >
      <!-- horizontal gridlines + y axis labels -->
      {#each yTicks as tick}
        <line class="grid" x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y(tick)} y2={y(tick)} />
        <text
          class="axis-label"
          x={MARGIN.left - 8}
          y={y(tick)}
          text-anchor="end"
          dominant-baseline="middle">{tick}</text
        >
      {/each}

      <!-- x axis date labels -->
      {#each points as point, i}
        {#if i % xLabelStep === 0 || i === points.length - 1}
          <text
            class="axis-label"
            x={x(i)}
            y={HEIGHT - MARGIN.bottom + 18}
            text-anchor="end"
            transform={`rotate(-40 ${x(i)} ${HEIGHT - MARGIN.bottom + 18})`}
            >{labelDate(point.date)}</text
          >
        {/if}
      {/each}

      <!-- one curve (+ point markers) per phase -->
      {#each series as s}
        <path class="line" d={linePath(s.key)} fill="none" stroke={s.color} />
        {#each points as point, i}
          <circle class="dot" cx={x(i)} cy={y(point[s.key])} r="3" fill={s.color}>
            <title>{s.label} — {labelDate(point.date)} : {point[s.key]}</title>
          </circle>
        {/each}
        <!-- last (rightmost) value of the curve -->
        <text
          class="value-label"
          x={x(points.length - 1) + 6}
          y={y(points[points.length - 1][s.key])}
          fill={s.color}
          dominant-baseline="middle">{points[points.length - 1][s.key]}</text
        >
      {/each}

      <!-- hover crosshair + tooltip for the hovered week -->
      {#if hoveredIndex !== null}
        {@const hi = hoveredIndex}
        <line
          class="hover-guide"
          x1={x(hi)}
          x2={x(hi)}
          y1={MARGIN.top}
          y2={MARGIN.top + innerHeight}
        />
        {#each series as s}
          <circle class="dot-hover" cx={x(hi)} cy={y(points[hi][s.key])} r="5" fill={s.color} />
        {/each}
        <g transform={`translate(${tooltipX(hi)} ${MARGIN.top})`} pointer-events="none">
          <rect class="tooltip-box" width={TOOLTIP_WIDTH} height={tooltipHeight} rx="4" />
          <text class="tooltip-date" x="8" y="18"
            >{longDateFormat.format(new Date(points[hi].date))}</text
          >
          {#each series as s, j}
            <rect x="8" y={28 + j * TOOLTIP_ROW} width="10" height="10" rx="2" fill={s.color} />
            <text class="tooltip-label" x="24" y={37 + j * TOOLTIP_ROW}>{s.label}</text>
            <text
              class="tooltip-value"
              x={TOOLTIP_WIDTH - 8}
              y={37 + j * TOOLTIP_ROW}
              text-anchor="end">{points[hi][s.key]}</text
            >
          {/each}
        </g>
      {/if}

      <!-- transparent hit areas to detect the hovered week -->
      {#each points as _point, i}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <rect
          class="hit-area"
          x={x(i) - columnWidth / 2}
          y={MARGIN.top}
          width={columnWidth}
          height={innerHeight}
          onmouseenter={() => (hoveredIndex = i)}
        />
      {/each}
    </svg>

    <figcaption class="legend">
      {#each series as s}
        <span class="legend-item">
          <span class="legend-dot" style={`background-color:${s.color}`}></span>
          {s.label}
        </span>
      {/each}
    </figcaption>
  </figure>
{/if}

<style lang="scss">
  .aarri-chart {
    margin: 0;
  }
  svg {
    width: 100%;
    height: auto;
  }
  .grid {
    stroke: var(--border-default-grey, #ddd);
    stroke-width: 1;
  }
  .axis-label {
    fill: var(--text-mention-grey, #666);
    font-size: 12px;
  }
  .line {
    stroke-width: 2.5;
    fill: none;
  }
  .value-label {
    font-size: 13px;
    font-weight: 700;
  }
  .hover-guide {
    stroke: var(--text-mention-grey, #666);
    stroke-width: 1;
    stroke-dasharray: 4 3;
  }
  .dot-hover {
    stroke: var(--background-default-grey, #fff);
    stroke-width: 2;
  }
  .hit-area {
    fill: transparent;
  }
  .tooltip-box {
    fill: var(--background-default-grey, #fff);
    stroke: var(--border-default-grey, #ddd);
    filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.2));
  }
  .tooltip-date {
    font-size: 12px;
    font-weight: 700;
    fill: var(--text-default-grey, #161616);
  }
  .tooltip-label {
    font-size: 12px;
    fill: var(--text-default-grey, #161616);
  }
  .tooltip-value {
    font-size: 12px;
    font-weight: 700;
    fill: var(--text-default-grey, #161616);
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    justify-content: center;
    margin-top: 0.5rem;
  }
  .legend-item {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }
  .legend-dot {
    display: inline-block;
    width: 1rem;
    height: 1rem;
    border-radius: 2px;
  }
</style>
