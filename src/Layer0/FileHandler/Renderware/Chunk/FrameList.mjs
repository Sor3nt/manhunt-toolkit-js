import Renderware from "../Renderware.mjs";
import Helper from "../../../../Helper.mjs";
import Chunk from "./Chunk.mjs";
import helper from "../../../../Helper.mjs";
const assert = Helper.assert;

export default class FrameList extends Chunk{
    result = {
        chunks: []
    };

    parse(){

        let frameList = [];
        while(this.binary.remain() > 0){
            let chunk = this.processChunk(this.binary);

            switch (chunk.header.id) {

                //Contains FRAME
                case Renderware.CHUNK_EXTENSION:
                    this.result.chunks.push(chunk);
                    break;

                case Renderware.CHUNK_STRUCT:

                    let frameCount = chunk.binary.consume(4, 'int32');
                    for(let i = 0; i < frameCount; i++){
                        frameList.push({
                            matrix: [
                                chunk.binary.consume(4, 'float32'), chunk.binary.consume(4, 'float32'), chunk.binary.consume(4, 'float32'), 0,
                                chunk.binary.consume(4, 'float32'), chunk.binary.consume(4, 'float32'), chunk.binary.consume(4, 'float32'), 0,
                                chunk.binary.consume(4, 'float32'), chunk.binary.consume(4, 'float32'), chunk.binary.consume(4, 'float32'), 0,
                                chunk.binary.consume(4, 'float32'), chunk.binary.consume(4, 'float32'), chunk.binary.consume(4, 'float32'), 1
                            ],
                            parentFrameID: chunk.binary.consume(4, 'int32') + 1,
                            matrixCreationFlags: chunk.binary.consume(4, 'int32'),
                        });
                    }

                    assert(chunk.binary.remain(), 0, 'FrameList: Unable to parse fully the data!');

                    break;
                default:
                    helper.log('RW', `FrameList: Unknown ChunkId ${chunk.header.id}.`, 'error');
                    break;
            }

        }

        this.result.frameList = frameList;

        this.validateParsing(this);

        this.rootData.frames = this.result;
    }

}