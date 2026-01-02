type PercentFromEntry = {
  stop: number;
  takeProfit: number;
};

const round2 = (value: number) =>
  Math.round(value * 100) / 100;

export function calcPercentsFromEntry(
  entry: number,
  stop: number,
  takeProfit: number
): PercentFromEntry {
  if (entry <= 0) {
    throw new Error('Entry price must be greater than 0');
  }
  console.log(
    entry, stop, takeProfit
  )

  const stopPercent =
    -Math.abs(((stop - entry) / entry) * 100);

  const takeProfitPercent =
    Math.abs(((takeProfit - entry) / entry) * 100);

  return {
    stop: round2(stopPercent),
    takeProfit: round2(takeProfitPercent),
  };
}
