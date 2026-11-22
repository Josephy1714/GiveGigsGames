# Graphics performance plan

The catalog contains 52 local titles and one externally hosted title. This pass updates 25 local titles directly and the shared worker pool loaded by 44 catalog entrypoints. Loading that pool alone starts no worker and delivers no per-frame speedup. The mobile smoke suite exercises all catalog entries. The worker smoke suite exercises actual burst output and timeout recovery. Neither suite measures FPS. In three isolated 500 ms Chromium runs at 320 × 240, the old GraveGain effects worker ran 25, 32, and 32 empty frame callbacks. The replacement ran zero in each window.

Items 1–50 and the six items marked **Landed** below describe changes in this pass. The other 44 are follow-up work. The externally hosted Ecosystemic Evolver requires access to its source and separate measurement.

## Landed

### GraveGain3d, GraveGain3dA, and GraveGain3dB

1. Run the three overlays from the same OffscreenCanvas worker implementation.
2. Defer worker startup until a graphics preset requests post-processing.
3. Resolve each bootstrap relative to its owning script so hosted subpaths work.
4. Skip worker startup for standalone `file:` pages.
5. Keep the base renderer playable when worker creation or canvas transfer fails.
6. Confirm context acquisition before accepting bursts.
7. Tear down the worker after an initialization, execution, or message error.
8. Make overlay frames demand-driven.
9. Stop scheduling when the last particle expires.
10. Cancel a scheduled frame when the overlay is disabled.
11. Clear the last painted bounds on disable.
12. Respect the selected graphics preset when the tab becomes visible.
13. Use worker animation frames where available.
14. Use a cancellable timer where worker animation frames are unavailable.
15. Reset the simulation clock when the overlay goes idle.
16. Bound elapsed time following a long scheduling delay.
17. Apply velocity decay using elapsed time so visual drag is independent of display refresh rate.
18. Reuse fixed-size typed arrays for particle coordinates, velocities, and lifetimes.
19. Allocate space for at most 512 active overlay particles.
20. Compact surviving particle state in place when lifetimes end.
21. Skip canvas draw calls for particles entirely outside the viewport.
22. Clear only the previous frame’s bounded dirty rectangle.
23. Expand the dirty rectangle to cover antialiased edges.
24. Reuse the current fill style for consecutive particles of the same color.
25. Keep additive blending set across frames.
26. Cap the overlay’s device-pixel ratio at 1.5.
27. Limit the overlay backing store to roughly four million pixels.
28. Observe the container for layout changes, including when a hidden game panel becomes visible.
29. Deduplicate equivalent resize messages.
30. Skip backing-store writes on axes whose pixel dimensions stay the same.
31. Cache the viewport dimensions for burst projection.
32. Reuse the projected hit position vector.
33. Batch main-thread bursts by animation frame.
34. Limit each burst batch to 64 events.
35. Keep one burst batch in flight per overlay.
36. Drop queued cosmetic work when effects are disabled.
37. Collect frame measurements with a running total and count.
38. Avoid reapplying the same renderer pixel ratio during preset changes.
39. Avoid a second resize after automatic pixel-ratio degradation.
40. Respect the preset and device ceilings when calculating the minimum automatic pixel ratio.

### Shared worker pool

41. Count live workers independently of queued jobs so a queue can grow to the configured concurrency limit.
42. Cap the FIFO backlog and route overflow through the local implementation.
43. Remove jobs that time out before dispatch.
44. Retire a worker stuck on an in-flight job and resume scheduling queued jobs.
45. Drain queued and in-flight work to local fallbacks after worker initialization or message failure.
46. Revoke Blob URLs after creating workers.
47. Retire idle workers after 15 seconds.
48. Compute the small runtime timing probe locally and give it a deadline when animation frames stall.

### Canvas and WebGL game changes

49. Update small GraveGain1d, GraveGain1dA, and GraveGain1dB particle batches in place, eliminating per-frame snapshots and delayed writes.
50. Skip redundant rendering work in the ten MADI arcade games, the five Neon titles, and Template Demo. The MADI games skip unchanged backing-store sizes and aspect ratios. AI Expedition also reuses conduit vectors and guards timer text writes. Revenue Jungle updates HUD nodes only when their values change. Neon menus stop drawing at the transition into gameplay. Template Demo caches the grid and glow rasters and owns one animation callback.

