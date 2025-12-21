import Chart from '@app/components/Chart';
import { Sidebar } from '@app/components/Sidebar';
import { Group } from '@mantine/core';

export const Terminal = () => {
  return (
    <Group gap={0} align="top">
      <Chart />
      <Sidebar />
    </Group>
  );
}
