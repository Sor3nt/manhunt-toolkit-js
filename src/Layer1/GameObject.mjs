import Database from "../Layer0/Database.mjs";
import MimeType from "../Layer0/MimeType.mjs";
import Helper from "../Helper.mjs";
import FileHandlerAbstract from "../Layer0/FileHandler/FileHandler.Abstract.mjs";

class GameObject extends FileHandlerAbstract{

    name = "no-name-set";

    /** @var {Result|null} */
    _glg = null;

    /** @var {Result|null} */
    _inst = null;

    /** @var {Result|null} */
    _model = null;

    /**
     *
     * @param {Result} inst
     */
    constructor(inst) {
        super();
        this._inst = inst;
    }

    decode(binary, options = {}, props = {}){
        return this;
    }

    async load(){
        if (this._inst === null || this._glg !== null)
            return;

        this.inst = await this._inst.decode();
        this.name = this.inst.name;

        this._glg = Database.findOneBy({ type: MimeType.CONFIG_GLG, name: this.inst.glgName });

        if (this._glg === null){
            Helper.log('GameObject', `Unable to load Model for ${this.name}. GLG Entry ${this.inst.glgName} was not found.`, 'error');
            return null;
        }
        this.glg = await this._glg.decode();
    }

    async getModel(){
        await this.load();

        if (this._glg === null){
            Helper.log('GameObject', `Unable to load Model for ${this.name}. GLG Entry was not found.`, 'error');
            return null;
        }

        let gameObjectClass = this.glg.getValue('CLASS');
        switch (gameObjectClass) {
            case 'EC_ENTITYLIGHT':
            case 'EC_TRIGGER':
                break;
            default:
                let modelName = this.glg.getValue('MODEL');
                if (modelName !== false){
                    if (await this.#loadModel(modelName) === null) return null;
                    await this.#loadModelHead();
                }
        }

        return this.model;
    }

    async #loadModel(modelName){
        if (modelName === false){
            Helper.log('GameObject', `Unable to load Model for ${this.name}. There is no MODEL entry.`, 'error');
            return null;
        }

        if (modelName === "fist_poly_hunter") modelName = "Player_Bod";

        this._model = Database.findOneBy({ type: MimeType.MODEL, name: modelName });
        if (this._model === null){
            Helper.log('GameObject', `Unable to load Model for ${this.name}. Model was not found.`, 'error');
            return null;
        }

        this.model = await this._model.decode();
        this.model.position.set(this.inst.position.x, this.inst.position.y, this.inst.position.z);
        this.model.position.set(this.inst.rotation.x, this.inst.rotation.y, this.inst.rotation.z, this.inst.rotation.w);

        return true;
    }

    async #loadModelHead(){
        const modelName = this.glg.getValue('HEAD');
        if (modelName === false) return null;

        const _headGlg = Database.findOneBy({ type: MimeType.CONFIG_GLG, name: modelName });
        if (_headGlg === null){
            Helper.log('GameObject', `Unable to load Head ${modelName} for ${this.name}. GLG was not found.`, 'error');
            return null;
        }

        const headGlg = await _headGlg.decode();

        const _headModel = Database.findOneBy({ type: MimeType.MODEL, name: headGlg.getValue('MODEL') });
        if (_headModel === null){
            Helper.log('GameObject', `Unable to load Head ${headGlg.getValue('MODEL')} for ${this.name}. Model was not found.`, 'error');
            return null;
        }

        const headModel = await _headModel.decode();

        this.model.children[0].skeleton.bones.forEach(bone => {
            if (bone.name === "Bip01_Head") bone.add(headModel);
        });

        return true;
    }
}


export default GameObject;