import React, { useEffect, useState } from 'react';
import { Joyride, STATUS } from 'react-joyride';
import { useAuth } from '../contexts/AuthContext';
import { userAPI } from '../api';
import { Modal, Button } from './ui';
import { HelpCircle } from 'lucide-react';

const AppTour = () => {
  const { user, updateUser } = useAuth();
  const [run, setRun] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [dynamicSteps, setDynamicSteps] = useState([]);

  useEffect(() => {
    if (!user) return;

    const onboarding = user.onboarding || {};
    const hasSkippedTour = !!onboarding.hasSkippedTour;
    const visitedModules = onboarding.visitedModules || [];
    const alreadyTookTour = visitedModules.includes('GlobalTour');

    // Ask the user exactly once whether they want the tour.
    // If they already declined, took it, or were dismissed, never prompt again.
    if (!hasSkippedTour && !alreadyTookTour) {
      setPromptOpen(true);
    }
  }, [user]);

  const buildSteps = (isReplay = false) => {
    const onboarding = user?.onboarding || {};
    const hasCreatedProject = !!onboarding.hasCreatedProject;
    const hasAddedEntry = !!onboarding.hasAddedEntry;
    const hasViewedReports = !!onboarding.hasViewedReports;

    const steps = [
      {
        target: 'body',
        content: 'Welcome to BuildTrack! Let us show you around so you can get started quickly.',
        placement: 'center',
      }
    ];

    steps.push({
      target: '.tour-dashboard',
      content: 'This is your Dashboard. Get a quick overview of your projects and recent activity here.',
    });

    if (isReplay || !hasCreatedProject) {
      steps.push({
        target: '.tour-create-project',
        content: 'Click here to create your first project. Projects help you track everything in one place.',
      });
    }

    if (isReplay || !hasAddedEntry) {
      steps.push({
        target: '.tour-add-entry',
        content: 'Once you have a project, you can add an entry like material usage or expense here.',
      });
    }

    steps.push({
      target: '.tour-voice',
      content: 'Use the AI Foreman to quickly log updates using your voice.',
    });

    steps.push({
      target: '.tour-log',
      content: 'View all your recent entries and transactions here.',
    });

    steps.push({
      target: '.tour-inventory',
      content: 'Manage your materials and stock levels efficiently.',
    });

    if (isReplay || !hasViewedReports) {
      steps.push({
        target: '.tour-reports',
        content: 'Check out the reports section to see financial summaries and project stats.',
      });
    }

    steps.push({
      target: '.tour-subscription',
      content: 'Manage your plan, team size, and billing from the Subscription page.',
    });

    steps.push({
      target: '.tour-settings',
      content: 'Configure your profile and app preferences here.',
    });

    return steps;
  };

  const startTour = () => {
    setPromptOpen(false);
    setDynamicSteps(buildSteps(false));
    setRun(true);
  };

  const skipTour = async () => {
    setPromptOpen(false);
    setRun(false);
    try {
      await userAPI.skipOnboarding();
    } catch (err) {
      console.error('Failed to save tour preference', err);
    }
    const onboarding = user?.onboarding || {};
    updateUser({
      onboarding: {
        ...onboarding,
        hasSkippedTour: true,
      },
    });
  };

  const recordTourDone = () => {
    userAPI.visitModule({ moduleName: 'GlobalTour' })
      .catch((err) => console.error('Failed to update onboarding progress', err));
    const visitedModules = user?.onboarding?.visitedModules || [];
    updateUser({
      onboarding: {
        ...user?.onboarding,
        visitedModules: visitedModules.includes('GlobalTour')
          ? visitedModules
          : [...visitedModules, 'GlobalTour'],
      },
    });
  };

  const endTour = () => {
    setRun(false);
    recordTourDone();
  };

  const handleJoyrideCallback = (data) => {
    const { status, action } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status) || action === 'close' || action === 'skip') {
      endTour();
    }
  };

  useEffect(() => {
    const handleReplay = () => {
      setDynamicSteps(buildSteps(true));
      setRun(true);
    };

    window.addEventListener('replay-app-tour', handleReplay);
    return () => window.removeEventListener('replay-app-tour', handleReplay);
  }, [user]);

  if (!user) return null;

  return (
    <>
      <Modal open={promptOpen} onClose={skipTour} title="Welcome to BuildTrack!">
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <HelpCircle size={48} color="#0066cc" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: '#666', lineHeight: 1.5, marginBottom: 24 }}>
            Would you like to take a quick guided tour to learn how BuildTrack works?
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Button variant="primary" onClick={startTour}>
              Yes, take the tour
            </Button>
            <Button variant="secondary" onClick={skipTour}>
              No, skip it
            </Button>
          </div>
        </div>
      </Modal>

      {run && dynamicSteps.length > 0 && (
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

      <Joyride
        callback={handleJoyrideCallback}
        continuous={true}
        hideCloseButton={false}
        run={run}
        scrollToFirstStep={true}
        showProgress={true}
        showSkipButton={true}
        locale={{ skip: 'Skip', next: 'Next', back: 'Back', last: 'Finish' }}
        steps={dynamicSteps.map((s) => ({ ...s, disableBeacon: true }))}
        styles={{ options: {
            zIndex: 10000,
            primaryColor: '#F97316',
            }, beacon: { display: 'none' } }}
      />
    </>
  );
};

export default AppTour;