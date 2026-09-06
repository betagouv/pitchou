<script lang="ts">
  let {
    name,
  }: {
    name:
      | "bold"
      | "italic"
      | "underline"
      | "strike"
      | "align-left"
      | "align-center"
      | "align-right"
      | "align-justify"
      | "clear";
  } = $props();
</script>

<svg class="size-5" viewBox="0 0 24 24" aria-hidden="true">
  {#if name === "bold"}
    <path
      fill="currentColor"
      d="M12.5 4a4.5 4.5 0 0 1 3.256 7.606 4.498 4.498 0 0 1 .926 7.076A4.5 4.5 0 0 1 13.5 20H6V4h6.5Zm.625 9.5H9v4h4.125c1.036 0 1.875-.895 1.875-2s-.84-2-1.875-2Zm-.91-7H9v4h3.214c.987 0 1.786-.895 1.786-2s-.8-2-1.786-2Z"
    />
  {:else if name === "italic"}
    <path fill="currentColor" d="M15 20H7v-2h2.927l2.116-12H9V4h8v2h-2.927l-2.116 12H15v2Z" />
  {:else if name === "underline"}
    <path
      fill="currentColor"
      d="M5 21v-2h14v2H5Zm7-4a6 6 0 0 1-6-6V3h2v8a4 4 0 0 0 8 0V3h2v8a6 6 0 0 1-6 6Z"
    />
  {:else if name === "strike"}
    <path
      fill="currentColor"
      d="M3 11h18v2H3v-2Zm14.154 3c.217.534.346 1.119.346 1.75C17.5 18.65 15.038 21 12 21s-5.5-2.35-5.5-5.25h2C8.5 17.49 10.07 19 12 19s3.5-1.51 3.5-3.25c0-.631-.207-1.22-.563-1.75h2.217ZM12 3c3.038 0 5.5 2.35 5.5 5.25h-2C15.5 6.51 13.93 5 12 5S8.5 6.51 8.5 8.25c0 .631.207 1.22.563 1.75H6.846A5.07 5.07 0 0 1 6.5 8.25C6.5 5.35 8.962 3 12 3Z"
    />
  {:else if name === "align-left"}
    <path fill="currentColor" d="M3 4h18v2H3V4Zm0 15h14v2H3v-2Zm0-5h18v2H3v-2Zm0-5h14v2H3V9Z" />
  {:else if name === "align-center"}
    <path fill="currentColor" d="M3 4h18v2H3V4Zm2 15h14v2H5v-2Zm-2-5h18v2H3v-2Zm2-5h14v2H5V9Z" />
  {:else if name === "align-right"}
    <path fill="currentColor" d="M3 4h18v2H3V4Zm4 15h14v2H7v-2Zm-4-5h18v2H3v-2Zm4-5h14v2H7V9Z" />
  {:else if name === "align-justify"}
    <path fill="currentColor" d="M3 4h18v2H3V4Zm0 15h18v2H3v-2Zm0-5h18v2H3v-2Zm0-5h18v2H3V9Z" />
  {:else}
    <path
      d="M4 7V4h16v3M13 4 8 20M5 20h6m4-5 6 6m0-6-6 6"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  {/if}
</svg>
