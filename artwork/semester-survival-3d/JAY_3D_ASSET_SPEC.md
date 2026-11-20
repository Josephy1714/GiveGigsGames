# Jay — production 3D character specification

## Approved identity reference

The canonical four-view source is preserved at:

`artwork/semester-survival-3d/references/jay-turnaround-approved.jpg`

It shows front, three-quarter, side and rear views. Match this design; do not redesign Jay as a generic runner.

### Identity and wardrobe lock
- Young adult Kenyan male student; deep-brown skin and short, dense natural curls.
- Navy/blue denim-style overshirt with collar, buttons, chest pockets and rolled sleeves.
- Warm-white crew-neck T-shirt.
- Charcoal/near-black slim trousers.
- Blue-grey low-top sneakers with light midsoles and laces.
- Dark student backpack with padded straps, front compartments, seams and buckles.
- Wristwatch on the left wrist as shown in the turnaround.
- Preserve the face silhouette, hairline, proportions and outfit construction across all views and animations.

## Modelling brief

The final asset must be a genuinely sculpted, textured, skinned character—not a stack of primitive shapes or a flat sprite facing the camera.

- Full-body human anatomy with clean deformation topology and deliberate edge flow at shoulders, elbows, hips, knees, ankles, neck and jaw.
- Distinct facial planes, ears, eyelids, nose, lips and hair silhouette; no featureless face.
- Hair should be a designed curl mass with controlled clumps/strands and a clean silhouette, not a smooth helmet.
- Layered clothing with believable thickness, seams, stitching, folds and separate materials.
- Backpack must have independent geometry, straps, pockets, zippers and attachment points; it must follow torso motion without clipping.
- Shoes require separate upper, sole, tongue, laces and heel structure.
- PBR materials: base colour, normal, roughness and ambient-occlusion detail where useful. Use a compact atlas/material set for mobile.
- Target believable real-time stylisation with premium material response and silhouette. Do not chase triangle counts at the expense of anatomy or deformation.

## Rig and export contract

Deliver `assets/3d/jay/jay.glb` with:
- A named humanoid armature, root motion separated from in-place locomotion where practical.
- Skin weights with smooth shoulder/hip/knee/elbow deformation.
- Hand/finger bones sufficient for readable gestures.
- Backpack straps parented/weighted so they do not float away from the body.
- Consistent forward axis, ground origin at the soles, character height approximately 1.78 m.
- Authored clips named exactly: `Idle`, `Run`, `Jump`, `Slide`, `Fall`, `GetUp`.
- Natural foot contacts and loopable Run/Idle. Jump and Fall must have clear anticipation, apex/impact and recovery. Slide must be a low, controlled action with clear entry and exit.
- No baked camera, stage, floor or reference board in the exported game asset.

## Runtime integration

`src/three/jay-character.js` loads the GLB, checks for a skinned mesh and required clips, normalises scale/ground placement, and cross-fades actions. Missing clips are surfaced as errors; the runtime does not substitute unrelated actions.

## Quality gates before acceptance

1. Inspect front, side, rear and three-quarter renders against the approved turnaround.
2. Inspect neutral pose, run contact poses, jump apex, slide low pose and fall/get-up deformation.
3. Check face, fingers, sleeves, backpack straps and shoes for clipping or collapsing.
4. Verify GLB skeleton, skin weights, clip names, texture references and file size.
5. Test on a mid-range Android device at game camera distance and close-up inspection distance.

This is a production specification, not a claim that the model or animations have already been generated.
