import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './components/core/MainLayout';

import { NotificationProvider } from './context/NotificationContext';
import Login from './components/screens/Login';
import InventoryView from './components/screens/Inventory';
import ItemManagement from './components/screens/Items';
import InventoryOperations from './components/screens/Operations';
import Reports from './components/screens/Reports';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const App = () => {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }>
              <Route index element={<InventoryView />} />
              <Route path="items" element={<ItemManagement />} />
              <Route path="operations" element={<InventoryOperations />} />
              <Route path="reports" element={<Reports />} />
            </Route>
          </Routes>
        </AuthProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
};

export default App;
