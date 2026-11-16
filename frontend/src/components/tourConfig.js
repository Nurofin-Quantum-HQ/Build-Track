import { EVENTS, STATUS } from 'react-joyride';

// react-joyride v3 settings shared by the app tour and the page tours.
// (v3 renamed the v2 props: `callback` → `onEvent`, `showSkipButton`/`disableBeacon`/`hideCloseButton`
// → `options.buttons` / `options.skipBeacon`. The v2 names are silently ignored, which is why the
// tours never reported that they had finished.)
export const TOUR_OPTIONS = {
  buttons: ['back', 'close', 'primary', 'skip'],
  closeButtonAction: 'skip', // the × ends the tour instead of jumping to the next step
  showProgress: true,
  skipBeacon: true,
  primaryColor: '#111317',
  zIndex: 10000,
  targetWaitTimeout: 600, // don't hang on a step whose target isn't on screen
  styles: {
    options: {
      primaryColor: '#111317',
      textColor: '#111317',
      zIndex: 10000,
      width: typeof window !== 'undefined' ? Math.min(window.innerWidth - 32, 380) : 360,
    },
    tooltip: {
      borderRadius: 16,
      fontSize: 14,
      padding: '16px 18px',
      boxShadow: '0 12px 36px rgba(0, 0, 0, 0.22)',
    },
    buttonNext: {
      borderRadius: 10,
      padding: '8px 14px',
      fontWeight: 600,
      fontSize: 13,
    },
    buttonBack: {
      borderRadius: 10,
      padding: '8px 14px',
      fontWeight: 600,
      fontSize: 13,
      marginRight: 6,
    },
    buttonSkip: {
      color: '#6F7582',
      fontSize: 13,
    },
  },
};

export const TOUR_LOCALE = { skip: 'Skip', next: 'Next', back: 'Back', last: 'Finish' };

/** True when the event means the tour is over (finished, skipped or closed). */
export function isTourOver(data) {
  if (!data) return false;
  return (
    data.type === EVENTS.TOUR_END ||
    data.status === STATUS.FINISHED ||
    data.status === STATUS.SKIPPED
  );
}

/** Keep only steps whose target is actually on screen (hidden sidebar on phones, role-gated items…). */
export function visibleSteps(steps) {
  return steps.filter((step) => {
    if (step.target === 'body') return true;
    const el = typeof step.target === 'string' ? document.querySelector(step.target) : step.target;
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    return r.right > 0 && r.left < window.innerWidth;
  });
}
