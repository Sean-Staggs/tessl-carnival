# Ring Toss

Land rings on the necks of the bottles at the back of the booth before you run out.

## How to play

- Move the mouse to aim, and click to toss a ring. The cross shows where it will land.
- Your hand sways from side to side, up to 40 px either way, so time your toss.
- One ring flies at a time. You have 8 rings a round, and the round ends when the last one lands.
- Click again on the game over screen to play another round.

## Scoring

A ring scores when it lands within 12 px of the middle of a bottle's neck.
Bottles further back score more:

| Row    | Points |
| ------ | ------ |
| Back   | 30     |
| Middle | 20     |
| Front  | 10     |

A ring that misses every neck scores nothing. Your final score is saved to the
carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `toss`, `step`, `bottleAt`, `swayOffset`, `ringPosition`)
  and the `ringToss` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
