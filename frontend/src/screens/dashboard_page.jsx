import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import perfLogger from '../utils/performanceLogger';

import AdminDashboard from './dashboards/AdminDashboard';
import SupervisorDashboard from './dashboards/SupervisorDashboard';
import MasonDashboard from './dashboards/MasonDashboard';

export default function DashboardPage() {
  const { user } = useAuth();

  useEffect(() => {
    perfLogger.endRoute('/');
    perfLogger.logMount('DashboardPage');
  }, []);

  if (!user) return null;

  const role = (user.role || '').toLowerCase();

  if (role === 'admin') {
    return <AdminDashboard />;
  } else if (role === 'supervisor') {
    return <SupervisorDashboard />;
  } else {
    // SECURITY FIX: Default unknown/custom roles to the most restricted dashboard (Mason)
    return <MasonDashboard />;
  }
}
