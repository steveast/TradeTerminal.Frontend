import { useModels } from '@app/models';
import { IconChessQueen, IconFishHook } from '@tabler/icons-react';
import { Tabs } from '@mantine/core';
import StopOneStrategy from './StopOneStrategy';
import Positions from './Positions';

export function Sidebar() {
  const { terminalModel: model } = useModels();

  return (
    <Tabs
      defaultValue={model.activeTab}
      radius={0}
      onChange={(t) => {
        model.commit({ activeTab: t as 'stopOne' | 'squeeze' });
      }}
    >
      <Tabs.List>
        <Tabs.Tab value="stopOne" leftSection={<IconChessQueen size={14} />}>
          Stop one strategy
        </Tabs.Tab>
        <Tabs.Tab value="squeeze" leftSection={<IconFishHook size={14} />}>
          Squeeze catcher strategy
        </Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="stopOne">
        <StopOneStrategy />
        <Positions />
      </Tabs.Panel>

      <Tabs.Panel value="squeeze">Squeeze catcher</Tabs.Panel>
    </Tabs>
  );
}
