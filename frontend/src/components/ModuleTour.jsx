import React, { useEffect, useMemo } from 'react';
import { Joyride } from 'react-joyride';
import { useAuth } from '../contexts/AuthContext';
import { userAPI } from '../api';
import { TOUR_OPTIONS, TOUR_LOCALE, isTourOver, visibleSteps } from './tourConfig';

// Per-page tour, started from a page's "Page tour" (?) button.
export default function ModuleTour({ steps, run, setRun, moduleName }) {
  const { user, updateUser } = useAuth();

  const endTour = () => {
    setRun(false);

    userAPI.visitModule({ moduleName })
      .catch((err) => console.error('Failed to record module visit', err));

    const visitedModules = user?.onboarding?.visitedModules || [];
    if (!visitedModules.includes(moduleName)) {
      updateUser({
        onboarding: {
          ...user?.onboarding,
          visitedModules: [...visitedModules, moduleName],
        },
      });
    }
  };

  const onEvent = (data) => {
    if (isTourOver(data)) endTour();
  };

  // Computed once per start, so re-renders don't hand Joyride a new steps array mid-tour.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const shown = useMemo(() => (run ? visibleSteps(steps) : []), [run]);
  // Nothing on screen to point at: reset, so the page's "Page tour" button keeps working.
  useEffect(() => {
    if (run && shown.length === 0) setRun(false);
  }, [run, shown, setRun]);
  if (!run || shown.length === 0) return null;

  return (
    <>
      <button
        onClick={endTour}
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
        continuous
        run
        steps={shown}
        onEvent={onEvent}
        options={TOUR_OPTIONS}
        locale={TOUR_LOCALE}
      />
    </>
  );
}
