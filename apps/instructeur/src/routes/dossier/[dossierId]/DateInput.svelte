<script lang="ts">
  import { format, parse } from "date-fns";
  import toJSONPerserveDate from "@pitchou/common/DateToJSON.ts";
  import DatePicker from "$lib/components/DatePicker.svelte";

  type Props = {
    YYYYMMDD?: string;
    date?: Date | null | undefined;
    id?: string;
    label?: string;
  };

  let {
    YYYYMMDD = "yyyy-MM-dd",
    date = $bindable(undefined),
    id,
    label = "Date",
  }: Props = $props();

  const fallbackId = $props.id();
  const inputId = $derived(id ?? fallbackId);
  const internal = $derived(date ? format(date, YYYYMMDD) : "");

  function setDate(value: string | null) {
    date = typeof value === "string" ? parse(value, YYYYMMDD, new Date()) : undefined;
    if (date) {
      Object.defineProperty(date, "toJSON", { value: toJSONPerserveDate });
    }
  }
</script>

<DatePicker id={inputId} {label} value={internal} onChange={setDate} />
