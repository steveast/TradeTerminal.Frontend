import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Terminal from './pages/Terminal.page';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Terminal />,
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}
