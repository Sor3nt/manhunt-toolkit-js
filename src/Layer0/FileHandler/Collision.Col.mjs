import FileHandlerAbstract from "./FileHandler.Abstract.mjs";
import Result from "../Result.mjs";
import MimeType from "../MimeType.mjs";
import Database from "../Database.mjs";

/**
 * TODO: decoder has only spheres yet...
 */
class CollisionCol extends FileHandlerAbstract{
    tag = "COL";

    canHandle(binary){
        try{
            let count = binary.consume(4, 'int32');
            let chunk = this.getChunkInfo(binary);

            return (chunk.offset < binary.length() && chunk.name.length > 3);

        }catch(e){
            return false;
        }
    }

    process(binary, infos){

        let count = binary.consume(4, 'int32');

        while(count--){
            let chunk = this.getChunkInfo(binary);

            Database.add(
                new Result(
                    MimeType.COLLISION,
                    this,
                    binary,
                    chunk.name,
                    chunk.offset,
                    chunk.size,
                    {},
                    infos.path
                )
            );
        }
    }

    async decode(binary, options = {}, props = {}) {

        let result = {
            name: binary.getString(0x00, true),
            center: binary.readXYZ(),
            radius: binary.float32(),
            min: binary.readXYZ(),
            max: binary.readXYZ(),
            spheres: []
        };

        let spheresCount = binary.int32();
        while(spheresCount--){

            result.spheres.push({
                center: binary.readXYZ(),
                radius: binary.float32(),
                surface: {
                    material: binary.int8(),
                    flag: binary.int8(),
                    brightness: binary.int8(),
                    light: binary.int8(),
                }
            });

        }

        return result;
    }

    getChunkInfo(binary){
        let startOffset = binary.current();

        let name = binary.getString(0x00, true);
        binary.seek(10 * 4);

        let spheresCount = binary.consume(4, 'int32');
        binary.seek((5 * 4) * spheresCount);

        let lineCount = binary.consume(4, 'int32');
        binary.seek((6 * 4) * lineCount);

        let boxesCount = binary.consume(4, 'int32');
        binary.seek((7 * 4) * boxesCount);

        let verticalCount = binary.consume(4, 'int32');
        binary.seek((3 * 4) * verticalCount);

        let faceCount = binary.consume(4, 'int32');
        binary.seek((3 * 4) * faceCount);

        return {
            name: name,
            offset: startOffset,
            size: binary.current() - startOffset
        };
    }
}

export default new CollisionCol();