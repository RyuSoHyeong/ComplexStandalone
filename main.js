import { createSplash, setSplashProgress, hideSplash, loadAssets } from './assets/scripts/loader.js';
import { setupFullscreenButton } from './assets/scripts/fullscreen.js';
import { loadLanguage } from './assets/scripts/language.js';

const canvas = document.getElementById('application-canvas');

const app = new pc.Application(canvas, {
    mouse: new pc.Mouse(canvas),
    touch: new pc.TouchDevice(canvas),
    graphicsDeviceOptions: {
        alpha: false,
        preserveDrawingBuffer: false,
        devicePixelRatio: false,
        antialias: false,
        preferWebGl2: true
    }
});

app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);

window.addEventListener('resize', () => app.resizeCanvas());
document.getElementById("start-button")?.addEventListener("click", startApp);

const assetMap = {
    Complex: new pc.Asset("Complex", "gsplat", { url: "assets/gsplats/Complex.sog" }),
    Mirror_Top: new pc.Asset("Mirror_Top", "container", { url: "assets/models/glass.glb" }),
    env_px: new pc.Asset("env_px", "texture", { url: "assets/images/cubemap_1/posx.jpg" }),
    env_nx: new pc.Asset("env_nx", "texture", { url: "assets/images/cubemap_1/negx.jpg" }),
    env_py: new pc.Asset("env_py", "texture", { url: "assets/images/cubemap_1/posy.jpg" }),
    env_ny: new pc.Asset("env_ny", "texture", { url: "assets/images/cubemap_1/negy.jpg" }),
    env_pz: new pc.Asset("env_pz", "texture", { url: "assets/images/cubemap_1/posz.jpg" }),
    env_nz: new pc.Asset("env_nz", "texture", { url: "assets/images/cubemap_1/negz.jpg" })
};

const scriptAssets = [
    new pc.Asset("adjustPixelRatio.js", "script", { url: "assets/scripts/adjustPixelRatio.js" }),
    new pc.Asset("orbitCamera.js", "script", { url: "assets/scripts/orbitCamera.js" }),
    new pc.Asset("amenitiesMode.js", "script", { url: "assets/scripts/amenitiesMode.js" })
];

scriptAssets.forEach(asset => app.assets.add(asset));
Object.values(assetMap).forEach(asset => app.assets.add(asset));

const assetList = [
    { asset: assetMap.Complex, size: 7.3 * 1024 * 1024 },
    { asset: assetMap.Mirror_Top, size: 477 * 1024 },
    { asset: scriptAssets[0], size: 1024 },
    { asset: scriptAssets[1], size: 10 * 1024 },
    { asset: scriptAssets[2], size: 7 * 1024 },
    { asset: assetMap.env_px, size: 125 * 1024 },
    { asset: assetMap.env_nx, size: 168 * 1024 },
    { asset: assetMap.env_py, size: 41 * 1024 },
    { asset: assetMap.env_ny, size: 255 * 1024 },
    { asset: assetMap.env_pz, size: 158 * 1024 },
    { asset: assetMap.env_nz, size: 143 * 1024 }
];

