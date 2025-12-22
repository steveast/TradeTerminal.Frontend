export function roundNumbers<T extends Record<string, any>>(
  obj: T,
  precision: number,
): T {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => {
      if (typeof value === 'number') {
        return [key, Number(value.toFixed(precision))];
      }
      return [key, value];
    }),
  ) as T;
}
