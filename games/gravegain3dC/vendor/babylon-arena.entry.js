/* Babylon.js 9.37.0 modules used by Arena FPS. Build instructions are in README.md. */
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder.js";
import { CreateCapsule } from "@babylonjs/core/Meshes/Builders/capsuleBuilder.js";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder.js";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder.js";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder.js";
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder.js";
import "@babylonjs/core/Layers/effectLayerSceneComponent.js";
import "@babylonjs/core/Culling/ray.js";
import "@babylonjs/core/Meshes/instancedMesh.js";

export const MeshBuilder = { CreateBox, CreateCapsule, CreateCylinder, CreateGround, CreateSphere, CreateTorus };
export { Engine } from "@babylonjs/core/Engines/engine.js";
export { Scene } from "@babylonjs/core/scene.js";
export { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera.js";
export { GlowLayer } from "@babylonjs/core/Layers/glowLayer.js";
export { DirectionalLight } from "@babylonjs/core/Lights/directionalLight.js";
export { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight.js";
export { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
export { TransformNode } from "@babylonjs/core/Meshes/transformNode.js";
export { Axis } from "@babylonjs/core/Maths/math.axis.js";
export { Color3, Color4 } from "@babylonjs/core/Maths/math.color.js";
export { Scalar } from "@babylonjs/core/Maths/math.scalar.js";
export { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
