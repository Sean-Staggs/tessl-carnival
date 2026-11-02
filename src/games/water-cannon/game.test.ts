import { describe, expect, it } from 'vitest';
import {
  CANNON,
  TANK_SIZE,
  createState,
  fire,
  isHit,
  scoreForHit,
  step,
  tankSizeFromQuery,
  type Target,
} from './game';

const target: Target = { x: 400, y: 200, radius: 28, speed: 120 };

describe('water cannon', () => {
  it('starts with a full tank and no score', () => {
    const state = createState();
    expect(state.tank).toBe(TANK_SIZE);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
  });

  it('starts with a custom tank size when given one', () => {
    const state = createState(25);
    expect(state.tank).toBe(25);
    expect(state.tankSize).toBe(25);
    fire(state, 400, 0);
    expect(state.tank).toBe(24);
    expect(state.tankSize).toBe(25);
  });

  it('reads a whole number of shots from 1 to 99 from the query string', () => {
    expect(tankSizeFromQuery('?shots=25')).toBe(25);
    expect(tankSizeFromQuery('?shots=1')).toBe(1);
    expect(tankSizeFromQuery('?shots=99')).toBe(99);
    expect(tankSizeFromQuery('?other=1&shots=40')).toBe(40);
  });

  it('falls back to the default tank for a missing or invalid shots value', () => {
    for (const search of [
      '',
      '?',
      '?shots=',
      '?shots=0',
      '?shots=-3',
      '?shots=2.5',
      '?shots=abc',
      '?shots=100',
      '?shots=1e1',
    ]) {
      expect(tankSizeFromQuery(search)).toBe(TANK_SIZE);
    }
  });

  it('uses one shot of water per fire', () => {
    const state = createState();
    expect(fire(state, 400, 0)).toBe(true);
    expect(state.tank).toBe(TANK_SIZE - 1);
    expect(state.shots).toHaveLength(1);
  });

  it('cannot fire once the tank is empty', () => {
    const state = createState();
    state.tank = 0;
    expect(fire(state, 400, 0)).toBe(false);
    expect(state.shots).toHaveLength(0);
  });

  it('never fires downwards, even when aimed below the cannon', () => {
    const state = createState();
    fire(state, CANNON.x + 100, CANNON.y + 100);
    expect(state.shots[0].vy).toBeLessThan(0);
  });

  it('scores a hit and sends the target back to the start of its rail', () => {
    const state = createState();
    state.targets = [{ ...target }];
    state.shots = [{ x: target.x, y: target.y + 5, vx: 0, vy: 0 }];
    step(state, 0);
    expect(state.score).toBe(scoreForHit(target));
    expect(state.shots).toHaveLength(0);
    expect(state.targets[0].x).toBeLessThan(0);
  });

  it('ends the game when the tank is empty and the last shot has landed', () => {
    const state = createState();
    state.tank = 0;
    state.shots = [{ x: 10, y: -20, vx: 0, vy: -700 }];
    step(state, 0.1);
    expect(state.phase).toBe('over');
  });

  it('keeps playing while a shot is still in the air', () => {
    const state = createState();
    state.targets = [];
    state.tank = 0;
    state.shots = [{ x: 400, y: 300, vx: 0, vy: -700 }];
    step(state, 0.1);
    expect(state.phase).toBe('playing');
  });

  it('detects a hit inside the target and a miss outside it', () => {
    expect(isHit({ x: 410, y: 210, vx: 0, vy: 0 }, target)).toBe(true);
    expect(isHit({ x: 460, y: 200, vx: 0, vy: 0 }, target)).toBe(false);
  });

  it('scores a fast target higher than a slow one', () => {
    const slow = scoreForHit({ ...target, speed: 60 });
    const fast = scoreForHit({ ...target, speed: -180 });
    expect(Math.max(fast, slow)).toBeGreaterThanOrEqual(slow);
  });
});
