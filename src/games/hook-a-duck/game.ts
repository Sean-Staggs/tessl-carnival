import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const CASTS = 10;
/** The stream is an oval loop the ducks float round. */
export const STREAM = { x: WIDTH / 2, y: 280, rx: 300, ry: 140 } as const;
/** Laps per second. */
export const DUCK_SPEED = 0.05;
/** Seconds the hook takes to drop from the rod to the water. */
export const DROP_TIME = 0.35;
/** How close the hook must land to a duck's middle to catch it. */
export const CATCH_RADIUS = 26;
/** The number on each duck's base, in order round the stream. */
export const DUCK_VALUES = [10, 20, 10, 50, 10, 30, 10, 20] as const;
const ROD_Y = 50;

export interface Duck {
  /** Position round the loop, from 0 to 1. */
  t: number;
  value: number;
}

export interface Hook {
  x: number;
  y: number;
  /** How far the hook has dropped, from 0 at the rod to 1 at the water. */
  drop: number;
}

export interface Catch {
  x: number;
  y: number;
  value: number;
  age: number;
}

export interface HookADuckState {
  ducks: Duck[];
  hook: Hook | null;
  catches: Catch[];
  casts: number;
  score: number;
  phase: 'playing' | 'over';
}

export function createState(): HookADuckState {
  const ducks = DUCK_VALUES.map((value, i) => ({ t: i / DUCK_VALUES.length, value }));
  return { ducks, hook: null, catches: [], casts: CASTS, score: 0, phase: 'playing' };
}

/** Where a duck is on the canvas. */
export function duckPosition(duck: Duck): { x: number; y: number } {
  const angle = duck.t * Math.PI * 2;
  return { x: STREAM.x + STREAM.rx * Math.cos(angle), y: STREAM.y + STREAM.ry * Math.sin(angle) };
}

/** The duck the hook would catch at this point, or undefined. The nearest one wins. */
export function duckAt(ducks: Duck[], x: number, y: number): Duck | undefined {
  let best: Duck | undefined;
  let bestDistance = CATCH_RADIUS;
  for (const duck of ducks) {
    const pos = duckPosition(duck);
    const distance = Math.hypot(pos.x - x, pos.y - y);
    if (distance <= bestDistance) {
      best = duck;
      bestDistance = distance;
    }
  }
  return best;
}

/** Lowers the hook towards a point. Returns false if no cast was made. */
export function cast(state: HookADuckState, x: number, y: number): boolean {
  if (state.phase !== 'playing' || state.hook || state.casts === 0) return false;
  state.hook = { x, y, drop: 0 };
  state.casts -= 1;
  return true;
}

/** Advances the game by `dt` seconds. */
export function step(state: HookADuckState, dt: number): void {
  for (const duck of state.ducks) duck.t = (duck.t + DUCK_SPEED * dt) % 1;

  const hook = state.hook;
  if (hook) {
    hook.drop = Math.min(hook.drop + dt / DROP_TIME, 1);
    if (hook.drop >= 1) {
      const duck = duckAt(state.ducks, hook.x, hook.y);
      if (duck) {
        state.score += duck.value;
        state.catches.push({ ...duckPosition(duck), value: duck.value, age: 0 });
      }
      state.hook = null;
    }
  }

  for (const caught of state.catches) caught.age += dt;
  state.catches = state.catches.filter((c) => c.age < 1);

  if (state.casts === 0 && !state.hook) state.phase = 'over';
}

function drawDuck(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const { colors } = theme;
  ctx.fillStyle = colors.accent;
  ctx.beginPath();
  ctx.ellipse(x, y, 20, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 12, y - 14, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.stripeA;
  ctx.beginPath();
  ctx.moveTo(x + 20, y - 16);
  ctx.lineTo(x + 30, y - 12);
  ctx.lineTo(x + 20, y - 10);
  ctx.fill();
  ctx.fillStyle = colors.background;
  ctx.beginPath();
  ctx.arc(x + 14, y - 17, 2, 0, Math.PI * 2);
  ctx.fill();
}

function draw(ctx: CanvasRenderingContext2D, state: HookADuckState, aim: { x: number; y: number }) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // The stream: a wooden trough with water running round it.
  ctx.lineWidth = 64;
  ctx.strokeStyle = colors.wood;
  ctx.beginPath();
  ctx.ellipse(STREAM.x, STREAM.y, STREAM.rx, STREAM.ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 52;
  ctx.strokeStyle = colors.water;
  ctx.beginPath();
  ctx.ellipse(STREAM.x, STREAM.y, STREAM.rx, STREAM.ry, 0, 0, Math.PI * 2);
  ctx.stroke();

  for (const duck of state.ducks) {
    const pos = duckPosition(duck);
    drawDuck(ctx, pos.x, pos.y);
  }

  // The rod hangs over the aim, and its line drops the hook while a cast is on.
  const hook = state.hook ?? { x: aim.x, y: aim.y, drop: 0 };
  const hookY = ROD_Y + (hook.y - ROD_Y) * hook.drop;
  ctx.strokeStyle = colors.wood;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(hook.x - 60, ROD_Y - 6);
  ctx.lineTo(hook.x, ROD_Y);
  ctx.stroke();
  ctx.strokeStyle = colors.text;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(hook.x, ROD_Y);
  ctx.lineTo(hook.x, hookY);
  ctx.stroke();
  ctx.strokeStyle = colors.muted;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(hook.x - 6, hookY + 6, 6, 0, Math.PI);
  ctx.stroke();

  // Aim marker on the water.
  if (!state.hook && state.phase === 'playing') {
    ctx.strokeStyle = colors.text;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(aim.x, aim.y, CATCH_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Each catch shows the number from the duck's base.
  ctx.font = canvasFont('title', 'bold');
  ctx.textAlign = 'center';
  ctx.fillStyle = colors.accent;
  for (const caught of state.catches) {
    ctx.globalAlpha = 1 - caught.age;
    ctx.fillText(`+${caught.value}`, caught.x, caught.y - 30 - caught.age * 40);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Casts ${state.casts}/${CASTS}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of casts! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const hookADuck: CarnivalGame = {
  id: 'hook-a-duck',
  name: 'Hook a Duck',
  description: 'Hook the rubber ducks as they float by. Every duck has a number on its base.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const aim = { x: WIDTH / 2, y: STREAM.y + STREAM.ry };

    const toCanvas = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
      };
    };
    const onMove = (event: PointerEvent) => Object.assign(aim, toCanvas(event));
    const onDown = (event: PointerEvent) => {
      Object.assign(aim, toCanvas(event));
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
      } else {
        cast(state, aim.x, aim.y);
      }
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't teleport everything.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(hookADuck.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state, aim);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default hookADuck;
