export declare class Color3 {
  r: number;
  g: number;
  b: number;
  constructor(r?: number, g?: number, b?: number);
  set(r: number, g: number, b: number): Color3;
  copyFrom(source: Color3): Color3;
  scale(scale: number): Color3;
  static FromHexString(hex: string): Color3;
  static Lerp(start: Color3, end: Color3, amount: number): Color3;
}

export declare class Color4 {
  r: number;
  g: number;
  b: number;
  a: number;
  constructor(r?: number, g?: number, b?: number, a?: number);
  set(r: number, g: number, b: number, a: number): Color4;
}

export declare class Vector3 {
  x: number;
  y: number;
  z: number;
  constructor(x?: number, y?: number, z?: number);
  set(x: number, y: number, z: number): Vector3;
  copyFrom(source: Vector3): Vector3;
  normalize(): Vector3;
  static Zero(): Vector3;
}

export declare class Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
  constructor(x?: number, y?: number, z?: number, w?: number);
  static RotationYawPitchRoll(yaw: number, pitch: number, roll: number): Quaternion;
}

export declare class Matrix {}

export declare const Axis: {
  X: Vector3;
  Y: Vector3;
  Z: Vector3;
};

export declare const Scalar: {
  Clamp(value: number, min?: number, max?: number): number;
  Lerp(start: number, end: number, amount: number): number;
};

export declare const VertexBuffer: {
  PositionKind: string;
  NormalKind: string;
  UVKind: string;
  ColorKind: string;
};

export declare class Engine {
  constructor(canvas: HTMLCanvasElement, antialias?: boolean, options?: Record<string, unknown>);
  setHardwareScalingLevel(level: number): void;
  resize(): void;
  dispose(): void;
  getRenderWidth(): number;
  getRenderHeight(): number;
}

export declare class Scene {
  static readonly FOGMODE_NONE: number;
  static readonly FOGMODE_LINEAR: number;
  static readonly FOGMODE_EXP: number;
  static readonly FOGMODE_EXP2: number;
  clearColor: Color4;
  ambientColor: Color3;
  autoClear: boolean;
  useRightHandedSystem: boolean;
  fogMode: number;
  fogColor: Color3;
  fogStart: number;
  fogEnd: number;
  fogDensity: number;
  constructor(engine: Engine);
  render(): void;
  dispose(): void;
}

export declare class FreeCamera {
  position: Vector3;
  rotation: Vector3;
  upVector: Vector3;
  fov: number;
  minZ: number;
  maxZ: number;
  constructor(name: string, position: Vector3, scene?: Scene);
  setTarget(target: Vector3): void;
}

export declare class HemisphericLight {
  intensity: number;
  diffuse: Color3;
  groundColor: Color3;
  specular: Color3;
  constructor(name: string, direction: Vector3, scene: Scene);
}

export declare class DirectionalLight {
  intensity: number;
  diffuse: Color3;
  specular: Color3;
  direction: Vector3;
  constructor(name: string, direction: Vector3, scene: Scene);
}

export declare class GlowLayer {
  intensity: number;
  blurKernelSize: number;
  constructor(name: string, scene: Scene, options?: Record<string, unknown>);
  addExcludedMesh(mesh: Mesh): void;
}

export declare class DynamicTexture {
  hasAlpha: boolean;
  constructor(name: string, options: { width: number; height: number } | number, scene?: Scene, generateMipMaps?: boolean);
  getContext(): CanvasRenderingContext2D;
  update(invertY?: boolean): void;
}

export declare class StandardMaterial {
  diffuseColor: Color3;
  emissiveColor: Color3;
  specularColor: Color3;
  ambientColor: Color3;
  diffuseTexture: DynamicTexture | null;
  emissiveTexture: DynamicTexture | null;
  opacityTexture: DynamicTexture | null;
  alpha: number;
  backFaceCulling: boolean;
  disableLighting: boolean;
  useVertexColors?: boolean;
  zOffset: number;
  needDepthPrePass: boolean;
  constructor(name: string, scene: Scene);
}

export declare class TransformNode {
  name: string;
  position: Vector3;
  rotation: Vector3;
  rotationQuaternion: Quaternion | null;
  scaling: Vector3;
  parent: TransformNode | Mesh | null;
  metadata: Record<string, unknown>;
  constructor(name: string, scene?: Scene);
  setEnabled(value: boolean): void;
  isEnabled(checkAncestors?: boolean): boolean;
  getChildMeshes(directDescendantsOnly?: boolean): Mesh[];
  dispose(doNotRecurse?: boolean, disposeMaterialAndTextures?: boolean): void;
}

export declare class Mesh extends TransformNode {
  static readonly DOUBLESIDE: number;
  static readonly FRONTSIDE: number;
  static readonly BACKSIDE: number;
  isVisible: boolean;
  material: StandardMaterial | null;
  alwaysSelectAsActiveMesh: boolean;
  isPickable: boolean;
  hasVertexAlpha: boolean;
  constructor(name: string, scene?: Scene);
  setVerticesData(kind: string, data: Float32Array | number[], updatable?: boolean, stride?: number): void;
  updateVerticesData(kind: string, data: Float32Array | number[], updateExtends?: boolean, makeItUnique?: boolean): void;
  setIndices(indices: Uint16Array | Uint32Array | number[]): void;
  markVerticesDataAsUpdatable(kind: string, updatable: boolean): void;
}

export declare const MeshBuilder: {
  CreateBox(name: string, options: Record<string, unknown>, scene?: Scene): Mesh;
  CreateCylinder(name: string, options: Record<string, unknown>, scene?: Scene): Mesh;
  CreateSphere(name: string, options: Record<string, unknown>, scene?: Scene): Mesh;
  CreateTorus(name: string, options: Record<string, unknown>, scene?: Scene): Mesh;
  CreateDisc(name: string, options: Record<string, unknown>, scene?: Scene): Mesh;
  CreatePlane(name: string, options: Record<string, unknown>, scene?: Scene): Mesh;
};
