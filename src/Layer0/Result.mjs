import {MathUtils} from "../Vendor/three.module.mjs";

export default class Result{

    /**  @type {string} */
    file = "";

    /**  @type {string} */
    fileName = "";

    /**  @type {string} */
    filePath = "";

    level = null;

    /**
     *
     * @type {NBinary|null}
     */
    cache = null;


    /**
     *
     * @param type
     * @param {FileHandlerAbstract} handler
     * @param {NBinary|undefined} binary
     * @param name
     * @param offset
     * @param size
     * @param props
     * @param path
     */
    constructor(type, handler, binary, name, offset = 0, size = 0, props = {}, path = ""){

        this.uuid = MathUtils.generateUUID();
        this.type = type;
        this.handler = handler;

        this.name = name;
        this.binary = binary;
        this.offset = offset;
        this.size = size;

        this.props = props;

        this.level = null;
        this.gameId = null;

        if (path !== undefined)
            this.setFilePath(path);

        if (name === undefined && path !== undefined)
            this.name = this.fileName;
    }

    setFilePath(_path){
        let path = _path.replace("\\", "/"); //normalize

        let parts = path.split("/");
        this.file = parts[parts.length - 1];

        //try to set the level
        {
            this.level = "";
            parts.forEach((part, index) => {
                if (part.toLowerCase() === "levels")
                    this.level = parts[index + 1].toLowerCase();
            });

            // if (levelName === "" && parts.length > 2 && parts[0] === "")
            //     levelName = parts[1];

        }

        this.filePath = path;
        this.fileName = this.file.split(".")[0];
    }

    /**
     * Return the RAW chunk
     * @return {NBinary|false}
     */
    get() {
        if (this.binary === undefined)
            return false;

        if (this.cache !== null) {
            this.cache.setCurrent(0);
            return this.cache;
        }

        //we want to consume the whole file, just copy the binary ref
        if (this.offset === 0 && this.binary.length() === this.size){
            this.binary.setCurrent(0);
            this.cache = this.binary;
        }else{
            this.binary.setCurrent(this.offset);
            this.cache = this.binary.consume(this.size, 'nbinary');
        }

        return this.cache;
    }

    async decode(options = {}) {
        if (this.binary === undefined)
            return this.handler.decode(undefined, options, this.props);

        if (this.offset >= 0 && this.size === 0){
            this.binary.setCurrent(this.offset);

            return await this.handler.decode(this.binary, options, this.props);
        }

        return await this.handler.decode(this.get(), options, this.props);
    }
}
