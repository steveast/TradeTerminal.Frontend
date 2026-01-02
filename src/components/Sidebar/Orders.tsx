import { useModels } from '@app/models';
import { ActionIcon, Group, Stack, Text } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { toJS } from 'mobx';
import { observer } from 'mobx-react-lite';

const Orders = () => {
  const { terminalModel: model } = useModels();
  return (
    <Stack gap="xs" px="md" pt="md">
      {model.allOrders.map((order) => (
        <Group key={order.orderId} wrap="nowrap">
          <Text size="sm">
            {order.symbol}{' '}
            {order.positionSide}{' '}
            {order.type || order.orderType}{' '}
            {order.price || order.triggerPrice}{' '}
            ${(order.price ? order.price * order.origQty : order.triggerPrice * order.quantity).toFixed(model.symbolInfo.precision)}
          </Text>
          <ActionIcon
            ml="auto"
            variant="light"
            color="red"
            aria-label="Close"
            loading={model.loader.has(['cancelOrder', 'cancelAlgoOrder'])}
            onClick={async () => {
              if (order.clientOrderId) {
                await model.cancelOrder(order);
              } else {
                await model.cancelAlgoOrder(order.algoId);
              }
              model.removeOrder(order.clientOrderId || order.algoId);
            }}
          >
            <IconX style={{ width: '70%', height: '70%' }} stroke={1.5} />
          </ActionIcon>
        </Group>
      ))
      }
    </Stack >
  )
};

export default observer(Orders);
