import '@mantine/core/styles.css';

import { MantineProvider } from '@mantine/core';
import { Router } from './Router';
import { theme } from './theme';
import { ModelsContext, models } from '@app/models';

export default function App() {
  return (
    <MantineProvider defaultColorScheme="dark" theme={theme}>
      <ModelsContext.Provider value={models}>
        <Router />
      </ModelsContext.Provider>
    </MantineProvider>
  );
}
