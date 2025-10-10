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
    Complex:    new pc.Asset("Complex", "gsplat", { url: "assets/gsplats/Complex.sog" }),
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
    { asset: assetMap.Complex, size: 9.1 * 1024 * 1024 },
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
        gsplatCurrent.setPosition(0.323, 0, 0.246);
        gsplatCurrent.setEulerAngles(0, 0, 180);
        gsplatCurrent.addComponent("gsplat", { asset: assetMap.Complex, unified: true });
        Root.addChild(gsplatCurrent);

        const asphalt = new pc.Entity();
        asphalt.addComponent('render', {
            type: 'box'
        });
        asphalt.render.material = AsphaltMat;
        asphalt.setLocalScale(7, 0.4, 5);
        asphalt.setPosition(0.6, -0.261, 0.51);
        asphalt.setEulerAngles(0, 0, 180);
        Root.addChild(asphalt);

        const boxA = new pc.Entity();
        boxA.addComponent('render', {
            type: 'box'
        });
        boxA.render.material = WhiteMat;
        boxA.setLocalScale(2, 3, 10);
        boxA.setPosition(4.775, -1.42, 0.251);
        boxA.setEulerAngles(0, 0, 180);
        Root.addChild(boxA);

        const boxB = new pc.Entity();
        boxB.addComponent('render', {
            type: 'box'
        });
        boxB.render.material = WhiteMat;
        boxB.setLocalScale(2, 3, 10);
        boxB.setPosition(-3.833, -1.42, 0.251);
        boxB.setEulerAngles(0, 0, 180);
        Root.addChild(boxB);

        const boxC = new pc.Entity();
        boxC.addComponent('render', {
            type: 'box'
        });
        boxC.render.material = WhiteMat;
        boxC.setLocalScale(2, 3, 10);
        boxC.setPosition(0.368, -1.42, 3.7);
        boxC.setEulerAngles(0, 90, 180);
        Root.addChild(boxC);

        const boxD = new pc.Entity();
        boxD.addComponent('render', {
            type: 'box'
        });
        boxD.render.material = WhiteMat;
        boxD.setLocalScale(2, 3, 10);
        boxD.setPosition(0.368, -1.42, -2.942);
        boxD.setEulerAngles(0, 90, 180);
        Root.addChild(boxD);

        const glass1 = new pc.Entity();
        glass1.addComponent('render', {
            type: 'plane'
        });
        glass1.render.material = ReflectMat;
        glass1.setLocalScale(1.32, 1, 0.84);
        glass1.setPosition(2.948, 1.231, 0.975);
        glass1.setEulerAngles(0, 0, -90);
        Root.addChild(glass1);

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