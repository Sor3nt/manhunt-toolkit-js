import Chunk from "./Chunk.mjs";

export default class Frame extends Chunk{

    result = {
        name: null,
        chunks: []
    };

    parse(){
        this.result.name = this.binary.getString(0);
        this.validateParsing(this);

        //we want to use the bone ids and not the real bone names
        // const boneId = this.rootData.boneIdArray[this.rootData.boneIdArray.length - 1];
        // this.result.name = "bone_" + boneId;

        this.rootData.frameNames.push(this.result.name);
    }

}