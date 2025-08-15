import AppMenu from "./AppMenu.mjs";

export default class App {

    name = "Generic App";

    viewport;

    menuContainer = document.getElementById('appOptions')
    appContent = document.getElementById('appContent')

    constructor(props) {
        console.log(`[APP] Register ${this.name}`)
        this.props = props;
    }

    async load(){
        console.log(`[APP] Load ${this.name}`)
        await this.createViewport();
        await this.createEvents();
    }

    unload(){
        console.log(`[APP] Unload ${this.name}`)

    }

    async createViewport() {}
    async createEvents() {}


    /**
     *
     * @param {string} accept
     * @return {Promise<File>}
     */
    async requestFileFromUser( accept = ''){
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = accept;
            input.onchange = (event) => {
                resolve(event.target.files[0]);
            };
            input.click();
        });
    }
}