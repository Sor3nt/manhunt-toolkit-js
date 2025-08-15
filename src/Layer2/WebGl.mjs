import {
    AmbientLight, Clock, DirectionalLight,
    GridHelper,
    PerspectiveCamera,
    Scene, sRGBEncoding,
    WebGLRenderer
} from "../Vendor/three.module.mjs";
import {OrbitControls} from "../Layer0/Controls/OrbitControls.js";

class WebGL{

    /** @type {function[]} */
    renderCallbacks = [];

    /**
     *
     * @type {OrbitControls}
     */
    orbitControls = null;

    constructor() {
        this.container = document.getElementById('webgl');

        this.scene = new Scene();
        this.clock = new Clock();

        this.renderer = new WebGLRenderer({});

        // this.renderer = new WebGLRenderer({antialias: true});
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.container.appendChild(this.renderer.domElement);

        const gridHelper = new GridHelper( 10, 20, 0xc1c1c1, 0x8d8d8d );
        this.scene.add( gridHelper );

        this.camera = new PerspectiveCamera(57.29578, 1.33, 0.1, 1000);
        this.camera.position.set(0, 1, 2);

        const directionalLight = new DirectionalLight( 0xffffff, 0.5 );
        this.scene.add( directionalLight );
        // directionalLight.position.set(0, 1, 4);
        // directionalLight.target = targetObject;


        window.addEventListener('resize', this.resize, false);
        this.resize();
        this.render();
    }

    resize(){
        let bbox = this.container.parentNode.getBoundingClientRect();
        this.camera.aspect = bbox.width / bbox.height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(bbox.width, bbox.height);
    }

    onRender(callback){
        if (this.renderCallbacks.indexOf(callback) !== -1)
            return;

        this.renderCallbacks.push(callback);
    }

    offRender(callback){
        this.renderCallbacks.splice(this.renderCallbacks.indexOf(callback), 1);
    }

    orbit(state = true){

        if (this.orbitControls === null){
            const orbit = new OrbitControls( this.camera, this.renderer.domElement );
            orbit.enableDamping = true;
            orbit.dampingFactor = 0.05;
            orbit.screenSpacePanning = false;
            orbit.minDistance = 0.5 ;
            // self._control.orbit.maxDistance = 40.0 ;
            orbit.maxPolarAngle = Math.PI / 2;
            orbit.target.set(0,0.85,0);
            orbit.update()
            this.orbitControls = orbit;
        }

        this.orbitControls.enabled = state;



    }

    render() {

        //limit fps to 60fps for performance increase
        // setTimeout( function() {
        requestAnimationFrame( () => this.render() );
        // }, 1000 / 60 );

        let delta = this.clock.getDelta();
        this.renderCallbacks.forEach(
            (callback) => {callback(delta);}
        );

        this.renderer.render(this.scene, this.camera);
    }
}


export default new WebGL();