import { Outlet } from 'react-router-dom';
import { DataProvider } from './context/DataContext';

// This layout wraps DataProvider only around protected routes
// So API calls only happen AFTER login, never on the login page
export default function DataLayout() {
  return (
    <DataProvider>
      <Outlet />
    </DataProvider>
  );
}