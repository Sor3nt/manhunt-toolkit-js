import App from "./App.mjs";
import AppMenu from "./AppMenu.mjs";
import ResourceLoader from "../Layer1/ResourceLoader.mjs";
import NBinary from "../Layer0/NBinary.mjs";
import Database from "../Layer0/Database.mjs";
import WebGl from "../Layer2/WebGl.mjs";
import MimeType from "./../Layer0/MimeType.mjs";
import {
    AnimationMixer,
    Matrix4,
    Skeleton,
    SkeletonHelper as TSkeletonHelper,
    Vector4
} from "../Vendor/three.module.mjs";
import SkeletonHelper from "../Layer2/SkeletonHelper.mjs";
import Helper from "../Helper.mjs";
import ManhuntMatrix from "../Layer1/ManhuntMatrix.mjs";
import Manhunt2MDL from "../Layer0/FileGenerator/Manhunt2.MDL.mjs";
import ModelMdl from "../Layer0/FileHandler/Model.Mdl.mjs";

/**
 * Load Model File
 *  -> Select Model if multiple
 *
 *  Reference Skeleton
 *  -> PC...
 *
 *  Apply Bone Position
 *  Apply Bone Rotation
 *
 *  Model for Cutscene
 *
 *  Export MDL
 */

export default class MdlToolkit extends App{
    name = "MDL Toolkit";

    currentModel = {
        fileName: null,
        binary: null,
        object: null
    }


    animMap = {
        pc: 'BAT_IDLE_PISS_ANIM',
        cutscene: 'DRWHYTE_CUTSCENE(HUNTER)'
    }

    animMixer = null
    activeClip = null

    props = {
        source: { game: 'mh', platform: 'pc'},
        target: { game: 'mh2', platform: 'pc'}, 
    }


    refSkeleton = { mh: null, mh2: null, mh2Cutscene: null}
    refAnimation = { mh: null, mh2: null, mh2Cutscene: null}

    constructor(props) {
        super(props);
        AppMenu.add(this);
    }

    async load() {
        await super.load();


        await ResourceLoader.load('/Resources/Skeleton/manhunt_2_psp_cutscene.dff', {
            source: { game: "mh2", platform: "psp" }
        });

        await ResourceLoader.load([
            '/Resources/Skeleton/manhunt_pc_player.dff',
            '/Resources/Skeleton/manhunt_pc_player.txd',
            '/Resources/Skeleton/manhunt_2_pc_player.tex',
            '/Resources/Skeleton/manhunt_2_pc_player.mdl'
        ]);

        this.refSkeleton = {
            mh: await Database.findOneBy({
                name: 'Player_Bod'
            }).decode(),

            mh2: await Database.findOneBy({
                file: 'manhunt_2_pc_player.mdl'
            }).decode(),

            cutscene: await Database.findOneBy({
                name: 'Danny_Broken_Cutscene'
            }).decode()
        };

        console.log('debug, refSkeleton', this.refSkeleton);

        await ResourceLoader.load('/Resources/Animation/manhunt_2_pc.ifp', {
            source: { game: "mh2", platform: "pc" }
        });

        await ResourceLoader.load('/Resources/Animation/manhunt_2_psp_cutscene.ifp', {
            source: {
                game: "mh2",
                platform: "psp",
                version: "001",
                isCutscene: true
            }
        });
        
        this.refAnimation = {
            // mh: await Database.findOneBy({
            //     name: 'Player_Bod'
            // }),

            mh2: await Database.findOneBy({
                name: 'BAT_IDLE_PISS_ANIM'
            }),

            cutscene: await Database.findOneBy({
                name: 'DRWHYTE_CUTSCENE(HUNTER)'
            })
        };

        console.log('debug, refAnimation', this.refAnimation);

        WebGl.orbit();
    }

    reset(){
        //Clear old imports
        Database.findBy({
            file: this.currentModel.fileName
        }).forEach(entry => Database.remove(entry))

        if (this.activeClip){
            this.activeClip.stop();
            this.activeClip = null;
        }

        WebGl.offRender(this.onRender.bind(this));

        if (this.currentModel.object){
            WebGl.scene.remove(this.currentModel.object)
            WebGl.scene.remove(this.currentModel.object.userData.skeletionHelper)
            this.currentModel.object = null;
            this.animMixer = null;
        }

    }

