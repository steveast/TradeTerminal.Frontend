import { useModels } from '@app/models';
import { Button, NumberInput, Slider, Stack } from '@mantine/core';
import { observer } from 'mobx-react-lite';

function StopOneStrategy() {
  const { terminalModel: model } = useModels();

  return (
    <Stack gap="xs" px="md" pt="md">
      <Slider
        key={model.notional}
        color="blue"
        marks={[
          { value: model.notional * 0.2, label: '20%' },
          { value: model.notional * 0.33 },
          { value: model.notional * 0.5, label: '50%' },
          { value: model.notional * 0.66 },
          { value: model.notional * 0.8, label: '80%' },
        ]}
        domain={[0, model.notional]}
        max={model.strategy.usdAmount}
        mb="md"
        radius="xs"
        size="sm"
        step={Math.max(1, Math.floor(model.notional / 1000))}
        value={model.strategy.usdAmount}
        onChange={(usdAmount) => {
          model.modifyStrategy({ usdAmount });
        }}
      />

      <NumberInput
        label="Size"
        placeholder="Position size..."
        radius="xs"
        size="xs"
        variant="filled"
        value={model.strategy.usdAmount}
      />

      <NumberInput
        label="Stop"
        placeholder="Stop loss..."
        radius="xs"
        size="xs"
        disabled={model.hasPosition}
        variant="filled"
        // onChange={(v) => model.modifyStrategy({ stopLoss: Number(v) })}
        value={model.strategy.stopLoss}
      />

      <NumberInput
        label="Take"
        placeholder="Take profit..."
        radius="xs"
        size="xs"
        max={model.hasPosition ? model.currentPrice : undefined}
        variant="filled"
        // onChange={(v) => model.modifyStrategy({ takeProfit: Number(v) })}
        value={model.strategy.takeProfit}
      />

      <Button
        mt="sm"
        radius="xs"
        size="xs"
        variant="filled"
        onClick={() => {
          if (model.hasPosition) {
            model.updateStrategy();
          } else if (model.unrealizedStrategy) {
            model.cancelAllOrders();
            model.runStrategy();
          }
        }}
      >
        {model.hasPosition || model.unrealizedStrategy ? 'Update strategy' : 'Create strategy'}
      </Button>
    </Stack>
  );
}

export default observer(StopOneStrategy);
