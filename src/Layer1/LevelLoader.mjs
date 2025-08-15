import Database from "../Layer0/Database.mjs";
import MimeType from "../Layer0/MimeType.mjs";
import ResourceLoader from "./ResourceLoader.mjs";
import Result from "../Layer0/Result.mjs";
import GameObject from "./GameObject.mjs";
import Helper from "../Helper.mjs";

class LevelLoader extends ResourceLoader{

    /**
     *
     * @param {string} levelName
     * @return {Promise<void>}
     */
    async load(levelName){

        for (const file of [
            'levels/' + levelName + '/entity.inst',
            'levels/' + levelName + '/entityTypeData.ini',
            'levels/' + levelName + '/allanims.ifp',
            'levels/' + levelName + '/pak/modelspc.txd',
            'levels/' + levelName + '/pak/scene1pc.txd',
            'levels/' + levelName + '/pak/modelspc.dff',
            'levels/' + levelName + '/scene1.bsp',
        ]) {
            await super.load('/Resources/Manhunt/' + file);
        }

        this.#createGameObjects(levelName);
    }

    #createGameObjects( levelName ){
        const results = Database.findBy({ type: MimeType.INST, level: levelName });

        if (results.length === 0){
            Helper.log('LevelLoader', 'Unable to create required GameObjects, no INST results found.', 'error');
            return;
        }

        results.forEach(result => {
            const _result = new Result(MimeType.GAMEOBJECT, new GameObject(result), undefined, result.name);
            _result.level = result.level;

            Database.add(_result);
        });
    }

}

export default new LevelLoader();