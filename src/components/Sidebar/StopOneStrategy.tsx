import { useModels } from '@app/models';
import { Button, Slider, Stack, TextInput } from '@mantine/core';
import { observer } from 'mobx-react-lite';

function StopOneStrategy() {
  const { terminalModel: model } = useModels();
  return (
    <Stack gap="xs" p="md">
      <Slider
        color="blue"
        marks={[
          { value: model.deposit * 0.2, label: '20%' },
          { value: model.deposit * 0.33 },
          { value: model.deposit * 0.5, label: '50%' },
          { value: model.deposit * 0.66 },
          { value: model.deposit * 0.8, label: '80%' },
        ]}
        max={model.deposit}
        mb="md"
        radius="xs"
        size="sm"
        value={model.strategy.usdAmount}
        onChange={(usdAmount) => {
          model.strategy.usdAmount = usdAmount;
        }}
      />

      <TextInput
        label="Size"
        placeholder="Position size..."
        radius="xs"
        size="xs"
        variant="filled"
        value={model.strategy.usdAmount}
      />

      <TextInput
        label="Stop"
        placeholder="Stop loss..."
        radius="xs"
        size="xs"
        variant="filled"
        value={model.strategy.stopLoss}
      />

      <TextInput
        label="Take"
        placeholder="Take profit..."
        radius="xs"
        size="xs"
        variant="filled"
        value={model.strategy.takeProfit}
      />

      <Button
        mt="sm"
        radius="xs"
        size="xs"
        variant="filled"
        onClick={() => {

        }}
      >
        Create strategy
      </Button>
    </Stack>
  );
}

export default observer(StopOneStrategy);
