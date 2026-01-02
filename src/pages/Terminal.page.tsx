import Chart from '@app/components/Chart';
import { Sidebar } from '@app/components/Sidebar';
import { useModels } from '@app/models';
import { Group } from '@mantine/core';
import { useForceUpdate } from '@mantine/hooks';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';

const Terminal = () => {
  const { terminalModel: model } = useModels();

  useEffect(() => {
    if (model.connected && model.isGraphReady) {
      model.getSymbolInfo();
      model.getAccountInfo();
      model.getPositions();
      model.getAllOpenOrders();
    }
  }, [model.connected, model.isGraphReady]);

  useEffect(() => {
    if (model.currentPosition) {
      model.setStrategy({
        positionSide: model.currentPosition.positionSide,
        entryPrice: model.currentPosition.entryPrice,
        stopLoss: model.currentPosition.stopLoss.triggerPrice,
        takeProfit: model.currentPosition.takeProfit.triggerPrice,
      });
    }
  }, [model.positions]);

  useEffect(() => {
    document.title = `${model.symbol} Terminal`;
  }, [model.symbol]);

  return (
    <Group gap={0} align="top" wrap="nowrap">
      <Chart />
      <Sidebar />
    </Group>
  );
}

export default observer(Terminal);
