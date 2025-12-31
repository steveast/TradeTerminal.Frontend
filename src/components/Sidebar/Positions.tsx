import { useModels } from '@app/models';
import { Group, RingProgress, Stack, Text } from '@mantine/core';
import { IconArrowsCross, IconCoinBitcoin, IconLockBitcoin } from '@tabler/icons-react';
import { observer } from 'mobx-react-lite';

const Positions = () => {
  const { terminalModel: model } = useModels();
  return (
    <Stack gap="xs" px="md" pt="md">
      {model.positions.map((pos) => (
        <Group mb="xs" key={pos.updateTime} wrap="nowrap">
          <Stack gap={0}>
            <Group gap={0}><IconCoinBitcoin />{pos.isolated ? <IconLockBitcoin /> : <IconArrowsCross />} <Text ml="xs" fw={500} c="teal.4">{pos.symbol}</Text></Group>
            <Group gap="xs"><Text>Entry: {pos.entryPrice} BE: {pos.breakEvenPrice}</Text></Group>
            <Group gap="xs"><Text>Margin: {pos.initialMargin}x{pos.leverage}</Text></Group>
            <Group gap="xs"><Text>Notional: {pos.notional}</Text></Group>
            <Group gap="xs"><Text c={pos.unrealizedProfit > 0 ? 'green' : 'red'}>PnL: {pos.unrealizedProfit}</Text></Group>
          </Stack>
          <RingProgress
            label={
              <Text size="xs" ta="center">
                Margin/PnL
              </Text>
            }
            ml="auto"
            size={120}
            thickness={10}
            sections={[
              {
                value: 100,
                color: 'blue',
                tooltip: 'Initial margin',
              },
              {
                value: (pos.unrealizedProfit / pos.initialMargin) * 100,
                color: pos.unrealizedProfit > 0 ? 'green' : 'red',
                tooltip: 'P&L',
              },
            ]}
          />
        </Group>
      ))
      }
    </Stack >
  )
};

export default observer(Positions);
