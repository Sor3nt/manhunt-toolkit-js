import FileHandlerAbstract from "./FileHandler.Abstract.mjs";
import Database from "../Database.mjs";
import Result from "../Result.mjs";
import MimeType from "../MimeType.mjs";
import ResolveHashes from "../Resolve.Hashes.mjs";

class HashDir extends FileHandlerAbstract{
    tag = "DIR";

    canHandle(binary, filePath){
        if (filePath.indexOf('Executions.dir') !== -1) return true;
        return filePath.indexOf('Scripted.dir') !== -1;
    }

    process(binary, infos) {
        binary.setCurrent(0);

        Database.add(
            new Result(MimeType.EXECUTION_AUDIO_NAMES, this, binary, undefined, 0, binary.length(), {}, infos.path)
        );
    }

    async decode(binary, options = {}, props = {}) {

        let result = [];

        while(binary.remain()){
            const hash = binary.uInt32();
            const info = await ResolveHashes.executionAudio(hash);
            if (info === hash){
                result.push({
                    file: null,
                    weapon: null,
                    hash
                });
            }else{
                info.hash = hash;
                result.push(info);
            }
        }

        return result;
    }
}

export default new HashDir();

