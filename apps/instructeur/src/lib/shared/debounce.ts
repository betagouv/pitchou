export default function debounce<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delay: number,
  immediate = false,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: Args | undefined;

  function cancel() {
    clearTimeout(timer);
    timer = undefined;
    pending = undefined;
  }

  function flush() {
    const args = pending;
    cancel();
    if (args) callback(...args);
  }

  function debounced(...args: Args) {
    const callNow = immediate && timer === undefined;
    clearTimeout(timer);
    // Repeated calls after an immediate call still schedule a trailing call.
    pending = callNow ? undefined : args;
    timer = setTimeout(flush, delay);
    if (callNow) callback(...args);
  }

  debounced.cancel = cancel;
  debounced.flush = flush;
  return debounced;
}
