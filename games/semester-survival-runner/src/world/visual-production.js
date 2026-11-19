/* Semester Survival — visual production planning and approval gates.
 * Tracks required deliverables; it does not create or substitute artwork.
 */
(function (root) {
  'use strict';
  const CHARACTER_IDS = Object.freeze(['jay', 'amina', 'einstein', 'ernest', 'sumeya']);
  const DISTRICT_IDS = Object.freeze(['residence', 'township', 'campus', 'city']);
  const CHARACTER_CLIPS = Object.freeze(['idle','walk','jog','sprint','jump-takeoff','jump-rise','jump-apex','jump-fall','land-soft','slide-start','slide-loop','slide-recover','dodge-left','dodge-right','interact','sit','study','rest','talk']);
  const ENVIRONMENT_LAYERS = Object.freeze(['background','midground','foreground']);
  function fail(message) { throw new Error(message); }
  function nonEmpty(value) { return typeof value === 'string' && value.trim().length > 0; }
  function safeLocalPath(value) {
    return nonEmpty(value) && !/^(?:[a-z]+:)?\/\//i.test(value) && !value.startsWith('/') && !value.split('/').includes('..') && !/[?#]/.test(value);
  }
  function validateCredit(credit, label) {
    if (!credit || !nonEmpty(credit.author) || !nonEmpty(credit.license) || !nonEmpty(credit.source)) fail(label + ' requires creator, licence/permission and source records.');
  }
  function validateArtwork(record, label, roles) {
    if (!record || !safeLocalPath(record.path)) fail(label + ' requires a safe relative local asset path.');
    if (!roles.includes(record.role)) fail(label + ' has an unsupported artwork role.');
    if (!Number.isInteger(record.width) || record.width < 1 || !Number.isInteger(record.height) || record.height < 1) fail(label + ' requires exact positive pixel dimensions.');
    if (!Number.isFinite(record.bytes) || record.bytes < 1) fail(label + ' requires the measured file byte size.');
    validateCredit(record.credit, label);
  }
  function createPlan() {
    const characters = Object.create(null), environments = Object.create(null);
    CHARACTER_IDS.forEach(id => { characters[id] = Object.freeze({ id, status:'not-started', required:Object.freeze(['approved-turnaround','expression-sheet','outfit-and-palette-guide','layered-source-art','runtime-atlas','animation-clip-manifest','in-game-scale-review','creator-and-licence-record']), requiredClips:CHARACTER_CLIPS }); });
    DISTRICT_IDS.forEach(id => { environments[id] = Object.freeze({ id, status:'not-started', requiredLayers:ENVIRONMENT_LAYERS, required:Object.freeze(['approved-layout-paintover','background-art','midground-art','foreground-art','interactive-prop-art','lighting-variants','hotspot-review','creator-and-licence-record']) }); });
    return Object.freeze({ version:1, rendering:'2.5d', qualityTarget:'high-resolution source artwork with scalable runtime output', characterIds:CHARACTER_IDS, districtIds:DISTRICT_IDS, characterClips:CHARACTER_CLIPS, environmentLayers:ENVIRONMENT_LAYERS, characters:Object.freeze(characters), environments:Object.freeze(environments), policy:Object.freeze({ requiresHumanApproval:true, generatedPlaceholderArtworkAllowed:false, missingAssetsMayFallback:false, productionReadyRequiresRuntimeReview:true }) });
  }
  function validateCharacterDelivery(d) {
    if (!d || !CHARACTER_IDS.includes(d.characterId)) fail('Unknown main-cast character delivery.');
    if (d.approved !== true) fail(d.characterId + ' artwork has not been approved.');
    if (!nonEmpty(d.modelVersion) || !nonEmpty(d.costumeVersion)) fail('Character model and costume versions are required.');
    if (!d.turnaround || !d.expressions || !d.atlas || !d.clipManifest) fail(d.characterId + ' requires turnaround, expression sheet, atlas and clip manifest.');
    validateArtwork(d.turnaround,d.characterId+' turnaround',['model-sheet']);
    validateArtwork(d.expressions,d.characterId+' expressions',['expression-sheet']);
    validateArtwork(d.atlas,d.characterId+' atlas',['character-atlas']);
    validateCredit(d.sourceArtCredit,d.characterId+' layered source artwork');
    if (!Array.isArray(d.clipManifest.clips)) fail('Character clip manifest must list authored clips.');
    const clips = new Set(d.clipManifest.clips), missing = CHARACTER_CLIPS.filter(name => !clips.has(name));
    if (missing.length) fail(d.characterId+' is missing required authored clips: '+missing.join(', '));
    if (!d.runtimeReview || d.runtimeReview.passed !== true || !nonEmpty(d.runtimeReview.reviewer) || !safeLocalPath(d.runtimeReview.previewPath)) fail(d.characterId+' requires a passed in-game scale and animation review.');
    return Object.freeze({ characterId:d.characterId, status:'approved-for-integration', modelVersion:d.modelVersion, costumeVersion:d.costumeVersion });
  }
  function validateEnvironmentDelivery(d) {
    if (!d || !DISTRICT_IDS.includes(d.districtId)) fail('Unknown environment district delivery.');
    if (d.approved !== true) fail(d.districtId+' environment artwork has not been approved.');
    if (!d.layers || !d.layoutReview || d.layoutReview.passed !== true) fail(d.districtId+' requires authored layers and an approved layout review.');
    const seen = new Set();
    ENVIRONMENT_LAYERS.forEach(layer => { const r=d.layers[layer]; validateArtwork(r,d.districtId+' '+layer,['background','layer']); if(seen.has(r.path)) fail('Environment layers must be separate authored files.'); seen.add(r.path); });
    if (!Array.isArray(d.props) || d.props.length===0) fail(d.districtId+' requires authored interactive prop artwork.');
    d.props.forEach((p,i)=>validateArtwork(p,d.districtId+' prop '+i,['prop']));
    validateCredit(d.sourceArtCredit,d.districtId+' layered source artwork');
    if (!nonEmpty(d.layoutReview.reviewer) || !safeLocalPath(d.layoutReview.previewPath)) fail(d.districtId+' layout review requires a local preview and reviewer.');
    return Object.freeze({ districtId:d.districtId, status:'approved-for-integration' });
  }
  root.SemesterVisualProduction = Object.freeze({ createPlan, validateCharacterDelivery, validateEnvironmentDelivery, characterIds:CHARACTER_IDS, districtIds:DISTRICT_IDS, requiredCharacterClips:CHARACTER_CLIPS, requiredEnvironmentLayers:ENVIRONMENT_LAYERS });
})(typeof window !== 'undefined' ? window : globalThis);
