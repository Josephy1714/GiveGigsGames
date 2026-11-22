import { Color3, MeshBuilder, StandardMaterial } from './vendor/babylon-arena.js';

export function createBotModels(scene) {
    function material(name, color, glow) {
        const mat = new StandardMaterial(name, scene);
        mat.diffuseColor = new Color3(...color);
        mat.emissiveColor = new Color3(...glow);
        mat.specularColor = new Color3(.23, .26, .29);
        return mat;
    }

    const frame = material('bot graphite', [.10, .14, .18], [.035, .045, .06]);
    const joint = material('bot titanium', [.37, .44, .50], [.055, .065, .075]);
    const palettes = {
        friendly: {
            armor: material('green armor', [.11, .71, .26], [.035, .24, .072]),
            light: material('green lights', [.38, 1, .47], [.25, 1, .37])
        },
        enemy: {
            armor: material('orange armor', [.98, .32, .065], [.32, .085, .017]),
            light: material('orange lights', [1, .57, .14], [1, .39, .055])
        }
    };

    const sources = new Map();
    function source(shape, mat) {
        const key = shape + mat.name;
        if (!sources.has(key)) {
            const mesh = shape === 'round'
                ? MeshBuilder.CreateCylinder(key, { diameter: 1, height: 1, tessellation: 6 }, scene)
                : MeshBuilder.CreateBox(key, { size: 1 }, scene);
            mesh.material = mat;
            mesh.isVisible = false;
            mesh.isPickable = false;
            sources.set(key, mesh);
        }
        return sources.get(key);
    }

    return (root, team, melee) => {
        const { armor, light } = palettes[team];
        const parts = [];
        const add = (name, mat, x, y, z, w, h, d, tilt = 0, shape = 'box') => {
            const mesh = source(shape, mat).createInstance(name);
            mesh.parent = root;
            mesh.position.set(x, y, z);
            mesh.scaling.set(w, h, d);
            mesh.rotation.z = tilt;
            mesh.isPickable = false;
            parts.push(mesh);
        };

        add('abdomen', frame, 0, -.12, 0, .48, .48, .33);
        add('torso', frame, 0, .28, 0, .76, .55, .42);
        add('chest plate', armor, 0, .3, .23, .65, .4, .18);
        add('reactor', light, 0, .31, .334, .14, .14, .04, Math.PI / 4);
        add('spine', joint, 0, .19, -.24, .38, .57, .17);
        add('helmet', armor, 0, .76, 0, .47, .36, .43, 0, 'round');
        add('face plate', frame, 0, .73, .185, .42, .20, .13);
        add('visor', light, 0, .775, .257, .35, .059, .025);
        add('antenna', joint, -.16, .99, -.095, .044, .25, .044, -.2);
        for (const side of [-1, 1]) {
            add('shoulder pauldron', armor, side * .52, .38, 0, .33, .34, .46, side * .17);
            add('forearm', armor, side * .54, -.052, .10, .23, .32, .29, side * .13);
            add('hip joint', joint, side * .20, -.39, 0, .23, .22, .27);
            add('shin guard', armor, side * .22, -.70, .04, .29, .43, .28, side * .06);
            add('boot', frame, side * .23, -.98, .085, .32, .20, .41);
            add('back light', light, side * .128, .29, -.338, .071, .25, .035);
        }
        if (melee) {
            add('blade guard', joint, .55, -.12, .31, .34, .15, .13);
            add('blade spine', armor, .55, -.12, .59, .16, .14, .52);
            add('blade edge', light, .55, -.05, .62, .07, .045, .57);
            add('blade tip', light, .55, -.09, .9, .07, .12, .12, Math.PI / 4);
        } else {
            add('arm cannon', frame, .53, -.14, .32, .25, .20, .51);
            add('cannon strip', light, .53, -.027, .34, .07, .035, .37);
        }
        return parts;
    };
}
