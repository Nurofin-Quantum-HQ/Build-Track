import React, { useCallback, useEffect, useState } from 'react';
import { Joyride } from 'react-joyride';
import { useAuth } from '../contexts/AuthContext';
import { userAPI } from '../api';
import { Modal, Button } from './ui';
import { HelpCircle } from 'lucide-react';
import { TOUR_OPTIONS, TOUR_LOCALE, isTourOver, visibleSteps } from './tourConfig';

const userIdOf = (u) => (u ? String(u._id || u.id || u.email || '') : '');

const tourAlreadyHandled = (u) => {
  const onboarding = u?.onboarding || {};
  return !!onboarding.hasSkippedTour || (onboarding.visitedModules || []).includes('GlobalTour');
};

const AppTour = () => {
  const { user, loading, updateUser } = useAuth();
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState([]);
  // Who answered the prompt this session. The prompt is derived from saved flags (not set in an
  // effect), so profile refreshes that replace the `user` object can't re-open it, even mid-tour.
  const [answeredFor, setAnsweredFor] = useState(null);

  // Old dashboard dialog (removed 13 Nov) left this flag behind; it made page tours auto-start everywhere.
  useEffect(() => {
    try {
      localStorage.removeItem('globalTourActive');
    } catch { /* storage blocked */ }
  }, []);

  const uid = userIdOf(user);
  const promptOpen = !!user && !loading && !run && !tourAlreadyHandled(user) && answeredFor !== uid;

  const markHandled = useCallback((kind) => {
    const onboarding = user?.onboarding || {};
    if (kind === 'skipped') {
      userAPI.skipOnboarding().catch((err) => console.error('Failed to save tour preference', err));
      updateUser({ onboarding: { ...onboarding, hasSkippedTour: true } });
      return;
    }
    userAPI.visitModule({ moduleName: 'GlobalTour' })
      .catch((err) => console.error('Failed to update onboarding progress', err));
    const visited = onboarding.visitedModules || [];
    if (!visited.includes('GlobalTour')) {
      updateUser({ onboarding: { ...onboarding, visitedModules: [...visited, 'GlobalTour'] } });
    }
  }, [user, updateUser]);

  const buildSteps = (isReplay) => {
    const onboarding = user?.onboarding || {};
    const all = [
      {
        target: 'body',
        placement: 'center',
        content: "Here's a quick look around. It takes under a minute.",
      },
      { target: '.tour-dashboard', content: 'Your Dashboard: a quick overview of your projects and recent activity.' },
      {
        target: '.tour-add-entry',
        content: 'Add an entry here: material, labour, equipment or an expense.',
        skipUnless: isReplay || !onboarding.hasAddedEntry,
      },
      {
        target: '.tour-projects',
        content: 'All your projects live here. Create your first one with "New project".',
        skipUnless: isReplay || !onboarding.hasCreatedProject,
      },
      { target: '.tour-voice', content: 'Log updates quickly with your voice.' },
      { target: '.tour-log', content: 'Every entry and transaction, in one list.' },
      {
        target: '.tour-reports',
        content: 'Reports: financial summaries and project stats.',
        skipUnless: isReplay || !onboarding.hasViewedReports,
      },
      { target: '.tour-subscription', content: 'Manage your plan, team size and billing.' },
      { target: '.tour-settings', content: 'Your profile and app preferences.' },
      { target: '.tour-replay', content: 'You can replay this tour any time from here.' },
      // Phones: the sidebar is tucked into a menu, so point at the menu instead (hidden on desktop).
      {
        target: '.tour-menu',
        content: 'Everything lives in this menu: projects, entries, reports and settings. The ? inside it replays this tour.',
      },
    ].filter((s) => s.skipUnless !== false)
      .map(({ skipUnless, ...s }) => s); // eslint-disable-line no-unused-vars
    return visibleSteps(all);
  };

  const start = (isReplay) => {
    setAnsweredFor(uid);
    setSteps(buildSteps(isReplay));
    setRun(true);
    // Count it as seen as soon as it starts, so closing the tab mid-tour never brings the prompt back.
    if (!isReplay) markHandled('taken');
  };

  const skip = () => {
    setAnsweredFor(uid);
    setRun(false);
    markHandled('skipped');
  };

  const endTour = () => setRun(false);

  const onEvent = (data) => {
    if (isTourOver(data)) endTour();
  };

  useEffect(() => {
    const handleReplay = () => start(true);
    window.addEventListener('replay-app-tour', handleReplay);
    return () => window.removeEventListener('replay-app-tour', handleReplay);
  });

  if (!user) return null;

  return (
    <>
      <Modal open={promptOpen} onClose={skip} title="Welcome to BuildTrack!">
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <HelpCircle size={48} color="#0066cc" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: '#666', lineHeight: 1.5, marginBottom: 24 }}>
            Would you like to take a quick guided tour to learn how BuildTrack works?
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Button variant="primary" onClick={() => start(false)}>
              Yes, take the tour
            </Button>
            <Button variant="secondary" onClick={skip}>
              No, skip it
            </Button>
          </div>
        </div>
      </Modal>

      {run && steps.length > 0 && (
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
      )}

      {run && steps.length > 0 && (
        <Joyride
          continuous
          run={run}
          scrollToFirstStep
          steps={steps}
          onEvent={onEvent}
          options={TOUR_OPTIONS}
          locale={TOUR_LOCALE}
        />
      )}
    </>
  );
};

export default AppTour;
