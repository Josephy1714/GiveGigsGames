# District Transitions

`district-transition-ui.js` provides the accessible transition overlay used during authored district travel. It announces the destination and honest phase labels, uses an indeterminate animation rather than inventing a percentage, and respects reduced-motion preferences.

## Travel transaction

1. Validate the active route and destination spawn before changing scenes.
2. Show the destination transition overlay.
3. Ask the environment runtime to preload and mount the destination's credited local assets and authored scene.
4. Only after scene mounting succeeds, commit the life-system travel cost, switch collision/gameplay zones, update weather and NPC schedules/routes, and reset the player to the route-specific arrival spawn.
5. Refresh the interaction prompt and publish the travel event once.
6. Hide the overlay and return the updated state.

If scene preparation or mounting fails, the previous district remains active and the overlay is removed. If a post-mount gameplay commit fails, the runtime restores the previous district and its original player position. No travel success is published for a failed transaction.

## Spawn continuity

Destination scenes should define route-specific `from-<district>` spawn points. The runtime prefers that spawn and only uses `default` when no route-specific point exists. Spawn coordinates remain authored scene data; the runtime does not infer positions from map art.

## Honest readiness

The transition overlay is a presentation layer, not proof that every district is available. A district with missing artwork remains unavailable under the environment runtime's existing fail-closed rules. The overlay reports the phase without claiming a false progress percentage or manufacturing a substitute scene.
