import { useModels } from '@app/models';
import { IconChessQueen, IconFishHook } from '@tabler/icons-react';
import { Button, Tabs } from '@mantine/core';
import { useEffect } from 'react';
import { useBinanceWS } from '../exchanges/useBinanceWS';

export function Sidebar() {
  const { terminalModel } = useModels();
  const {
    candle,
    positions,
    status,
    currentSymbol,
    marketBuy,
    connected,
  } = useBinanceWS();

  return (
    <Tabs
      defaultValue={terminalModel.activeTab}
      radius={0}
      onChange={(t) => {
        terminalModel.commit({ activeTab: t as 'stopOne' | 'squeeze' });
      }}
    >
      <Tabs.List>
        <Tabs.Tab value="stopOne" leftSection={<IconChessQueen size={14} />}>
          Stop one
        </Tabs.Tab>
        <Tabs.Tab value="squeeze" leftSection={<IconFishHook size={14} />}>
          Squeeze catcher
        </Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="stopOne">
        <div className="p-8">
          <h1>Binance Futures</h1>
          <p>Статус: {connected ? '✅ Подключено' : '❌ Отключено'} | {status}</p>
          <p>Тикер: {currentSymbol}</p>

          <Button onClick={() => marketBuy(200)}>
            Buy 200
          </Button>

          <pre>Последняя свеча: {candle ? candle.close : '—'}</pre>
          <p>Позиций: {positions.length}</p>
        </div>
      </Tabs.Panel>

      <Tabs.Panel value="squeeze">Squeeze catcher</Tabs.Panel>
    </Tabs>
  );
}
