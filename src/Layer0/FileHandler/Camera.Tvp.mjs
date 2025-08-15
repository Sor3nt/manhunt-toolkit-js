import FileHandlerAbstract from "./FileHandler.Abstract.mjs";
import Database from "../Database.mjs";
import Result from "../Result.mjs";
import MimeType from "../MimeType.mjs";


class CameraTvp extends FileHandlerAbstract{
    tag = "TVP";

    canHandle(binary, filePath){
        let text = binary.consume(binary.length(), 'string');
        return text.indexOf('VECPAIR@') !== -1;
    }

    process(binary, infos) {
        binary.setCurrent(0);

        let results = {};

        let weapon = false;

        binary.getString().split("\n").forEach((line) => {
            line = line.trim();
            if (line === "END") return;
            if (line === "") return;

            if (line.indexOf('RECORD') !== -1){

                weapon = line.replace('RECORD', '').trim();
                weapon = weapon.split("#")[0];

                results[weapon] = [];
            }else if(weapon){
                results[weapon].push(line);
            }

        });

        for(let name in results){
            Database.add(
                new Result(MimeType.CAMERA_TVP, this, undefined, name, 0, binary.length(), {
                    data: results[name]
                }, infos.path)
            );
        }
    }

    async decode(binary, options = {}, props = {}) {

        let result = [[]];
        let pairIndex = 0;
        let lineIndex = 0;

        props.data.forEach((line) => {

            var pos = this.parseTVPLine(line);
            if (pos.type === "VECPAIR") {
                result[pairIndex].push(pos);
            }else if (pos.type === "VECPAIR@"){
                result[pairIndex].push(pos);

                if (props.data.length - 1 !== lineIndex)
                    result[++pairIndex] = [];
            }

            lineIndex++;
        });

        return result;
    }

    parseTVPLine(str){
        let parts = str.replace(/\t/g, ' ')
            .replace(/ {2}/g, ' ')
            .split(" ");

        let dur = parseFloat(parts[1]);

        if (dur !== 0.0)
            dur -= 0.01666666753590107; //exe 0x5CB40A

        return {
            type: parts[0],
            dur: dur,
            posX: parseFloat(parts[2]),
            posZ: parseFloat(parts[3]),
            posY: parseFloat(parts[4]),

            lokX: parseFloat(parts[5]),
            lokZ: parseFloat(parts[6]),
            lokY: parseFloat(parts[7]),

            thr: parseFloat(parts[8]),
            rol: parseFloat(parts[9])
        };

    }
}

export default new CameraTvp();