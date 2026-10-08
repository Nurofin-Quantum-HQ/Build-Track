'use strict';

const { buildProjectInsights, sCurve } = require('../services/projectInsights');
const { build } = require('./fixtures/insightsFixture');

const NOW = new Date('2026-06-01T00:00:00Z');

const project = (over = {}) => ({
  _id: 'p1',
  projectName: 'Test',
  dates: { startDate: new Date('2026-01-01T00:00:00Z'), expectedEndDate: new Date('2026-12-31T00:00:00Z') },
  budget: { total: 0 },
  selectedPhases: [
    {
      id: 'ph1',
      phaseName: 'Bell Tower',
      activities: [
        { id: 'a1', name: 'Shaft', completed: true, budgetMaterial: 100, budgetLabour: 100, budgetEquipment: 100 },
        { id: 'a2', name: 'Spire', completed: false, budgetMaterial: 100, budgetLabour: 100, budgetEquipment: 100 },
      ],
    },
  ],
  ...over,
});
const tx = (o) => ({ amount: 100, type: 'Materials', approvalStatus: 'Approved', date: new Date('2026-03-01'), ...o });

describe('buildProjectInsights', () => {
  test('maps transaction types onto the three categories like the activity tracker', () => {
    const out = buildProjectInsights(project(), [
      tx({ type: 'Materials', activityId: 'a1' }),
      tx({ type: 'Wages', activityId: 'a1' }),
      tx({ type: 'Equipment', activityId: 'a1' }),
      tx({ type: 'Expense', activityId: 'a1' }),
    ], NOW);
    const ph = out.phases[0];
    expect(ph.actual).toEqual({ material: 100, labour: 100, equipment: 200, total: 400 });
    expect(ph.activities[0].actual.total).toBe(400);
  });

  test('only approved spend counts; pending is reported separately; income never counts', () => {
    const out = buildProjectInsights(project(), [
      tx({ activityId: 'a1' }),
      tx({ activityId: 'a1', approvalStatus: 'Pending', amount: 50 }),
      tx({ activityId: 'a1', approvalStatus: 'Rejected', amount: 70 }),
      tx({ type: 'Income', amount: 1000 }),
    ], NOW);
    expect(out.spend.actual).toBe(100);
    expect(out.spend.pendingApproval).toBe(50);
    expect(out.spend.pendingCount).toBe(1);
    expect(out.spend.income).toBe(1000);
  });

  test('falls back to the phase plan when the project has no budget', () => {
    const out = buildProjectInsights(project(), [], NOW);
    expect(out.budget.total).toBe(600);
    expect(out.budget.source).toBe('phases');
    expect(out.budget.byCategory.labour.planned).toBe(200);
  });

  test('flags an over-budget phase category and the phase itself', () => {
    const out = buildProjectInsights(project(), [
      tx({ type: 'Wages', activityId: 'a1', amount: 700 }),
    ], NOW);
    const ph = out.phases[0];
    expect(ph.status).toBe('over');
    expect(ph.overCategories).toEqual(['labour']);
    expect(out.alerts.some((a) => a.kind === 'phase_overrun' && a.phaseId === 'ph1')).toBe(true);
    expect(out.health.drivers.join(' ')).toMatch(/over budget/);
  });

  test('earned value uses the 50/50 rule', () => {
    // a1 done (300 earned), a2 started (150 earned) => 450 / 600
    const out = buildProjectInsights(project(), [
      tx({ activityId: 'a1', amount: 300 }),
      tx({ activityId: 'a2', amount: 150 }),
    ], NOW);
    expect(out.performance.earnedValue).toBe(450);
    expect(out.performance.cpi).toBe(1);
    expect(out.progress.workDonePct).toBe(75);
  });

  test('matches spend to a phase by id or name when the activity is unknown', () => {
    const out = buildProjectInsights(project(), [
      tx({ phaseId: 'ph1' }),
      tx({ phase: 'bell tower' }),
      tx({}),
    ], NOW);
    expect(out.phases[0].actual.total).toBe(200);
    expect(out.unallocated.total).toBe(100);
  });

  test('reads YYYY-MM-DD string dates (current Transaction schema)', () => {
    const out = buildProjectInsights(project(), [
      tx({ activityId: 'a1', amount: 100, date: '2026-03-15' }),
      tx({ activityId: 'a1', amount: 50, date: '2026-04-02' }),
    ], NOW);
    expect(out.timeline.monthly.map((m) => m.month)).toEqual(['2026-03', '2026-04']);
    expect(out.timeline.cumulative.find((c) => c.actual === 150)).toBeTruthy();
  });

  test('project.progress fallback accepts a 0–1 fraction or a percentage', () => {
    const bare = { _id: 'x', projectName: 'No phases', budget: { total: 1000 } };
    expect(buildProjectInsights({ ...bare, progress: 0.4 }, [], NOW).progress.workDonePct).toBe(40);
    expect(buildProjectInsights({ ...bare, progress: 40 }, [], NOW).progress.workDonePct).toBe(40);
  });

  test('survives a bare project with no phases, dates or transactions', () => {
    const out = buildProjectInsights({ _id: 'x', projectName: 'Empty' }, [], NOW);
    expect(out.phases).toEqual([]);
    expect(out.performance.cpi).toBeNull();
    expect(out.performance.eac).toBeNull();
    expect(out.health.score).toBe(100);
    expect(out.timeline.cumulative).toEqual([]);
  });

  test('cumulative curve ends at total approved spend and planned reaches the budget', () => {
    const out = buildProjectInsights(project(), [tx({ activityId: 'a1', amount: 250 })], new Date('2027-02-01'));
    const cum = out.timeline.cumulative;
    expect(cum[cum.length - 1].actual).toBe(250);
    expect(Math.max(...cum.map((c) => c.planned))).toBe(600);
  });

  test('budget bridge adds up and per-category forecasts project each category', () => {
    // a1 done: labour 300 vs 100 plan; a2 untouched.
    const out = buildProjectInsights(project({ budget: { total: 700 } }), [
      tx({ type: 'Wages', activityId: 'a1', amount: 300 }),
      tx({ type: 'Materials', activityId: 'a1', amount: 100 }),
      tx({ type: 'Equipment', activityId: 'a1', amount: 100 }),
      tx({ type: 'Materials', amount: 40 }),
    ], NOW);
    const ph = out.phases[0];
    expect(ph.earnedByCat.labour).toBe(100);
    expect(ph.forecastByCat.labour).toBe(600); // 300 spent + 100 left × 3
    expect(ph.forecastByCat.material).toBe(200);
    const b = out.bridge;
    expect(b.budget).toBe(700);
    expect(b.reserve).toBe(-100); // 600 planned in phases, 100 held back
    const sum = b.budget + b.reserve + b.steps.reduce((t, s) => t + s.delta, 0) + b.untagged;
    expect(b.forecast).toBe(sum);
    expect(b.untagged).toBe(40);
  });

  test('sCurve is monotonic and clamped', () => {
    expect(sCurve(-1)).toBe(0);
    expect(sCurve(2)).toBe(1);
    expect(sCurve(0.25)).toBeLessThan(sCurve(0.5));
  });

  test('fixture project tells the Bell Tower story', () => {
    const { insights } = build();
    const bell = insights.phases.find((p) => p.name === 'Bell Tower');
    expect(bell.overCategories).toContain('labour');
    expect(insights.alerts[0].severity).not.toBe('info');
  });
});
