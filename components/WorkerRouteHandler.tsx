import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfiles } from '../lib/database';
import LoadingSpinner from './LoadingSpinner';

interface WorkerRouteHandlerProps {
  children: React.ReactNode;
}

function WorkerRouteHandler({ children }: WorkerRouteHandlerProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      checkUserRole();
    }
  }, [user]);

  const checkUserRole = async () => {
    try {
      if (!user) return;

      const { data: profiles } = await getUserProfiles('', { userId: user.id });
      const profile = profiles?.[0];
      
      if (!profile) {
        console.error('No user profile found');
        setLoading(false);
        return;
      }

      setUserRole(profile.role);

      // Route handling based on role
      const isWorkerRoute = location.pathname.startsWith('/worker-');
      const isWorker = profile.role === 'worker';

      if (isWorker && !isWorkerRoute && location.pathname === '/') {
        // Redirect workers to worker dashboard
        navigate('/worker-dashboard', { replace: true });
      } else if (!isWorker && isWorkerRoute) {
        // Redirect non-workers away from worker routes
        navigate('/', { replace: true });
      }

    } catch (err) {
      console.error('Error checking user role:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Kontrollerar behörigheter..." />
      </div>
    );
  }

  return <>{children}</>;
}

export default WorkerRouteHandler;