    async createViewport() {
        const options = await fetch('src/App/MdlToolkit/Options.html');

        this.menuContainer.innerHTML = await options.text()
    }

    async createEvents() {
        nQuery().find('[data-action="load"]').on('click', async () => {
            const file = await this.requestFileFromUser('.mdl,.dff')
            this.currentModel.fileName = file.name;
            this.currentModel.binary = new NBinary(await file.arrayBuffer());

            this.importModel().then()
        });

        nQuery().find('[data-action="export"]').on('click', async () => {
            if (this.currentModel.object === null) return;

            const mdl = Manhunt2MDL.build([this.currentModel.object])
            this.sendFileToUser(this.currentModel.fileName, mdl, 'application/octet-stream');
        });

        nQuery().find('#inputPlatform').on('change', (event) => {
            const info = event.target.value.split('_');
            this.props.source.game = info[0];
            this.props.source.platform = info[1];

            this.importModel().then()
        });

        nQuery().find('#targetModel').on('change', (event) => {
            const info = event.target.value.split('_');
            this.props.target.game = info[0];
            this.props.target.platform = info[1];

            this.importModel().then();
        });
    }

    async hashBlob(blob) {
        // Blob in ArrayBuffer umwandeln
        const arrayBuffer = await blob.arrayBuffer();

        // Hash (zum Beispiel SHA-256) berechnen
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);

        // ArrayBuffer in ein Array von Bytes umwandeln
        const hashArray = Array.from(new Uint8Array(hashBuffer));

        // Bytes in einen hexadezimalen String konvertieren
        const hashHex = hashArray
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');

