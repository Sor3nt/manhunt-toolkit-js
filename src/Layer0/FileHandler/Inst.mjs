import FileHandlerAbstract from "./FileHandler.Abstract.mjs";
import ResolveHashes from "../Resolve.Hashes.mjs";
import Database from "../Database.mjs";
import Result from "../Result.mjs";
import MimeType from "../MimeType.mjs";

class Inst extends FileHandlerAbstract{
    tag = "INST";

    canHandle(binary, filePath){
        if (binary.remain() <= 0) return false;

        let count = binary.int32();
        if (count < 0) return false;
        if (binary.remain() < count * 4) return false;

        let calcSize = 0;
        while(count-- > 0){
            calcSize += binary.int32();
        }

        let remain = binary.remain();
        return remain === calcSize;
    }

    process(binary, infos) {

        let count = binary.int32();

        let entityDataSize = [];
        while(count--){
            entityDataSize.push(binary.int32());
        }

        let game = false;

        entityDataSize.forEach( (size) => {
            let offset = binary.current();
            let endOffset = offset + size;

            let glgName = binary.getString(0, true);
            let internalName = binary.getString(0, true);

            //we need to detect the game (mh1 or mh2)
            if (game === false){
                binary.seek(7 * 4);
                binary.getString(0, true);

                if (binary.remain() >= 12){
                    binary.seek(4);
                    let maybeType  = binary.getString(0, true);

                    if ([ 'flo', 'boo', 'str', 'int' ].indexOf(maybeType) !== -1){
                        game = 'mh2';
                    }else{
                        game = 'mh';
                    }
                }else{
                    game = 'mh';
                }
            }

            Database.add(
                new Result(MimeType.INST, this, binary, internalName, offset, endOffset - offset, {
                    game,
                    glgName
                }, infos.path)
            );

            binary.setCurrent(endOffset);
        });
    }


    async decode(binary, options = {}, props = {}) {

        let glgName = binary.getString(0, true);
        let name = binary.getString(0, true);

        let position = binary.readXYZ();
        let posZ = position.z;
        position.z = position.y * -1;
        position.y = posZ;

        let rotation = binary.readXYZW();
        let y = rotation.y;
        rotation.y = rotation.z * -1;
        rotation.z = y * -1;

        let entityClass = binary.getString(0, true);

        let settings = [];

        let fieldIndex = 0;
        while(binary.remain()){
            let setting = {
                name : 'unk_' + fieldIndex,
                hash: false,
                type: 'int'
            };

            if (props.game === 'mh') {

                if (entityClass === "Light_Inst") {
                    switch (fieldIndex) {
                        case 0:
                            setting.name = 'Type';
                            setting.type = 'int';
                            setting.value = binary.int32();
                            break;
                        case 1:
                            setting.name = 'Cone Angle';
                            setting.type = 'int';
                            setting.value = binary.int32();
                            break;
                        case 2:
                            setting.name = 'Radius';
                            setting.type = 'int';
                            setting.value = binary.int32();
                            break;
                        case 3:
                            setting.name = 'Color Red';
                            setting.type = 'flo';
                            setting.value = binary.float32();
                            break;
                        case 4:
                            setting.name = 'Color Green';
                            setting.type = 'flo';
                            setting.value = binary.float32();
                            break;
                        case 5:
                            setting.name = 'Color Blue';
                            setting.type = 'flo';
                            setting.value = binary.float32();
                            break;
                        case 6:
                        case 7:
                        case 8:
                        case 9:
                        case 10:
                        case 11:
                        case 12:
                            setting.name = 'Flag ' + (fieldIndex - 5);
                            setting.type = 'int';
                            setting.value = binary.int32();
                            break;
                        case 13:
                            setting.name = 'Size';
                            setting.type = 'flo';
                            setting.value = binary.float32();
                            break;
                        case 14:
                            setting.name = 'Intensity';
                            setting.type = 'int';
                            setting.value = binary.int32();
                            break;
                        default:
                            setting.value = binary.int32();
                    }
                }else if (entityClass === "Trigger_Inst"){
                    switch (fieldIndex) {
                        case 1:
                            setting.name = 'radius';
                            setting.type = 'flo';
                            setting.value = binary.float32();
                            break;
                        default:
                            setting.value = binary.int32();
                    }
                }else{
                    setting.value = binary.int32();
                }

            }
            else {

                setting.hash = binary.uInt32();
                setting.name = await ResolveHashes.instOption(setting.hash);

                setting.type = binary.consume(3, 'string');
                binary.seek(1);

                if (
                    setting.name === "Colour: Blue" ||
                    setting.name === "Colour: Green" ||
                    setting.name === "Colour: Red"
                ){
                    setting.value = binary.float32() * 255.0;

                }else{

                    if (setting.type === "int" || setting.type === "boo") {
                        setting.value = binary.uInt32();
                    }else if (setting.type === "flo"){
                        setting.value = binary.float32();
                    }else if (setting.type === "str"){
                        setting.value = binary.getString(0, true);
                    }
                }
            }

            settings.push(setting);

            fieldIndex++;
        }

        return {
            glgName,
            name,
            position,
            rotation,
            entityClass,
            settings
        };
    }

}

export default new Inst();
