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
import AudioWav from "../Layer0/FileHandler/Audio.Wav.mjs";

export default class AudioEditor extends App{
    name = "AudioEditor";

    constructor(props) {
        super(props);
        AppMenu.add(this);
    }

    async load() {

        await ResourceLoader.load([
            '/src/App/AudioEditor/Resources/Executions.fsb'
        ]);
        //
        // await ResourceLoader.load('/Unittest/Resources/DDEATH.RIB', {
        //     mono: false,
        //     chunkSize: 0x400
        // });


        await super.load();

        // WebGl.orbit();
    }


    async createViewport() {
        const options = await fetch('src/App/AudioEditor/index.html');

        this.appContent.innerHTML = await options.text();

        const fileList = Database.findBy(MimeType.AUDIO);

        const fileContainer = this.appContent.querySelector('[data-output="files"]');
        const fileTemplate = this.appContent.querySelector('[data-output="files"] .template');

        fileList.forEach((file, index) => {

            const info = {
                size: file.size,
                name: file.name,
                index
            };
            const template = fileTemplate.cloneNode(true);
            template.classList.remove('template');
            template.querySelector('[data-play]').setAttribute('data-play', file.uuid);
            template.querySelector('[data-text="headline"]').innerHTML = `${info.name} <small class="text-muted">Subtitle 1</small>`;;
            template.querySelector('[data-text="size"]').textContent = info.size + 'b';
            fileContainer.append(template);

        })


    }

    async createEvents() {
        const fileContainer = this.appContent.querySelector('[data-output="files"]');


        fileContainer.addEventListener('click', async (event) => {

            const playUuid = event.target.getAttribute('data-play');
            if (playUuid === null)
                return;

            const file = Database.findOneBy({
                'uuid': playUuid
            });

            const pcmObj = await file.decode();
            await pcmObj.play();

        });

    }

}