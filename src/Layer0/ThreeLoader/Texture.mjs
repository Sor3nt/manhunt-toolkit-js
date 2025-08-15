import {
    CompressedTexture, DataTexture, RepeatWrapping,
    RGB_S3TC_DXT1_Format,
    RGBA_S3TC_DXT1_Format,
    RGBA_S3TC_DXT3_Format,
    RGBA_S3TC_DXT5_Format, RGBAFormat
} from "../../Vendor/three.module.mjs";
import TextureFormat from "../TextureFormat.mjs";
import DDSLoader from "../../Vendor/DDSLoader.mjs";
import ImageDxt from "../FileHandler/Image.Dxt.mjs";
import helper from "../../Helper.mjs";

export default class Texture{

    constructor( props ){

        this.texture = {
            mipmaps: [ ],
            width: null,
            height: null,
            format: null
        };

        this.source = {
            data: props.data || null,
            mipmaps: props.mipmaps || [],
            palette: props.palette || null,
            bbp: props.bbp || null,
            platform: props.platform || null,
            format: props.format || null,
            swizzled: props.swizzled || false,
        }
    }

    get(){

        if (this.texture.format === null)
            this.#decode();


        let realTexture;
        if (
            this.texture.format === RGB_S3TC_DXT1_Format ||
            this.texture.format === RGBA_S3TC_DXT1_Format ||
            this.texture.format === RGBA_S3TC_DXT3_Format ||
            this.texture.format === RGBA_S3TC_DXT5_Format
        ){
            realTexture = new CompressedTexture(
                this.texture.mipmaps,
                this.texture.width,
                this.texture.height,
                this.texture.format
            );

        }else{
            realTexture = new DataTexture(
                this.texture.mipmaps[0].data,
                this.texture.width,
                this.texture.height,
                this.texture.format
            );
        }

        realTexture.wrapS = RepeatWrapping;
        realTexture.wrapT = RepeatWrapping;

        if (this.texture.mipmaps.length === 1)
            realTexture.minFilter = 1006;

        realTexture.needsUpdate = true;

        return realTexture;
    }

    #decode(){
        if (this.source.format === TextureFormat.FORMAT_DDS){
            this.texture = (new DDSLoader()).parse(this.source.data);
            this.texture.generateMipmaps = false;
            return;
        }

        this.texture.width = this.source.mipmaps[0].width;
        this.texture.height = this.source.mipmaps[0].height;

        if (
            this.source.format === RGB_S3TC_DXT1_Format ||
            this.source.format === RGBA_S3TC_DXT1_Format ||
            this.source.format === RGBA_S3TC_DXT3_Format ||
            this.source.format === RGBA_S3TC_DXT5_Format
        ){
            this.texture.format = this.source.format;
            this.texture.mipmaps = this.source.mipmaps;

            return;
        }

        this.source.mipmaps.forEach((mipmap) => {

            let data;
            switch (this.source.format) {
                case TextureFormat.FORMAT_BC1_RGBA:
                    data = ImageDxt.decodeBC1(mipmap.data, mipmap.width, mipmap.height);
                    this.texture.format = RGBAFormat;
                    break;
                case TextureFormat.FORMAT_BC1_RGB:
                    data = ImageDxt.decodeBC1(mipmap.data, mipmap.width, mipmap.height, false);
                    this.texture.format = RGBAFormat;
                    break;
                case TextureFormat.FORMAT_BC2_RGBA:
                    data = ImageDxt.decodeBC2(mipmap.data, mipmap.width, mipmap.height, false);
                    this.texture.format = RGBAFormat;
                    break;
                case TextureFormat.FORMAT_BC1_RGBA_WII:
                    helper.log("Textures", `Format FORMAT_BC1_RGBA_WII not implemented.`, 'error');

                    // let _data = Nintendo.unswizzle(mipmap.data, mipmap.width, mipmap.height, 8, 8);
                    // _data = DXT.decodeBC1(_data, mipmap.width, mipmap.height, false, false);
                    // data = new Uint8Array(Nintendo.flipBlocks(_data));
                    // this.texture.format = RGBAFormat;
                    break;

                default:
                    debugger;
            }

            this.texture.mipmaps.push({
                data: data,
                width: mipmap.width,
                height: mipmap.height,
            });
        });


        //
        // else if (this.source.platform === "wii")
        //     this.texture.mipmaps = this.#decodeWii();
        //
        // else if (this.source.platform === "pc")
        //     this.texture.mipmaps = this.#decodePc();


    }

}

