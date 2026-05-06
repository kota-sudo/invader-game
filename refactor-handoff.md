# main.js Refactor Handoff

## Completed in this pass

- Added `js/app/polyfills.js`
  - Moved the Canvas `roundRect` polyfill out of `main.js`.
  - Exported `installCanvasPolyfills()`.

- Added `js/ui/dom-elements.js`
  - Centralized required DOM lookup for `canvas`, HUD elements, and message element.
  - Exported `getGameDomElements()`.

- Added `js/ui/message.js`
  - Moved message display behavior into `createMessageController(messageEl)`.

- Updated `main.js`
  - Imports the new modules.
  - Calls `installCanvasPolyfills()` before reading canvas context.
  - Replaces direct DOM lookups with `getGameDomElements()`.
  - Replaces inline `showMessage()` with the message controller.

## Verified

```bash
node --check main.js
node --check js/app/polyfills.js
node --check js/ui/dom-elements.js
node --check js/ui/message.js
```

All passed.

## Recommended next steps

1. Extract HUD update logic
   - New file: `js/ui/hud.js`
   - Move `updateHUD()` from `main.js`.
   - Suggested factory shape:
     ```js
     export function createHudController({ game, stageEl, formatStageId, syncFuel, FUEL_CAP, formatFuelMmSs, fuelNextRegenMs }) {
       return { updateHUD() { ... } };
     }
     ```

2. Extract settings storage
   - New file: `js/game/storage/settings-storage.js`
   - Move `loadSettings()` and `saveSettings()`.

3. Extract inbox storage/actions
   - New file: `js/game/storage/inbox-storage.js`
   - Move `loadInbox()`, `saveInbox()`, `addInboxItem()`, `claimInboxItem()`, `claimAllInbox()`.
   - This needs injected reward functions such as `addCoins`, `addGems`, `addFuel`.

4. Extract stage medal progress
   - New file: `js/game/progress/stage-medals.js`
   - Move `computeStageStarMedal()`, `readStageStarMedals()`, `saveStageStarMedals()`, `commitStageStarMedalForCurrentClear()`, `getStageStarsForMap()`, `getStageMedalCount()`.

## Caution

- Keep `game` singleton for now. Do not attempt full dependency injection yet.
- Avoid moving `startGame`, `initStage`, `nextStage`, or combat functions until storage/UI utilities are separated.
- `main.js` currently acts as the dependency wiring hub; reduce it gradually rather than in one large rewrite.
