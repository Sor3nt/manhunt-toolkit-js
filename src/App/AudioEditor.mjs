import App from "./App.mjs";
import AppMenu from "./AppMenu.mjs";
import ResourceLoader from "../Layer1/ResourceLoader.mjs";
import Database from "../Layer0/Database.mjs";
import MimeType from "./../Layer0/MimeType.mjs";

export default class AudioEditor extends App{
    name = "AudioEditor";

    constructor(props) {
        super(props);
        AppMenu.add(this);
    }

    async load() {

        // await ResourceLoader.load([
        //     '/src/App/AudioEditor/Resources/Executions.fsb'
        // ]);
        //
        await ResourceLoader.load('/Unittest/Resources/DDEATH.RIB', {
            mono: false,
            chunkSize: 0x400
        });


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

            const template = fileTemplate.cloneNode(true);
            template.classList.remove('template');
            template.querySelector('[data-play]').setAttribute('data-play', file.uuid);
            template.querySelector('[data-text="headline"]').innerHTML = `${file.name} <small class="text-muted">Subtitle 1</small>`;;
            template.querySelector('[data-text="size"]').textContent = (file.size / 1024).toFixed(2) + 'kb';
            template.querySelector('[data-text="length"]').textContent = parseFloat(file.props.duration).toFixed(2) + 's';
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
            console.log(pcmObj);
            await pcmObj.play();
        });

    }

}