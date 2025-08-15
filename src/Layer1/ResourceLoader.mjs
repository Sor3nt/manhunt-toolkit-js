import NBinary from "../Layer0/NBinary.mjs";
import Helper from "../Helper.mjs";
import FileLoader from "../Layer0/FileLoader.mjs";

class ResourceLoader {


    /**
     *
     * @param {string|string[]} filePath
     * @param {{platform: string}} props
     * @return {Promise<ResourceLoader>}
     */
    async load(filePath, props = {}){

        let filePaths = filePath;
        if (typeof filePath === "string")
            filePaths = [filePath];

        for (let i in filePaths) {
            filePath = filePaths[i];

            const data = await (await fetch(filePath)).arrayBuffer();
            const binary = new NBinary(data);
            this.process(filePath, binary, props)

        }

        return this;
    }

    /**
     *
     * @param {string} filePath
     * @param {NBinary} binary
     * @param {{platform: string}} props
     * @return {ResourceLoader}
     */
    process(filePath, binary, props){
        const handler = FileLoader.findHandler(binary, filePath);
        if (handler === undefined) {
            Helper.log('FileLoader', 'Unable to find handler for ' + filePath, 'error');
            return this;
        }

        handler.processBinary(binary, filePath, props);

        Helper.log('FileLoader', `File ${filePath} loaded.`, 'info')

        return this;
    }
}

export default new ResourceLoader();

