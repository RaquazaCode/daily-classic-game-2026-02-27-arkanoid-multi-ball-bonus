# Design

## Core Loop
- Fixed-step deterministic update at 60 FPS (`stepState`).
- Game modes: `ready`, `running`, `paused`, `won`, `lost`.
- Input model supports keyboard + button triggers with one-shot launch/pause/reset actions.

## Collision + Rules
- Axis-aligned paddle and brick collision with circular balls.
- Wall, ceiling, and paddle bounce correction keeps simulation stable.
- Losing all active balls decrements life and returns to `ready` unless lives are exhausted.
- Win condition triggers when brick array is fully cleared.

## Twist: Multi-ball Bonus
- Combo count increments on consecutive brick hits.
- At combo threshold, `multiBallReady` toggles and spawns a deterministic bonus ball.
- Bonus ball velocity uses seeded RNG so automation runs are reproducible.

## Automation Contract
- `window.advanceTime(ms)` steps simulation deterministically.
- `window.render_game_to_text()` returns compact JSON state with coordinate system, score, lives, combo, paddle, balls, and bricks remaining.
- Playwright artifacts are written under `playwright/main-actions/`.
