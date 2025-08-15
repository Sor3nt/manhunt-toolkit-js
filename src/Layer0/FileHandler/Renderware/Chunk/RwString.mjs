
import Chunk from "./Chunk.mjs";

export default class RwString extends Chunk{

    result = {
        name: null,
        chunks: []
    };

    parse(){
        this.result.name = this.binary.getString(0,true);
        this.validateParsing(this);
    }

}