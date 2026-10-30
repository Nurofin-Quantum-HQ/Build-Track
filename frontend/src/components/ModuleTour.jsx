import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Joyride, STATUS } from 'react-joyride';
import { useAuth } from '../contexts/AuthContext';
import { userAPI } from '../api';

const GLOBAL_TOUR_SEQUENCE = [
  { moduleName: 'admin_dashboard', path: '/' },
  { moduleName: 'project_management', path: '/projects' },
  { moduleName: 'manual_entry', path: '/add-entry' },
  { moduleName: 'voice_assistant', path: '/voice' },
  { moduleName: 'transaction_log', path: '/transaction' },
  { moduleName: 'inventory', path: '/inventory' },
  { moduleName: 'reports', path: '/reports' },
  { moduleName: 'settings', path: '/settings' }
];

export default function ModuleTour({ steps, run, setRun, moduleName }) {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!run && localStorage.getItem('globalTourActive') === 'true') {
      const visitedModules = user?.onboarding?.visitedModules || [];
      if (!visitedModules.includes(moduleName)) {
        // Start tour if it's a global tour and the user hasn't visited this module yet
        const timer = setTimeout(() => setRun(true), 500);
        return () => clearTimeout(timer);
      } else {
        // If they already visited this module but global tour is active, automatically skip to next!
        const currentIndex = GLOBAL_TOUR_SEQUENCE.findIndex(m => m.moduleName === moduleName);
        if (currentIndex !== -1 && currentIndex < GLOBAL_TOUR_SEQUENCE.length - 1) {
          const nextModule = GLOBAL_TOUR_SEQUENCE[currentIndex + 1];
          navigate(nextModule.path);
        } else if (currentIndex === GLOBAL_TOUR_SEQUENCE.length - 1) {
          localStorage.removeItem('globalTourActive');
        }
      }
    }
  }, [run, moduleName, user, setRun, navigate]);

  const endTour = (skipped = false) => {
    setRun(false);
    
    if (skipped) {
      localStorage.removeItem('globalTourActive');
    }

    userAPI.visitModule({ moduleName })
      .catch((err) => console.error("Failed to record module visit", err));

    const visitedModules = user?.onboarding?.visitedModules || [];
    if (!visitedModules.includes(moduleName)) {
      updateUser({
        onboarding: {
          ...user?.onboarding,
          visitedModules: [...visitedModules, moduleName]
        }
      });
    }
  };

  const handleJoyrideCallback = (data) => {
    console.log("Joyride Callback Data:", data);
    const { status, action } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

    if (action === 'skip' || status === STATUS.SKIPPED) {
      localStorage.removeItem('globalTourActive');
    }

    if (finishedStatuses.includes(status) || action === 'close' || action === 'skip') {
      endTour(action === 'skip' || status === STATUS.SKIPPED);
    }
  };

  return (
    <>
      {run && steps.length > 0 && (
        <>
          <button
            onClick={() => endTour(true)}
            style={{
              position: 'fixed',
              right: 20,
              bottom: 20,
              zIndex: 10050,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              borderRadius: 12,
              border: 'none',
              background: '#DC2626',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
              cursor: 'pointer',
              boxShadow: '0 8px 20px -4px rgba(220, 38, 38, 0.45)',
            }}
          >
            ✕ Skip Tour
          </button>
          <Joyride
            steps={steps.map(s => ({ ...s, disableBeacon: true }))}
            run={true}
            continuous={true}
            showProgress={true}
            showSkipButton={true}
            locale={{ skip: 'Skip', next: 'Next', back: 'Back', last: 'Finish' }}
            callback={handleJoyrideCallback}
            styles={{ options: {
                primaryColor: '#111317',
                zIndex: 10000,
            } }}
          />
        </>
      )}
    </>
  );
}