import { useEffect, useState } from "react";

/**
 * Returns a value only after it has remained unchanged for the requested delay.
 * Both named and default exports are provided so older imports keep working.
 */
export function useDebounce(value, delay = 350) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timerId = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timerId);
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
