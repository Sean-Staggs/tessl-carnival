import { describe, expect, it } from 'vitest';
import {
  CASTS,
  CATCH_RADIUS,
  DROP_TIME,
  DUCK_SPEED,
  DUCK_VALUES,
  cast,
  createState,
  duckAt,
  duckPosition,
  step,
  type Duck,
} from './game';

describe('hook a duck', () => {
  it('starts with every cast left, no score and the ducks on the stream', () => {
    const state = createState();
    expect(state.casts).toBe(CASTS);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.ducks.map((d) => d.value)).toEqual([...DUCK_VALUES]);
  });

  it('floats the ducks round the loop and back to the start', () => {
    const state = createState();
    const start = state.ducks[0].t;
    step(state, 0.5);
    expect(state.ducks[0].t).toBeCloseTo(start + DUCK_SPEED * 0.5);
    for (let i = 0; i < 1 / (DUCK_SPEED * 0.05); i++) step(state, 0.05);
    expect(state.ducks[0].t).toBeCloseTo(start + DUCK_SPEED * 0.5, 5);
    expect(state.ducks[0].t).toBeLessThan(1);
  });

  it('uses one cast per hook', () => {
    const state = createState();
    expect(cast(state, 100, 100)).toBe(true);
    expect(state.casts).toBe(CASTS - 1);
    expect(state.hook).not.toBeNull();
  });

  it('cannot cast while the hook is still dropping', () => {
    const state = createState();
    cast(state, 100, 100);
    expect(cast(state, 200, 200)).toBe(false);
    expect(state.casts).toBe(CASTS - 1);
  });

  it('cannot cast once the casts are used up', () => {
    const state = createState();
    state.casts = 0;
    expect(cast(state, 100, 100)).toBe(false);
  });

  it('scores the number on the base of the duck the hook lands on', () => {
    const state = createState();
    const duck: Duck = { t: 0.25, value: 50 };
    state.ducks = [duck];
    // Aim where the duck will be when the hook reaches the water.
    const target = duckPosition({ ...duck, t: duck.t + DUCK_SPEED * DROP_TIME });
    cast(state, target.x, target.y);
    step(state, DROP_TIME);
    expect(state.score).toBe(50);
    expect(state.hook).toBeNull();
    expect(state.catches).toHaveLength(1);
  });

  it('scores nothing when the hook misses', () => {
    const state = createState();
    state.ducks = [{ t: 0, value: 50 }];
    const pos = duckPosition(state.ducks[0]);
    cast(state, pos.x, pos.y + CATCH_RADIUS * 3);
    step(state, DROP_TIME);
    expect(state.score).toBe(0);
    expect(state.hook).toBeNull();
  });

  it('catches the nearest duck when two are in reach', () => {
    const near: Duck = { t: 0, value: 10 };
    const far: Duck = { t: 0.01, value: 50 };
    const pos = duckPosition(near);
    expect(duckAt([far, near], pos.x, pos.y)).toBe(near);
  });

  it('ends the round after the last cast lands', () => {
    const state = createState();
    state.casts = 1;
    cast(state, 0, 0);
    step(state, DROP_TIME / 2);
    expect(state.phase).toBe('playing');
    step(state, DROP_TIME);
    expect(state.phase).toBe('over');
  });

  it('cannot cast once the round is over', () => {
    const state = createState();
    state.phase = 'over';
    expect(cast(state, 100, 100)).toBe(false);
  });
});
