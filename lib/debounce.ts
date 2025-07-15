export function debounce<T extends (...args: Parameters<T>) => void>(fn: T, delay = 500) {
  let t: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}
