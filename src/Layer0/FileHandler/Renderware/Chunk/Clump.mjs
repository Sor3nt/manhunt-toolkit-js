
import Chunk from './Chunk.mjs'

export default class Clump extends Chunk{

    parse(){

        while(this.binary.remain() > 0){
            let chunk = this.processChunk(this.binary);
            this.result.chunks.push( chunk );
        }

        this.validateParsing(this);
    }

}