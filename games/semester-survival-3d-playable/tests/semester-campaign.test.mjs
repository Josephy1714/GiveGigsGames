import test from "node:test";
import assert from "node:assert/strict";
import { SEMESTER_CAMPAIGN, CAMPAIGN_PHASES, getSemesterConfig, createCampaignState, startCampaignRun, advanceCampaign, damageCampaignBoss, beginCampaignCelebration, showCampaignResults } from "../src/campaign/semester-campaign.js";

test("campaign preserves all eight specified finish and boss distances", () => {
  assert.deepEqual(SEMESTER_CAMPAIGN.map(x => [x.finishDistance, x.bossDistance]), [
    [1000,800],[1250,1000],[1500,1200],[1750,1400],[2000,1600],[2250,1800],[2500,2000],[3000,2400]
  ]);
  assert.equal(SEMESTER_CAMPAIGN.length, 8);
});

test("semester configuration clamps selection and exposes distinct environments and bosses", () => {
  assert.equal(getSemesterConfig(0).number, 1);
  assert.equal(getSemesterConfig(99).number, 8);
  assert.equal(new Set(SEMESTER_CAMPAIGN.map(x => x.environment)).size, 8);
  assert.equal(new Set(SEMESTER_CAMPAIGN.map(x => x.bossId)).size, 8);
  assert.ok(SEMESTER_CAMPAIGN.every(x => x.tips.length >= 3 && x.bossDistance < x.finishDistance));
});

test("warning and boss trigger from actual distance, not elapsed time", () => {
  let state = startCampaignRun(createCampaignState(1));
  state = advanceCampaign(state, 749);
  assert.equal(state.phase, CAMPAIGN_PHASES.RUNNING);
  state = advanceCampaign(state, 750);
  assert.equal(state.phase, CAMPAIGN_PHASES.WARNING);
  state = advanceCampaign(state, 800);
  assert.equal(state.phase, CAMPAIGN_PHASES.BOSS);
  assert.equal(state.arenaCleared, true);
});

test("semester cannot complete until boss is defeated and freezes at exact distance", () => {
  let state = advanceCampaign(startCampaignRun(createCampaignState(1)), 800);
  state = advanceCampaign(state, 1000);
  assert.equal(state.phase, CAMPAIGN_PHASES.FAILED);
  let win = advanceCampaign(startCampaignRun(createCampaignState(1)), 800);
  win = damageCampaignBoss(win, 100);
  assert.equal(win.bossDefeated, true);
  win = advanceCampaign(win, 1000);
  assert.equal(win.phase, CAMPAIGN_PHASES.VICTORY);
  assert.equal(win.distance, 1000);
  assert.equal(win.unlockedThrough, 2);
  assert.equal(advanceCampaign(win, 5000).distance, 1000);
});

test("victory cinematic is a locked, ordered state transition", () => {
  let state = advanceCampaign(startCampaignRun(createCampaignState(8)), 2400);
  state = damageCampaignBoss(state, 100);
  state = advanceCampaign(state, 3000);
  assert.equal(state.phase, CAMPAIGN_PHASES.VICTORY);
  state = beginCampaignCelebration(state);
  assert.equal(state.phase, CAMPAIGN_PHASES.CELEBRATION);
  state = showCampaignResults(state);
  assert.equal(state.phase, CAMPAIGN_PHASES.RESULTS);
  assert.equal(state.unlockedThrough, 8);
});
