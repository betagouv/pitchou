<script lang="ts">
  type Props = {
    index: number;
    point: any;
    series: readonly { key: string; label: string; color: string }[];
    x: (index: number) => number;
    y: (value: number) => number;
    tooltipX: (index: number) => number;
    marginTop: number;
    innerHeight: number;
    width: number;
    height: number;
    rowHeight: number;
    date: string;
  };

  let {
    index,
    point,
    series,
    x,
    y,
    tooltipX,
    marginTop,
    innerHeight,
    width,
    height,
    rowHeight,
    date,
  }: Props = $props();
</script>

<line
  class="stroke-[var(--text-mention-grey,#666)] stroke-1 [stroke-dasharray:4_3]"
  x1={x(index)}
  x2={x(index)}
  y1={marginTop}
  y2={marginTop + innerHeight}
/>
{#each series as item}
  <circle
    class="stroke-[var(--background-default-grey,#fff)] stroke-2"
    cx={x(index)}
    cy={y(point[item.key])}
    r="5"
    fill={item.color}
  />
{/each}
<g transform={`translate(${tooltipX(index)} ${marginTop})`} pointer-events="none">
  <rect
    class="fill-[var(--background-default-grey,#fff)] stroke-[var(--border-default-grey,#ddd)] [filter:drop-shadow(0_1px_3px_rgba(0,0,0,0.2))]"
    {width}
    {height}
    rx="4"
  />
  <text class="text-[12px] font-bold fill-[var(--text-default-grey,#161616)]" x="8" y="18"
    >{date}</text
  >
  {#each series as item, row}
    <rect x="8" y={28 + row * rowHeight} width="10" height="10" rx="2" fill={item.color} />
    <text
      class="text-[12px] fill-[var(--text-default-grey,#161616)]"
      x="24"
      y={37 + row * rowHeight}>{item.label}</text
    >
    <text
      class="text-[12px] font-bold fill-[var(--text-default-grey,#161616)]"
      x={width - 8}
      y={37 + row * rowHeight}
      text-anchor="end">{point[item.key]}</text
    >
  {/each}
</g>
