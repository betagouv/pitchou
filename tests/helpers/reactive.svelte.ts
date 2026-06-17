/**
 * Returns a reactive (`$state` proxy) version of the given object.
 *
 * Useful in component tests: when a component does `bind:value={prop.field}`,
 * Svelte expects `prop` to be reactive state (which parent components always
 * pass). Passing a plain object literal triggers the
 * `binding_property_non_reactive` warning.
 */
export function reactive<T extends object>(value: T): T {
  let state = $state(value);
  return state;
}
