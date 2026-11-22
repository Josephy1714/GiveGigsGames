import { Color3, MeshBuilder, StandardMaterial, TransformNode } from './vendor/babylon-arena.js';

export function createWeaponView(scene, camera, weapons) {
    const mount = new TransformNode('weapon-mount', scene);
    mount.parent = camera;
    mount.setEnabled(false);
    scene.setRenderingAutoClearDepthStencil(1, true);

    function material(name, color, emissive, shine) {
        const mat = new StandardMaterial(name, scene);
        mat.diffuseColor = color;
        mat.emissiveColor = emissive;
        mat.specularColor = new Color3(shine, shine, shine);
        mat.fogEnabled = false;
        return mat;
    }

    const alloy = material('weapon-alloy', new Color3(.33, .41, .49), new Color3(.07, .09, .12), .55);
    const shell = material('weapon-shell', new Color3(.12, .17, .23), new Color3(.04, .055, .08), .25);
    const grip = material('weapon-grip', new Color3(.055, .075, .09), new Color3(.025, .035, .05), .08);

    const rigs = weapons.map((weapon, index) => {
        const root = new TransformNode(weapon.name, scene);
        root.parent = mount;
        root.setEnabled(false);
        const accent = material(weapon.name + '-accent', weapon.color.scale(.45), weapon.color.scale(.9), .35);
        const part = (mesh, mat, x, y, z) => {
            mesh.parent = root;
            mesh.position.set(x, y, z);
            mesh.material = mat;
            mesh.renderingGroupId = 1;
            mesh.isPickable = false;
            return mesh;
        };
        const box = (name, mat, x, y, z, width, height, depth) =>
            part(MeshBuilder.CreateBox(name, { width, height, depth }, scene), mat, x, y, z);
        const tube = (name, mat, x, y, z, diameter, length, tessellation = 12) => {
            const mesh = part(MeshBuilder.CreateCylinder(name, { diameter, height: length, tessellation }, scene), mat, x, y, z);
            mesh.rotation.x = Math.PI / 2;
            return mesh;
        };

        box('receiver', shell, 0, 0, .12, .34, .27, .65);
        box('upper rail', alloy, 0, .15, .07, .19, .055, .52);
        box('grip', grip, 0, -.22, -.09, .14, .32, .21).rotation.x = -.28;
        box('stock', alloy, 0, -.02, -.29, .24, .21, .24);
        for (const side of [-1, 1]) {
            box('receiver plate', alloy, side * .173, 0, .09, .036, .19, .44);
            for (let i = 0; i < 3; i++) {
                box('charge vent', accent, side * .194, .027, .02 + i * .085, .012, .076, .035);
            }
        }

        let muzzle;
        if (index === 0) {
            tube('launcher shroud', shell, 0, .035, .52, .40, .64, 8);
            tube('launcher collar', alloy, 0, .035, .81, .45, .14, 8);
            tube('launcher ring', accent, 0, .035, .89, .34, .05, 8);
            tube('launcher bore', grip, 0, .035, .922, .26, .025, 8);
            muzzle = .98;
        } else if (index === 2) {
            for (const side of [-1, 1]) {
                tube('scatter barrel', alloy, side * .103, .042, .63, .17, .69);
                tube('scatter crown', shell, side * .103, .042, .97, .195, .08);
                tube('scatter bore', grip, side * .103, .042, 1.014, .117, .02);
            }
            box('ribbed pump', grip, 0, -.103, .62, .32, .13, .34);
            for (let i = 0; i < 5; i++) box('pump rib', alloy, 0, -.162, .49 + i * .065, .335, .025, .026);
            muzzle = 1.07;
        } else {
            const railgun = index === 1;
            const tip = railgun ? 1.28 : .82;
            tube('energy core', accent, 0, .04, (tip + .39) / 2, railgun ? .085 : .16, tip - .39, 8);
            for (const side of [-1, 1]) {
                box('accelerator rail', alloy, side * .13, .04, (tip + .33) / 2, .09, .16, tip - .33);
                box('rail inlay', accent, side * .13, .13, (tip + .42) / 2, .035, .026, tip - .42);
            }
            tube('field collar', shell, 0, .04, tip, railgun ? .24 : .37, .12, 8);
            tube('field aperture', accent, 0, .04, tip + .07, railgun ? .09 : .20, .025, 8);
            muzzle = tip + .155;
        }

        const flash = part(MeshBuilder.CreateSphere('muzzle flash', { diameter: .32, segments: 6 }, scene), accent, 0, .04, muzzle);
        flash.setEnabled(false);
        return { root, flash };
    });

    const kick = [.19, .14, .24, .075];
    let selected = -1;
    let recoil = 0;
    let flashTime = 0;
    let draw = 0;
    let stride = 0;

    return {
        setVisible(visible) {
            mount.setEnabled(visible);
            selected = -1;
            recoil = flashTime = draw = stride = 0;
            for (const rig of rigs) rig.root.setEnabled(false);
        },
        fire(index) {
            recoil = kick[index];
            flashTime = index === 3 ? .045 : .065;
        },
        update(index, speed, grounded, dt) {
            if (selected !== index) {
                if (selected >= 0) rigs[selected].root.setEnabled(false);
                selected = index;
                rigs[index].root.setEnabled(true);
                draw = .21;
            }
            const { flash } = rigs[index];
            flash.setEnabled(flashTime > 0);
            flash.scaling.set(.78, .68, 1.3 + flashTime * 11);
            flashTime = Math.max(0, flashTime - dt);
            const aspect = scene.getEngine().getAspectRatio(camera);
            const narrow = Math.min(1, aspect / 1.25);
            const motion = grounded ? Math.min(speed / 20, 1) : 0;
            stride = (stride + dt * (5 + speed * .32)) % (Math.PI * 2);
            mount.scaling.setAll(.72 + .28 * narrow);
            mount.position.set(.48 * narrow + Math.sin(stride) * .024 * motion,
                -.42 - draw + Math.cos(stride * 2) * .016 * motion, 1.01 - recoil);
            mount.rotation.set(-.055 - recoil * .56, -.105, -.055 + Math.sin(stride) * .025 * motion);
            recoil *= Math.exp(-dt * 15);
            draw *= Math.exp(-dt * 13);
        }
    };
}
