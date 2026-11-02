import { describe, expect, it } from 'vitest';
import {
  FLIGHT_TIME,
  NECK_RADIUS,
  RINGS_PER_ROUND,
  SWAY,
  THROWER,
  bottleAt,
  createState,
  ringPosition,
  step,
  swayOffset,
  toss,
} from './game';

/** Throws at (x, y) with no sway and lets the ring land. */
function throwAndLand(state: ReturnType<typeof createState>, x: number, y: number) {
  state.time = 0;
  expect(toss(state, x, y)).toBe(true);
  step(state, FLIGHT_TIME);
}

describe('ring toss', () => {
  it('starts with a full set of rings, no score and a grid of bottles', () => {
    const state = createState();
    expect(state.rings).toBe(RINGS_PER_ROUND);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.bottles).toHaveLength(15);
    expect(state.landed).toHaveLength(0);
  });

  it('uses one ring per toss', () => {
    const state = createState();
    expect(toss(state, 400, 200)).toBe(true);
    expect(state.rings).toBe(RINGS_PER_ROUND - 1);
    expect(state.flying).toBeDefined();
  });

  it('throws one ring at a time', () => {
    const state = createState();
    toss(state, 400, 200);
    expect(toss(state, 400, 200)).toBe(false);
    expect(state.rings).toBe(RINGS_PER_ROUND - 1);
  });

  it('cannot toss once the rings run out', () => {
    const state = createState();
    state.rings = 0;
    expect(toss(state, 400, 200)).toBe(false);
    expect(state.flying).toBeUndefined();
  });

  it('scores a ring that lands on a bottle neck', () => {
    const state = createState();
    const bottle = state.bottles[0];
    throwAndLand(state, bottle.x + NECK_RADIUS - 1, bottle.y);
    expect(state.score).toBe(bottle.points);
    expect(state.flying).toBeUndefined();
    expect(state.landed).toEqual([{ x: bottle.x, y: bottle.y, ringer: true }]);
  });

  it('scores nothing for a ring that misses every neck', () => {
    const state = createState();
    throwAndLand(state, 5, 100);
    expect(state.score).toBe(0);
    expect(state.landed).toEqual([{ x: 5, y: 100, ringer: false }]);
  });

  it('scores bottles further back higher', () => {
    const state = createState();
    for (const a of state.bottles) {
      for (const b of state.bottles) {
        if (a.y < b.y) expect(a.points).toBeGreaterThan(b.points);
      }
    }
  });

  it('finds the bottle under a point only within the neck', () => {
    const state = createState();
    const bottle = state.bottles[3];
    expect(bottleAt(state, bottle.x, bottle.y + NECK_RADIUS)).toBe(bottle);
    expect(bottleAt(state, bottle.x, bottle.y + NECK_RADIUS + 1)).toBeUndefined();
  });

  it('pushes the throw sideways by the sway', () => {
    const state = createState();
    state.time = 0.4;
    toss(state, 400, 200);
    expect(state.flying!.toX).toBeCloseTo(400 + swayOffset(0.4));
    expect(Math.abs(swayOffset(0.4))).toBeLessThanOrEqual(SWAY);
  });

  it('keeps the ring in the air until its flight is over', () => {
    const state = createState();
    toss(state, 400, 200);
    step(state, FLIGHT_TIME / 2);
    expect(state.flying).toBeDefined();
    expect(state.landed).toHaveLength(0);
  });

  it('flies from the thrower to the landing point', () => {
    const ring = { fromX: THROWER.x, fromY: THROWER.y, toX: 100, toY: 150, age: 0 };
    expect(ringPosition(ring)).toEqual({ x: THROWER.x, y: THROWER.y });
    const end = ringPosition({ ...ring, age: FLIGHT_TIME });
    expect(end.x).toBeCloseTo(100);
    expect(end.y).toBeCloseTo(150);
  });

  it('keeps playing while the last ring is in the air', () => {
    const state = createState();
    state.rings = 1;
    toss(state, 400, 200);
    step(state, FLIGHT_TIME / 2);
    expect(state.phase).toBe('playing');
  });

  it('ends the round when the last ring lands', () => {
    const state = createState();
    for (let i = 0; i < RINGS_PER_ROUND; i++) throwAndLand(state, 5, 100);
    expect(state.rings).toBe(0);
    expect(state.phase).toBe('over');
    expect(toss(state, 400, 200)).toBe(false);
  });
});
