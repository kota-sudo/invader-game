/**
 * Screen drawing hub: re-exports screen drawers and wires deps from main.js
 */

import {
  drawGachaRates,
  drawGachaRatesModalIfOpen,
  drawGachaResult,
  drawGachaScreen,
  drawGachaSummary,
  drawStardustShop,
  setGachaScreensDrawDeps,
} from './draw-screen-gacha.js';
import { drawCustomizeScreen, setCustomizeScreenDrawDeps } from './draw-screen-customize.js';
import { drawBossSelectScreen, setBossSelectScreenDrawDeps } from './draw-screen-boss-select.js';
import { drawLoadoutScreen, setLoadoutScreenDrawDeps } from './draw-screen-loadout.js';
import { drawMapScreen, setMapScreenDrawDeps } from './draw-screen-map.js';
import { drawMissionsScreen, setMissionsScreenDrawDeps } from './draw-screen-missions.js';
import { drawModeSelectScreen, setModeSelectScreenDrawDeps } from './draw-screen-mode-select.js';
import { drawShopScreen, setShopScreenDrawDeps } from './draw-screen-shop.js';
import { drawEventsScreen, setEventsScreenDrawDeps } from './draw-screen-events.js';
import { drawIAPScreen, setIapScreenDrawDeps } from './draw-screen-iap.js';
import { drawInboxScreen, setInboxScreenDrawDeps } from './draw-screen-inbox.js';
import { drawNotificationsScreen, setNotificationsScreenDrawDeps } from './draw-screen-notifications.js';
import { drawSettingsScreen, setSettingsScreenDrawDeps } from './draw-screen-settings.js';
import { drawStageResult, setStageResultScreenDrawDeps } from './draw-screen-stage-result.js';
import { drawUpgradeScreen, setUpgradeScreenDrawDeps } from './draw-screen-upgrade.js';
import { drawStageSelectScreen, setStageSelectDrawDeps } from './draw-screen-stage-select.js';

export {
  drawBossSelectScreen,
  drawCustomizeScreen,
  drawEventsScreen,
  drawGachaRates,
  drawGachaRatesModalIfOpen,
  drawGachaResult,
  drawGachaScreen,
  drawGachaSummary,
  drawIAPScreen,
  drawInboxScreen,
  drawLoadoutScreen,
  drawMapScreen,
  drawMissionsScreen,
  drawModeSelectScreen,
  drawNotificationsScreen,
  drawSettingsScreen,
  drawShopScreen,
  drawStageResult,
  drawStageSelectScreen,
  drawStardustShop,
  drawUpgradeScreen,
};

export function setDrawDependencies(deps) {
  setStageSelectDrawDeps(deps);
  setGachaScreensDrawDeps(deps);
  setShopScreenDrawDeps(deps);
  setCustomizeScreenDrawDeps(deps);
  setLoadoutScreenDrawDeps(deps);
  setMissionsScreenDrawDeps(deps);
  setBossSelectScreenDrawDeps(deps);
  setModeSelectScreenDrawDeps(deps);
  setMapScreenDrawDeps(deps);
  setNotificationsScreenDrawDeps(deps);
  setSettingsScreenDrawDeps(deps);
  setInboxScreenDrawDeps(deps);
  setEventsScreenDrawDeps(deps);
  setIapScreenDrawDeps(deps);
  setStageResultScreenDrawDeps(deps);
  setUpgradeScreenDrawDeps(deps);
}
