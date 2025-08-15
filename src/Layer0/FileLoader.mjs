import AnimationIfp from "./FileHandler/Animation.Ifp.mjs";
import AudioContextMapBin from "./FileHandler/Audio.ContextMap.Bin.mjs";
import AudioFsb from "./FileHandler/Audio.Fsb.mjs";
import AudioRib from "./FileHandler/Audio.Rib.mjs";
import CameraTvp from "./FileHandler/Camera.Tvp.mjs";
import CollisionCol from "./FileHandler/Collision.Col.mjs";
import EntityConfigGlg from "./FileHandler/Entity.Config.Glg.mjs";
import HashDir from "./FileHandler/Hash.Dir.mjs";
import ImageTex from "./FileHandler/Image.Tex.mjs";
import Inst from "./FileHandler/Inst.mjs";
import Manhunt2MapBsp from "./FileHandler/Manhunt2.Map.Bsp.mjs";
import ModelMdl from "./FileHandler/Model.Mdl.mjs";
import RenderwareLoader from "./FileHandler/RenderwareLoader.mjs";
import WaypointsGrf from "./FileHandler/Waypoints.Grf.mjs";
import NBinary from "./NBinary.mjs";
import ImageTxd from "./FileHandler/Image.Txd.mjs";

class FileLoader {

    handlers = [
        AnimationIfp,
        AudioContextMapBin,
        AudioFsb,
        AudioRib,
        CameraTvp,
        CollisionCol,
        EntityConfigGlg,
        HashDir,
        ImageTex,
        ImageTxd,
        Inst,
        Manhunt2MapBsp,
        ModelMdl,
        RenderwareLoader,
        WaypointsGrf,
    ];

    /**
     *
     * @param {NBinary|ArrayBuffer} binary
     * @param {string} filePath
     * @return {FileHandlerAbstract|undefined}
     */
    findHandler( binary, filePath ){

        if (binary instanceof ArrayBuffer)
            binary = new NBinary(binary);

        return this.handlers.find( handler => {
            binary.setCurrent(0);
            const canHandle = handler.canHandle(binary, filePath);
            binary.setCurrent(0); //just take sure,,,
            return canHandle;
        });
    }

}

export default new FileLoader();