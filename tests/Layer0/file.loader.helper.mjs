import NBinary from "../../src/Layer0/NBinary.mjs";
import fs from "fs";
import FileLoader from "../../src/Layer0/FileLoader.mjs";
import assert from "assert";
import Helper from "../../src/Helper.mjs";

class FileLoaderHelper {


    load( filePath, expectedHandler, props = {}, doTest = true ) {
        const binary = new NBinary((new Uint8Array(fs.readFileSync(filePath))).buffer);
        const handler = FileLoader.findHandler(binary, filePath)

        if (handler === undefined){
            Helper.log('FileLoaderHelper','Unable to find handler for ' + filePath, 'error');
            return;
        }

        if (handler !== expectedHandler){
            console.error('Handler does not match', handler);
            return;
        }

        handler.processBinary(binary, filePath, props);

        return handler
    }

}

export default new FileLoaderHelper();