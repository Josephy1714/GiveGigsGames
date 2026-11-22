import bpy
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
OUTPUT = ASSETS / "3d" / "jay" / "jay.glb"
CLIPS = [
    ("Breathing Idle.fbx", "Idle"),
    ("Running.fbx", "Run"),
    ("Running Jump.fbx", "Jump"),
    ("Running Slide.fbx", "Slide"),
    ("Shoulder Hit And Fall.fbx", "Fall"),
]

def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.cameras, bpy.data.lights):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)

def import_fbx(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=str(path), use_anim=True, automatic_bone_orientation=False)
    return [obj for obj in bpy.data.objects if obj not in before]

def find_armature(objects, label):
    rigs = [obj for obj in objects if obj.type == "ARMATURE"]
    if not rigs:
        raise RuntimeError(f"{label}: FBX did not import an armature.")
    rigs.sort(key=lambda obj: len(obj.data.bones), reverse=True)
    return rigs[0]

def main():
    reset_scene()
    base_path = ASSETS / "Aj.fbx"
    if not base_path.is_file():
        raise FileNotFoundError(base_path)
    base_objects = import_fbx(base_path)
    rig = find_armature(base_objects, "Aj.fbx")
    meshes = [obj for obj in base_objects if obj.type == "MESH"]
    if not meshes:
        raise RuntimeError("Aj.fbx imported no character mesh.")
    bone_names = {bone.name for bone in rig.data.bones}
    print(f"BASE rig={rig.name}, bones={len(bone_names)}, meshes={len(meshes)}")

    installed = []
    for filename, clip_name in CLIPS:
        path = ASSETS / filename
        if not path.is_file():
            raise FileNotFoundError(path)
        imported = import_fbx(path)
        source_rig = find_armature(imported, filename)
        action = source_rig.animation_data.action if source_rig.animation_data else None
        if action is None:
            candidates = [a for a in bpy.data.actions if len(a.fcurves) > 0]
            if not candidates:
                raise RuntimeError(f"{filename}: no animation action was imported.")
            action = candidates[-1]
        action = action.copy()
        action.name = clip_name
        action.use_fake_user = True

        paths = [fc.data_path for fc in action.fcurves]
        animated_bones = {
            p.split('"')[1] for p in paths
            if 'pose.bones["' in p
        }
        missing = sorted(animated_bones - bone_names)
        if missing:
            raise RuntimeError(
                f"{filename}: animation rig is incompatible with Aj.fbx; "
                f"missing bones: {', '.join(missing[:12])}"
            )

        # FBX action channels are bone-name based. Reassign the imported clip
        # to the one production rig, then remove the temporary imported rig.
        rig.animation_data_create()
        rig.animation_data.action = action
        installed.append((clip_name, len(action.fcurves), len(animated_bones)))
        for obj in imported:
            if obj == rig:
                continue
            bpy.data.objects.remove(obj, do_unlink=True)

    # Keep a single skinned character and a single armature in the export.
    bpy.ops.object.select_all(action="DESELECT")
    for obj in base_objects:
        if obj.name in bpy.data.objects:
            obj.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT),
        export_format="GLB",
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_nla_strips=False,
        export_force_sampling=True,
        export_skins=True,
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_image_format="AUTO",
        export_cameras=False,
        export_lights=False,
    )
    size = OUTPUT.stat().st_size
    print("EXPORTED", OUTPUT, size, "bytes")
    print("CLIPS", installed)
    if size <= 0:
        raise RuntimeError("GLB export produced an empty file.")

if __name__ == "__main__":
    main()