## Follow-up work

### Measure the bottlenecks

51. Record p50, p95, and p99 frame time for representative scenes in each local title.
52. Record long-frame counts during loading, gameplay, and pointer-heavy interactions.
53. Record GPU frame time where timer queries are available.
54. Record CPU time separately for simulation, rendering, and browser composition.
55. Record the worker’s frame completion and main-thread message rates during bursts.
56. Track dropped cosmetic events during sustained high-load scenes.
57. Measure worker initialization time against first useful work.
58. Measure canvas backing-store memory at desktop and phone resolutions.
59. Record a compatibility baseline across Chromium, Firefox, and WebKit.
60. Add reproducible combat, menu, and resize traces with fixed seeds where supported.

### Move independent graphics work off-thread

61. Prototype worker-rendered minimaps for Assassin Animals and the GraveGain variants.
62. **Landed** — Rasterize the Assassin Animals minimap’s fixed rings once, skip hidden updates, and cull distant markers using squared distance.
63. Send moving markers to minimap workers at their update cadence.
64. Run procedural dungeon floor texture rasterization in a worker.
65. **Landed** — Transfer Starship Simulator’s sky as an ImageBitmap and close it after copying to the texture’s upload surface.
66. Cache texture-generation results by seed, resolution, and style.
67. Offload Server Saver Shield’s matrix background separately from the gameplay canvas.
68. Prototype a shared graphics worker for the five Neon menu animations.
69. **Landed** — Move Starship Simulator’s seeded backdrop rasterization to a one-shot worker with a synchronous fallback and a temporary solid-color sky.
70. Compare compact transferable snapshots with structured clone before moving full renderers.
71. Use reusable ping-pong buffers where structured clone is a measured bottleneck.
72. Add sequence numbers where independently produced render snapshots can become stale.
73. Prototype complete worker rendering for Template Demo and compare interaction latency.
74. Evaluate a full renderer-worker split for a WebGL title with a narrow scene interface.
75. Run context-loss and recovery scenarios for transferred canvases before expanding rollout.

### Reduce recurring canvas and UI work

76. **Landed** — Cache the Platform Wars arena gradient and grid paths.
77. **Landed** — Draw Neon Void Runner’s lane dividers with a single stroke.
78. Cache glow sprites for repeated Neon projectiles and powerups.
79. Reuse HUD text for values that do not change between frames.
80. Cache Canvas 2D text metrics for repeated labels and glyphs.
81. Use reusable glyph rasters for dense Server Saver Shield text effects.
82. **Landed** — Remove per-frame gradient construction from the Neon Void Runner track and side glows.
83. Batch opaque sprites that share a texture and blend mode.
84. Replace frequent temporary vectors in 3D motion and targeting code with scratch vectors.
85. Pool transient gameplay meshes where allocation and disposal show up in traces.
86. Reuse repeated geometries and materials in MADI world builders.
87. Use instanced meshes for repeated scenery and enemies with the same geometry.
88. Apply view culling to distant visual-only objects.
89. Choose mesh and sprite detail levels by projected screen size.
90. Refresh shadow maps only when relevant geometry or lighting changes.

### Adapt work to the frame budget

91. Add a measured pixel budget to high-resolution canvases that currently scale only by DPR.
92. Adapt render resolution with hysteresis under sustained GPU load.
93. Keep UI overlays at native resolution when the world render scale changes.
94. Pause cosmetic animation while a game is hidden, and reset its timing on resume.
95. Lower the refresh rate of non-interactive effects on expensive frames.
96. Stop rendering idle scenes whose pixels and camera are unchanged.
97. Defer optional assets and shader compilation until after the first interactive frame.
98. Prewarm shaders incrementally for scenes likely to open next.
99. Add performance regression thresholds for repeatable scenes after establishing normal variance.
100. Re-run the same traces after each rollout to verify that the intended bottleneck improved.
