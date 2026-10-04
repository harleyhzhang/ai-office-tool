export function debounce<Args extends unknown[]>(fn: (...args: Args) => void, delay = 500) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: Args | undefined;
  const cancel = () => { clearTimeout(timer); timer = undefined; pending = undefined; };
  const flush = () => {
    const args = pending;
    cancel();
    if (args) fn(...args);
  };
  const debounced = (...args: Args) => {
    clearTimeout(timer);
    pending = args;
    timer = setTimeout(flush, delay);
  };
  return Object.assign(debounced, { flush, cancel });
}
