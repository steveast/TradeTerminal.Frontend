import Chart from '@app/components/Chart';
import { Sidebar } from '@app/components/Sidebar';
import { useModels } from '@app/models';
import { Group } from '@mantine/core';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';

const Terminal = () => {
  const { terminalModel: model } = useModels();

  useEffect(() => {
    if (model.connected && model.isGraphReady) {
      model.getSymbolInfo();
      model.getAccountInfo();
      model.getPositions();
    }
  }, [model.connected, model.isGraphReady]);

  return (
    <Group gap={0} align="top" wrap="nowrap">
      <Chart />
      <Sidebar />
    </Group>
  );
}

export default observer(Terminal);
