

import Chunk from './Chunk.mjs'
import Renderware from "../Renderware.mjs";
import Helper from "../../../../Helper.mjs";
const assert = Helper.assert;


export default class Atomic extends Chunk{

    result = {
        frameIndex: null,
        geometryIndex: null,
        flags: null,
        chunks: []
    };

    parse(){

        let struct = this.processChunk(this.binary);
        assert(struct.type, Renderware.CHUNK_STRUCT);

        this.result.frameIndex = struct.binary.consume(4, 'int32');
        this.result.geometryIndex = struct.binary.consume(4, 'int32');
        this.result.flags = struct.binary.consume(4, 'int32');
        struct.binary.consume(4, 'int32'); //constant

        this.validateParsing(struct);

        let extention = this.processChunk(this.binary);
        assert(extention.type, Renderware.CHUNK_EXTENSION);
        this.result.chunks.push(extention);

        this.validateParsing(this);

        this.rootData.atomics.push(this.result);
    }

}