function startApp() {
    createSplash();

    loadAssets(app, assetList, () => {
        createScene();
    }, setSplashProgress);

    function createScene() {

        const AsphaltMat = new pc.StandardMaterial();
        AsphaltMat.diffuse = new pc.Color(0.137, 0.137, 0.153);
        const WhiteMat = new pc.StandardMaterial();
        WhiteMat.diffuse = new pc.Color(1, 1, 1);
        WhiteMat.emissive = new pc.Color(1, 1, 1);
        const ReflectMat = new pc.StandardMaterial();

        const getSrc = (a) => {
            const t = a.resource;
            return t.getSource ? t.getSource() : (t._levels && t._levels[0]);
        };

        const sources = [
            getSrc(assetMap.env_px),
            getSrc(assetMap.env_nx),
            getSrc(assetMap.env_py),
            getSrc(assetMap.env_ny),
            getSrc(assetMap.env_pz),
            getSrc(assetMap.env_nz)
        ];
        const size = sources[0]?.width || sources[0]?.videoWidth;

        if (size) {
            const cubemap = new pc.Texture(app.graphicsDevice, {
                cubemap: true,
                width: size,
                height: size,
                format: pc.PIXELFORMAT_RGBA8,
                mipmaps: true
            });

            cubemap.addressU = pc.ADDRESS_CLAMP_TO_EDGE;
            cubemap.addressV = pc.ADDRESS_CLAMP_TO_EDGE;
            cubemap.minFilter = pc.FILTER_LINEAR_MIPMAP_LINEAR;
            cubemap.magFilter  = pc.FILTER_LINEAR;

            cubemap.setSource(sources);
            cubemap.upload();

            ReflectMat.useSkybox = false;
            ReflectMat.useMetalness = true;
            ReflectMat.metalness = 1.0;
            ReflectMat.glossiness = 1;
            ReflectMat.diffuse = new pc.Color(0.35, 0.35, 0.35);

            ReflectMat.cubeMap = cubemap;
            ReflectMat.update();
        }

        app.scene.ambientLight = new pc.Color(1, 1, 1);

        const Root = new pc.Entity("Root");

        const Camera = new pc.Entity("Camera");
        Camera.setPosition(0, 4, 4);
        Camera.setEulerAngles(-25, 0, 0);
        Camera.addComponent("camera", {clearColor: new pc.Color(1, 1, 1, 1), fov: 50});
        Camera.addComponent("script");
        Camera.script.create("orbitCamera");
        Root.addChild(Camera);

        const Main = new pc.Entity("Main");
        Root.addChild(Main);

      
        const gsplatCurrent = new pc.Entity("GSPlatCurrent");
        gsplatCurrent.setPosition(0.523, 0, 0.246);
        gsplatCurrent.setEulerAngles(0, 0, 180);
        gsplatCurrent.addComponent("gsplat", { asset: assetMap.Complex, unified: true });
        Root.addChild(gsplatCurrent);

        const asphalt = new pc.Entity();
        asphalt.addComponent('render', {
            type: 'box'
        });
        asphalt.render.material = AsphaltMat;
        asphalt.setLocalScale(7.6, 0.4, 5.3);
        asphalt.setPosition(0.235, -0.261, 0.2);
        asphalt.setEulerAngles(0, 0, 180);
        Root.addChild(asphalt);

        const boxA = new pc.Entity();
        boxA.addComponent('render', {
            type: 'box'
        });
        boxA.render.material = WhiteMat;
        boxA.setLocalScale(2, 3, 10);
        boxA.setPosition(5.5, -1.5, 0.251);
        boxA.setEulerAngles(0, 0, 180);
        Root.addChild(boxA);

        const boxB = new pc.Entity();
        boxB.addComponent('render', {
            type: 'box'
        });
        boxB.render.material = WhiteMat;
        boxB.setLocalScale(2, 3, 10);
        boxB.setPosition(-4.1, -1.5, 0.251);
        boxB.setEulerAngles(0, 0, 180);
        Root.addChild(boxB);

        const boxC = new pc.Entity();
        boxC.addComponent('render', {
            type: 'box'
        });
        boxC.render.material = WhiteMat;
        boxC.setLocalScale(2, 3, 10);
        boxC.setPosition(0.568, -1.5, 3.9);
        boxC.setEulerAngles(0, 90, 180);
        Root.addChild(boxC);

        const boxD = new pc.Entity();
        boxD.addComponent('render', {
            type: 'box'
        });
        boxD.render.material = WhiteMat;
        boxD.setLocalScale(2, 3, 10);
        boxD.setPosition(0.568, -1.5, -3.2);
        boxD.setEulerAngles(0, 90, 180);
        Root.addChild(boxD);

        const GlassTop = assetMap.Mirror_Top.resource.instantiateRenderEntity();
        if (!GlassTop) {
            console.error('instantiateRenderEntity вернул null/undefined');
            return;
        }
        GlassTop.findComponents('render').forEach(function (r) {
            if (r.meshInstances && r.meshInstances.length) {
                r.meshInstances.forEach(function (mi) {
                    mi.material = ReflectMat;
                });
            } else {
                r.material = ReflectMat;
            }
        });
        Root.addChild(GlassTop);
        GlassTop.setPosition(0.5, 1.33, 1.281);
        GlassTop.setEulerAngles(0, 90, 0);
        GlassTop.setLocalScale(0.00385, 0.00385, 0.00385);

        const glass1 = new pc.Entity();
        glass1.addComponent('render', {
            type: 'plane'
        });
        glass1.render.material = ReflectMat;
        glass1.setLocalScale(1.32, 1, 0.84);
        glass1.setPosition(3.5, 1.231, 0.975);
        glass1.setEulerAngles(0, 0, -90);
        Root.addChild(glass1);

        const glass_1 = new pc.Entity();
        glass_1.addComponent('render', {
            type: 'plane'
        });
        glass_1.render.material = ReflectMat;
        glass_1.setLocalScale(1.79, 1, 0.274);
        glass_1.setPosition(0.5, 1.356, 1.682);
        glass_1.setEulerAngles(90, 0, 180);
        Root.addChild(glass_1);

        const glass_2 = new pc.Entity();
        glass_2.addComponent('render', {
            type: 'plane'
        });
        glass_2.render.material = ReflectMat;
        glass_2.setLocalScale(0.511, 1, 0.132);
        glass_2.setPosition(-0.136, 1.155, 1.682);
        glass_2.setEulerAngles(90, 0, 180);
        Root.addChild(glass_2);

        const glass_3 = new pc.Entity();
        glass_3.addComponent('render', {
            type: 'plane'
        });
        glass_3.render.material = ReflectMat;
        glass_3.setLocalScale(0.69, 1, 0.806);
        glass_3.setPosition(-0.015, 0.718, 1.733);
        glass_3.setEulerAngles(90.03, 0.58, -176.98);
        Root.addChild(glass_3);

        const glass_4 = new pc.Entity();
        glass_4.addComponent('render', {
            type: 'plane'
        });
        glass_4.render.material = ReflectMat;
        glass_4.setLocalScale(0.51, 1, 0.919);
        glass_4.setPosition(0.373, 0.784, 1.733);
        glass_4.setEulerAngles(90, 0, 180);
        Root.addChild(glass_4);

        const glass_5 = new pc.Entity();
        glass_5.addComponent('render', {
            type: 'plane'
        });
        glass_5.render.material = ReflectMat;
        glass_5.setLocalScale(0.742, 1, 0.827);
        glass_5.setPosition(0.998, 0.843, 1.733);
        glass_5.setEulerAngles(90, 0, 178.25);
        Root.addChild(glass_5);

        const glass_6 = new pc.Entity();
        glass_6.addComponent('render', {
            type: 'plane'
        });
        glass_6.render.material = ReflectMat;
        glass_6.setLocalScale(0.923, 1, 0.827);
        glass_6.setPosition(1.376, 0.843, 1.273);
        glass_6.setEulerAngles(267.65, -90, 0);
        Root.addChild(glass_6);

        const glass_7 = new pc.Entity();
        glass_7.addComponent('render', {
            type: 'plane'
        });
        glass_7.render.material = ReflectMat;
        glass_7.setLocalScale(0.86, 1, 0.255);
        glass_7.setPosition(1.394, 1.377, 1.282);
        glass_7.setEulerAngles(267.65, -90, 0);
        Root.addChild(glass_7);

        const glass_8 = new pc.Entity();
        glass_8.addComponent('render', {
            type: 'plane'
        });
        glass_8.render.material = ReflectMat;
        glass_8.setLocalScale(0.86, 1, 0.255);
        glass_8.setPosition(-0.396, 1.377, 1.28);
        glass_8.setEulerAngles(267.65, 90, 0);
        Root.addChild(glass_8);

        const glass_9 = new pc.Entity();
        glass_9.addComponent('render', {
            type: 'plane'
        });
        glass_9.render.material = ReflectMat;
        glass_9.setLocalScale(0.929, 1, 0.764);
        glass_9.setPosition(-0.363, 0.705, 1.275);
        glass_9.setEulerAngles(267.2, 90, 0);
        Root.addChild(glass_9);

        const glass_10 = new pc.Entity();
        glass_10.addComponent('render', {
            type: 'plane'
        });
        glass_10.render.material = ReflectMat;
        glass_10.setLocalScale(0.911, 1, 0.204);
        glass_10.setPosition(-0.387, 1.168, 1.242);
        glass_10.setEulerAngles(269.35, 90, 0);
        Root.addChild(glass_10);

        const glass_11 = new pc.Entity();
        glass_11.addComponent('render', {
            type: 'plane'
        });
        glass_11.render.material = ReflectMat;
        glass_11.setLocalScale(1.836, 1, 0.249);
        glass_11.setPosition(0.485, 1.377, 0.859);
        glass_11.setEulerAngles(-92.05, -0.35, 0);
        Root.addChild(glass_11);

        const glass_12 = new pc.Entity();
        glass_12.addComponent('render', {
            type: 'plane'
        });
        glass_12.render.material = ReflectMat;
        glass_12.setLocalScale(0.732, 1, 0.82);
        glass_12.setPosition(1.008, 0.828, 0.814);
        glass_12.setEulerAngles(-91, -0.8, -1.5);
        Root.addChild(glass_12);

        const glass_13 = new pc.Entity();
        glass_13.addComponent('render', {
            type: 'plane'
        });
        glass_13.render.material = ReflectMat;
        glass_13.setLocalScale(0.482, 1, 0.935);
        glass_13.setPosition(-0.116, 0.779, 0.814);
        glass_13.setEulerAngles(-91, -0.8, -1.5);
        Root.addChild(glass_13);

        const glass_14 = new pc.Entity();
        glass_14.addComponent('render', {
            type: 'plane'
        });
        glass_14.render.material = ReflectMat;
        glass_14.setLocalScale(0.482, 1, 0.935);
        glass_14.setPosition(0.379, 0.779, 0.883);
        glass_14.setEulerAngles(-91, 0, 0);
        Root.addChild(glass_14);

        const glass_15 = new pc.Entity();
        glass_15.addComponent('render', {
            type: 'plane'
        });
        glass_15.render.material = ReflectMat;
        glass_15.setLocalScale(1.007, 1, 0.314);
        glass_15.setPosition(0.132, 0.134, 1.656);
        glass_15.setEulerAngles(89, 0, 180);
        Root.addChild(glass_15);

        const glass_16 = new pc.Entity();
        glass_16.addComponent('render', {
            type: 'plane'
        });
        glass_16.render.material = ReflectMat;
        glass_16.setLocalScale(0.721, 1, 0.492);
        glass_16.setPosition(0.997, 0.159, 1.617);
        glass_16.setEulerAngles(89, 0, 180);
        Root.addChild(glass_16);

        const glass2 = new pc.Entity();
        glass2.addComponent('render', {
            type: 'plane'
        });
        glass2.render.material = ReflectMat;
        glass2.setLocalScale(0.2, 1, 0.84);
        glass2.setPosition(2.915, 0.466, 0.975);
        glass2.setEulerAngles(0, 0, -90);
        Root.addChild(glass2);

        Root.addComponent("script");
        Root.script.create("amenitiesMode");
        Root.script.create("adjustPixelRatio");
        app.root.addChild(Root);

        hideSplash();
        app.start();
        document.getElementById("start-screen").remove();
        document.querySelector('.mode-panel')?.classList.remove('hidden');
        setupFullscreenButton();
        loadLanguage();
    };
};