import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const RINGS_PER_ROUND = 8;
/** Seconds a ring spends in the air. */
export const FLIGHT_TIME = 0.6;
/** How close to the middle of a neck a ring must land to score. */
export const NECK_RADIUS = 12;
/** The thrower's hand sways the aim side to side by up to this many pixels. */
export const SWAY = 40;
/** Radians per second of the sway. */
const SWAY_SPEED = 2.5;
export const THROWER = { x: WIDTH / 2, y: HEIGHT - 30 } as const;
const BOTTLES_PER_ROW = 5;
const BOTTLE_SPACING = 110;
/** Back row first: the further back a bottle stands, the more it scores. */
const ROWS = [
  { y: 130, points: 30 },
  { y: 200, points: 20 },
  { y: 270, points: 10 },
];

export interface Bottle {
  /** The middle of the bottle's neck, where a ring has to land. */
  x: number;
  y: number;
  points: number;
}

export interface FlyingRing {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** Seconds since the throw. */
  age: number;
}

export interface LandedRing {
  x: number;
  y: number;
  /** Whether the ring landed on a neck. */
  ringer: boolean;
}

export interface RingTossState {
  bottles: Bottle[];
  flying: FlyingRing | undefined;
  landed: LandedRing[];
  rings: number;
  score: number;
  /** Seconds since the round started; drives the sway. */
  time: number;
  phase: 'playing' | 'over';
}

export function createState(): RingTossState {
  const bottles = ROWS.flatMap((row) =>
    Array.from({ length: BOTTLES_PER_ROW }, (_, i) => ({
      x: WIDTH / 2 + (i - (BOTTLES_PER_ROW - 1) / 2) * BOTTLE_SPACING,
      y: row.y,
      points: row.points,
    })),
  );
  return {
    bottles,
    flying: undefined,
    landed: [],
    rings: RINGS_PER_ROUND,
    score: 0,
    time: 0,
    phase: 'playing',
  };
}

/** How far the thrower's hand has swayed sideways at this moment. */
export function swayOffset(time: number): number {
  return SWAY * Math.sin(time * SWAY_SPEED);
}

/** The bottle whose neck a ring landing at (x, y) goes over, if any. */
export function bottleAt(state: RingTossState, x: number, y: number): Bottle | undefined {
  return state.bottles.find((b) => Math.hypot(x - b.x, y - b.y) <= NECK_RADIUS);
}

/**
 * Throws one ring at the aim point, pushed sideways by the current sway.
 * Only one ring flies at a time. Returns false if nothing was thrown.
 */
export function toss(state: RingTossState, aimX: number, aimY: number): boolean {
  if (state.phase !== 'playing' || state.rings === 0 || state.flying) return false;
  state.flying = {
    fromX: THROWER.x,
    fromY: THROWER.y,
    toX: aimX + swayOffset(state.time),
    toY: Math.min(aimY, THROWER.y),
    age: 0,
  };
  state.rings -= 1;
  return true;
}

/** Where a flying ring is now: a straight line, lifted into an arc. */
export function ringPosition(ring: FlyingRing): { x: number; y: number } {
  const t = Math.min(ring.age / FLIGHT_TIME, 1);
  return {
    x: ring.fromX + (ring.toX - ring.fromX) * t,
    y: ring.fromY + (ring.toY - ring.fromY) * t - Math.sin(Math.PI * t) * 120,
  };
}

/** Advances the game by `dt` seconds. */
export function step(state: RingTossState, dt: number): void {
  state.time += dt;

  const ring = state.flying;
  if (ring) {
    ring.age += dt;
    if (ring.age >= FLIGHT_TIME) {
      const bottle = bottleAt(state, ring.toX, ring.toY);
      if (bottle) {
        state.score += bottle.points;
        state.landed.push({ x: bottle.x, y: bottle.y, ringer: true });
      } else {
        state.landed.push({ x: ring.toX, y: ring.toY, ringer: false });
      }
      state.flying = undefined;
    }
  }

  if (state.rings === 0 && !state.flying) state.phase = 'over';
}

function drawRing(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(x, y, 16, 6, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function draw(ctx: CanvasRenderingContext2D, state: RingTossState, aim: { x: number; y: number }) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  for (const row of ROWS) {
    ctx.fillStyle = colors.wood;
    ctx.fillRect(0, row.y + 44, WIDTH, 6);
  }

  for (const bottle of state.bottles) {
    ctx.fillStyle = colors.water;
    ctx.fillRect(bottle.x - 4, bottle.y - 6, 8, 20);
    ctx.fillRect(bottle.x - 14, bottle.y + 14, 28, 30);
    ctx.fillStyle = colors.surface;
    ctx.fillRect(bottle.x - 14, bottle.y + 22, 28, 10);
  }

  for (const ring of state.landed) {
    drawRing(
      ctx,
      ring.x,
      ring.ringer ? ring.y + 6 : ring.y,
      ring.ringer ? colors.accent : colors.muted,
    );
  }

  if (state.flying) {
    const { x, y } = ringPosition(state.flying);
    drawRing(ctx, x, y, colors.accent);
  }

  // Where a ring thrown now would land.
  if (state.phase === 'playing') {
    const x = aim.x + swayOffset(state.time);
    ctx.strokeStyle = colors.danger;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 8, aim.y);
    ctx.lineTo(x + 8, aim.y);
    ctx.moveTo(x, aim.y - 8);
    ctx.lineTo(x, aim.y + 8);
    ctx.stroke();
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Rings ${state.rings}/${RINGS_PER_ROUND}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of rings! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const ringToss: CarnivalGame = {
  id: 'ring-toss',
  name: 'Ring Toss',
  description:
    'Land rings on the bottle necks before you run out. Bottles further back score more.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const aim = { x: WIDTH / 2, y: ROWS[1].y };

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
        toss(state, aim.x, aim.y);
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
        recordScore(ringToss.id, state.score);
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

export default ringToss;
