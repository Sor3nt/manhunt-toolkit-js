import NBinary from "../NBinary.mjs";

export default class FileHandlerAbstract {

    tag = "abstract";


    /**
     * @param binary {NBinary}
     * @param filePath {string}
     * @returns {boolean}
     */
    canHandle(binary, filePath = ""){
        return false;
    }

    async processLocalFile( path, props = {} ){
        var file = await fetch(path);
        this.process(new NBinary(await file.arrayBuffer()), Object.assign({ path }, props));
    }

    processBinary( arrayBuffer, path, props = {} ){
        let buffer = arrayBuffer;

        if (arrayBuffer instanceof ArrayBuffer){
            buffer = new NBinary(arrayBuffer)
        }

        this.process(buffer, Object.assign({ path }, props));
    }

    /**
     *
     * @param {NBinary} binary
     * @param {{ path: string}} infos
     */
    process(binary, infos = {}){}

    /**
     *
     * @param {NBinary} binary
     * @param {{}} options
     * @param {{}} props
     * @return *
     */
    decode(binary, options = {}, props = {}){
        return false;
    }

}

