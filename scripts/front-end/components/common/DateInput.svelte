<script lang="ts">
  import { run } from "svelte/legacy";

  import { format, parse } from "date-fns";
  import toJSONPerserveDate from "../../../commun/DateToJSON";

  type Props = {
    YYYYMMDD?: string;
    date?: Date | null | undefined;
    id?: string;
  };

  let { YYYYMMDD = "yyyy-MM-dd", date = $bindable(undefined), id }: Props = $props();

  let internal: string | null | undefined = $state();

  const input = (x: Date | null | undefined) => (internal = x && format(x, YYYYMMDD));
  const output = (x: string | null | undefined) => {
    date = typeof x === "string" ? parse(x, YYYYMMDD, new Date()) : undefined;
    if (date) {
      Object.defineProperty(date, "toJSON", { value: toJSONPerserveDate });
    }
    return date;
  };

  run(() => {
    input(date);
  });
  run(() => {
    output(internal);
  });
</script>

<input {id} type="date" class="fr-input" bind:value={internal} />

<style lang="scss">
  input {
    padding-right: 0.4rem;
    padding-left: 0.5rem;
  }
</style>
