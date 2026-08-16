import { describe, expect, it } from 'vitest';
import { appReducer, initialAppState } from '../../src/utils/appState';

describe('application selection and filters', () => {
  it('selects and clears a mesh', () => {
    const selected = appReducer(initialAppState, { type: 'select_mesh', meshId: 25 });
    expect(selected.selectedMeshId).toBe(25);
    expect(appReducer(selected, { type: 'clear_selection' }).selectedMeshId).toBeNull();
  });

  it('toggles an evaluation class without mutating the prior state', () => {
    const next = appReducer(initialAppState, {
      type: 'toggle_evaluation_class',
      evaluationClass: 'FP',
    });
    expect(next.evaluationClasses).not.toContain('FP');
    expect(initialAppState.evaluationClasses).toContain('FP');
  });

  it('resets all filter choices while preserving the current selection', () => {
    const filtered = {
      ...initialAppState,
      selectedMeshId: 25,
      evaluationClasses: ['TP'] as const,
      changeTypes: ['REBUILDING'] as const,
    };
    const reset = appReducer(
      {
        ...filtered,
        evaluationClasses: [...filtered.evaluationClasses],
        changeTypes: [...filtered.changeTypes],
      },
      { type: 'reset_filters' },
    );
    expect(reset.selectedMeshId).toBe(25);
    expect(reset.evaluationClasses).toHaveLength(5);
    expect(reset.changeTypes).toEqual([]);
  });
});
