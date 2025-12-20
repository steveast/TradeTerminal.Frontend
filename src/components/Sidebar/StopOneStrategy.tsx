import { Stack } from "@mantine/core";
import { useBinanceWS } from "../exchanges/useBinanceWS";

export default function StopOneStrategy() {
  const {
    candle,
    positions,
    status,
    currentSymbol,
    marketBuy,
    connected,
  } = useBinanceWS();
  return (
    <Stack p="md">
      Status: {connected ? 'Ok' : '-'}
    </Stack>
  );
}