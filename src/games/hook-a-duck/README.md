# Hook a Duck

Rubber ducks float round a stream in a loop. Hook them as they pass.

## How to play

- Move the mouse to hold the rod over the stream, and click to lower the hook.
- The hook takes a moment to reach the water, so aim a little ahead of the duck you want.
- The hook catches a duck when it lands within 26 px of the duck's middle. If two ducks are in reach, it
  catches the nearer one.
- You have 10 casts, and you can't cast again while the hook is still dropping. The round ends when the last
  cast lands.
- Click again on the game over screen to play another round.

## Scoring

Each duck has a number on its base, and catching it scores that number. The eight ducks on the stream are
worth 10, 20, 10, 50, 10, 30, 10 and 20 points. A miss scores nothing.

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `duckPosition`, `duckAt`, `cast`, `step`) and the `hookADuck`
  entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