        return hashHex;
    }

    /**
     *
     * @param {string} fileName
     * @param {NBinary} data
     * @param {string} type
     */
    async sendFileToUser(fileName, data, type = 'application/octet-stream') {

        console.log(`Send File to User ${fileName}`, data.data, type);
        const blob = new Blob([data.data], { type: type });


        const hash = await this.hashBlob(blob);
        if ([
            'b005b9a6bd504aa40107584b45c43d0290036184070895567181954f960d8e65',
            '317056eed1fe2fe64d7f296e70b55737c62fab28fd3497412b3f440b4d4814c0',
            '1f3c8943889d34df4909f0deb88177331685e5b3a3a7fdc1c73f8822d36a09b5',
            '6813e3d42267a91640d9ff56b534521580d4afe6ba131df384c2d42a71a59534',
            '94614ea0c201797a73faac4b351d1298bf08c3a320d4f54aa73d7d6c185ec3e4'
        ].indexOf(hash) !== -1){
            console.log("KNOWN WILL FAIL");
            die;

        }else{
            console.log("HASH", hash);
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);

    }


    async importModel() {
        if (this.currentModel.fileName === null) return;

        this.reset();

        console.log(`Import Model from ${this.currentModel.fileName}`);
        console.log(`Config: Source ${this.props.source.game} ${this.props.source.platform} Target ${this.props.target.game} ${this.props.target.platform}`);

        ResourceLoader.process(this.currentModel.fileName, this.currentModel.binary, {
            // source: {
            //     game: "mh2",
            //     platform: "psp",
            //     version: "001",
            //     isCutscene: true
            // }
        });


        this.currentModel.object = await Database.findOneBy({
            // name: "Leo_Asylum_Cutscene",
            file: this.currentModel.fileName
        }).decode({
             applyBoneOrderFrom: this.refSkeleton.cutscene.children[0].skeleton.bones
        })


        // SkeletonHelper.applyMissedBones(
        //     this.refSkeleton.mh2.children[0].skeleton,
        //     this.currentModel.object.children[0].skeleton
        // );

         // SkeletonHelper.applyBoneOrderFrom(this.refSkeleton.cutscene.children[0].skeleton.bones, this.currentModel.object.children[0].skeleton.bones)



        // console.log(this.currentModel.object.children[0].skeleton.bones)

// Berechne die inversen Matrizen neu
//         this.currentModel.object.children[0].skeleton.boneInverses = this.currentModel.object.children[0].skeleton.bones.map(bone => {
//             const inverse = new Matrix4();
//             bone.updateMatrixWorld(true);
//             inverse.copy(bone.matrixWorld).invert();
//             return inverse;
//         });
//
//         this.currentModel.object.children[0].bind(this.currentModel.object.children[0].skeleton)


        // this.currentModel.object.children[0].skeleton.update

        // ManhuntMatrix.removeAdditionalBones(this.refSkeleton.mh2.children[0], this.currentModel.object.children[0])
        //
        //
        //










        // const tSkel = this.currentModel.object.children[0].skeleton;
        // const newTOrder = [];
        // this.refSkeleton.mh2.children[0].skeleton.bones.forEach((bone, index) => {
        //
        //     const tBone = tSkel.bones.find(b => b.userData.boneId === bone.userData.boneId);
        //     if (tBone){
        //         newTOrder.push(tBone);
        //     }
        // })

        // this.refSkeleton.mh2.children[0].skeleton.bones = newTOrder;
        // this.refSkeleton.mh2.children[0].bind(this.refSkeleton.mh2.children[0].skeleton)


        console.log(SkeletonHelper.logSkeletonHierarchy(this.currentModel.object.children[0].skeleton))

        this.currentModel.object.children[0].skeleton.pose()

        WebGl.scene.add(this.currentModel.object)

        // let decodeProps = {};
        //
        // if (this.props.target.platform === 'cutscene')
        //     decodeProps.applyBoneOrderFrom = this.refSkeleton.cutscene.children[0].skeleton.bones;
        // else if (this.props.source.game === 'mh')
        //     decodeProps.applyBoneOrderFrom = this.refSkeleton.mh2.children[0].skeleton.bones;
        //
        // if (this.props.source.game === 'mh')
        //     decodeProps.applyScaleFactor = 0.8458542069377359; //MH1=>Mh2
        //
        // console.log('debug, using decodeProps', decodeProps);
        //
        // this.currentModel.object = await Database.findOneBy({
        //     // name: "DrWhyte_Cutscene",
        //     file: this.currentModel.fileName
        // }).decode(decodeProps)
        //
        // if (this.props.target.game === "mh2"){
        //     ManhuntMatrix.removeAdditionalBones(this.refSkeleton.mh2.children[0], this.currentModel.object.children[0])
        // }
        //
        // if (
        //     (this.props.source.game === 'mh') ||
        //     (this.props.source.game === 'mh2' && this.props.source.platform === 'ps2')
        // )
        //     SkeletonHelper.applyMissedBones(
        //         this.refSkeleton.mh2.children[0].skeleton,
        //         this.currentModel.object.children[0].skeleton
        //     );
        //
        //
        // WebGl.scene.add(this.currentModel.object)
        //
        // this.currentModel.object.userData.skeletionHelper = new TSkeletonHelper( this.currentModel.object.children[0] );
        // WebGl.scene.add( this.currentModel.object.userData.skeletionHelper );

        //Play animation
        // this.animMixer = new AnimationMixer(this.currentModel.object);
        // WebGl.onRender(this.onRender.bind(this));
        // await this.playAnimation();

    }

    async playAnimation() {

        let animationName;
        switch (this.props.target.platform){
            case "pc":
                animationName = this.animMap.pc;
                break;
            case "cutscene":
                animationName = this.animMap.cutscene;
                break;
            default:
                Helper.log('MDL Toolkit', `Unknown platform ${this.props.target.platform}`, 'error');
                return;
        }

        const animation = Database.findOneBy({ type: MimeType.ANIMATION, name: animationName });
        const animationClip = await animation.decode({
            target: {
                game: "mh2",
                platform: "pc"
            }
        });

        ManhuntMatrix.removeInvalidAnimationBonesBasedOnSkeleton(this.currentModel.object.children[0].skeleton, animationClip);

        if (this.activeClip)
            this.activeClip.stop();

        this.activeClip = this.animMixer.clipAction(animationClip);
        this.activeClip.play()
    }

    onRender(delta){
        if (this.animMixer)
            this.animMixer.update(delta);
    }

}