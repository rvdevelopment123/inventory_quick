import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const MainLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <header className="header">
        <div className="logo">Inventory Quick</div>
        <nav className="nav">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>Dashboard</NavLink>
          <NavLink to="/items" className={({ isActive }) => isActive ? 'active' : ''}>Items</NavLink>
          <NavLink to="/operations" className={({ isActive }) => isActive ? 'active' : ''}>Operations</NavLink>
          <NavLink to="/reports" className={({ isActive }) => isActive ? 'active' : ''}>Reports</NavLink>
        </nav>
        <div className="user-menu">
          <span>{user?.username}</span>
          <button onClick={handleLogout} className="btn btn-outline btn-sm">Logout</button>
        </div>
      </header>

      <main className="main-content">
        <div className="container">
          <Outlet />
        </div>
      </main>

      <style>{`
        .layout {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .header {
          background-color: var(--surface-color);
          border-bottom: 1px solid var(--border-color);
          padding: 0 2rem;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .logo {
          font-weight: 700;
          font-size: 1.25rem;
          color: var(--primary-color);
        }

        .nav {
          display: flex;
          gap: 2rem;
        }

        .nav a {
          text-decoration: none;
          color: var(--text-secondary);
          font-weight: 500;
          padding: 0.5rem 0;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
        }

        .nav a:hover {
          color: var(--primary-color);
        }

        .nav a.active {
          color: var(--primary-color);
          border-bottom-color: var(--primary-color);
        }

        .user-menu {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .main-content {
          flex: 1;
          padding: 2rem 0;
        }

        .btn-sm {
          padding: 0.25rem 0.75rem;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
};

export default MainLayout;
