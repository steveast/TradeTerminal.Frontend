import { useModels } from '@app/models';
import { Box } from '@mantine/core';
import StopOneStrategy from './StopOneStrategy';
import Positions from './Positions';

export function Sidebar() {
  const { terminalModel: model } = useModels();

  return (
    <Box w="25vw">
      <StopOneStrategy />
      <Positions />
    </Box>
  );
}
