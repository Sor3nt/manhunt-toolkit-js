import Chunk from "./Chunk.mjs";

export default class HAnimPlugin extends Chunk{

    result = {

        chunks: []
    };

    parse(){


        //unknown data
        this.binary.seek(this.header.size);

        this.validateParsing(this);
    }

}