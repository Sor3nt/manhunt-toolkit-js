import FileHandlerAbstract from "./FileHandler.Abstract.mjs";
import Result from "../Result.mjs";
import Texture from "../ThreeLoader/Texture.mjs";

import Database from "../Database.mjs";
import MimeType from "../MimeType.mjs";
import TextureFormat from "../TextureFormat.mjs";
import {DataTexture, RepeatWrapping, RGBAFormat} from "../../Vendor/three.module.mjs";


class ImageTex extends FileHandlerAbstract{
    tag = "TEX";

    canHandle(binary, filePath){
        try{
            binary.seek(9 * 4);
            let currentOffset = binary.uInt32();
            binary.setCurrent(currentOffset + 4);
            let prevOffset = binary.uInt32();

            return prevOffset === 36;
        }catch(e){
            return false;
        }
    }

    /**
     *
     * @param {NBinary} binary
     * @return {string}
     */
    detectPlatform(binary){
        binary.setCurrent(36);
        const currentOffset = binary.uInt32();
        binary
            .setCurrent(currentOffset + 96)   //jmp to dataOffset val
            .setCurrent(binary.uInt32())      //jmp to dataOffset
        ;

        //DDS
        if (binary.int32() === 542327876) return "PC";

        // Check numMipLevels for PSP
        return binary.setCurrent(currentOffset + 92).uInt8() === 1 ? "PSP" : "PS2";
    }


    process(binary, infos) {

        const platform = this.detectPlatform(binary);

        binary.setCurrent(3 * 4);
        let tblIndexOffset = binary.uInt32();

        binary.setCurrent(8 * 4);
        let count = binary.uInt32();
        let currentOffset = binary.uInt32();

        while(count--){
            binary.setCurrent(currentOffset);

            let nextOffset = binary.uInt32();
            let prevOffset = binary.uInt32();

            let name = binary.getString(0, false);

            let size;

            if (platform === "PC"){
                binary.setCurrent(currentOffset + 104);
                size = binary.uInt32();
            }else{
                //todo do i need this ? guess i can set size to zero, speed it up...
                size = tblIndexOffset - (currentOffset + 112)
                if (nextOffset > prevOffset)
                    size = nextOffset - (currentOffset + 112);
            }

            Database.add(
                new Result(MimeType.TEXTURE, this, binary, name, null, binary.length(), {
                    name,
                    offset: currentOffset,
                    size: size + 112,
                    platform
                }, infos.path)
            );

            currentOffset = nextOffset;
            if (currentOffset === 36) break;
        }
    }

    async decode(binary, options = {}, props = {}) {

        binary.setCurrent(props.offset)
        let texture;
        if (props.platform === "PC"){
            binary.seek(96);
            const offset = binary.int32();
            binary.seek(4);

            const size = binary.int32();
            binary.setCurrent(offset); //data offset

            texture = (new Texture({
                format: TextureFormat.FORMAT_DDS,
                data: binary.consume(size, 'arraybuffer')
            })).get();
        }else{
            binary.seek(72);
            const info = {
                width: binary.uInt32(),
                height: binary.uInt32(),
                bitPerPixel: binary.uInt32(),
                rasterFormat: binary.uInt32(),

                pixelFormat: binary.uInt32(),
                numMipLevels: binary.uInt8(),
                swizzleMask: binary.uInt8(),

                pPixel: binary.uInt8(),
                renderPass: binary.uInt8(),

                dataOffset: binary.uInt32(),
                paletteOffset: binary.uInt32(),
                palette: false
            };

            if (info.paletteOffset > 0){
                let paletteSize = this.calculatePaletteSize(info.rasterFormat, info.bitPerPixel);
                binary.setCurrent(info.paletteOffset);
                info.palette = binary.consume(paletteSize, 'nbinary');
            }

            const dataSize = this.getRasterSize(info.rasterFormat, info.width, info.height, info.bitPerPixel );
            binary.setCurrent(info.dataOffset);
            info.data = binary.consume(dataSize, 'nbinary');

            texture = new DataTexture(
                this.playstationToRGBA(info, props.platform),
                info.width,
                info.height,
                RGBAFormat
            );

            texture.wrapS = RepeatWrapping;
            texture.wrapT = RepeatWrapping;
            texture.minFilter = 1006;
            texture.needsUpdate = true;
        }


        texture.name = props.name;
        return texture;
    }

    /**
     *
     * @param info
     * @param {string} platform
     * @return {Uint8Array}
     */
    playstationToRGBA(info, platform){

        let palette = false;
        if (info.palette)
            palette = this.decode32ColorsToRGBA( info.palette );

        let rgbaArray;
        switch (info.bitPerPixel) {
            case 4:
                rgbaArray = this.convertIndexed4ToRGBA(
                    info.data,
                    info.width * info.height,
                    palette
                );

                break;
            case 8:
                if (platform === "PS2")
                    palette = this.paletteUnSwizzle(palette);

                rgbaArray = this.convertIndexed8ToRGBA(
                    info.data,
                    palette
                );

                break;
            case 32:
                rgbaArray = this.decode32ColorsToRGBA( info.data );
                break;

            default:
                debugger;
                break;
        }

        if (platform === "PS2" && info.swizzleMask & 0x1 !== 0) {
            rgbaArray = this.unswizzlePlaystation2(rgbaArray, info.width, info.height);
        }else if (platform === "PSP"){
            rgbaArray = this.unswizzlePlaystationPortable(rgbaArray, info.width, info.height, info.bitPerPixel === 4);
        }

        return new Uint8Array(rgbaArray.flatMap(block => block));
    }

    /**
     * This function converts an image stored in a "swizzled" (tiled) format,
     * back into a standard linear pixel format (unswizzled).
     *
     * @param {Array} bmpRgba - The array of pixel data in RGBA format (one element per pixel).
     *                          Each pixel is represented as a sub-array of four elements [R, G, B, A].
     * @param {number} width - The width of the image in pixels.
     * @param {number} height - The height of the image in pixels.
     * @param {boolean} as4Bit - A flag indicating whether the image is in a 4-bit color format,
     *                           which affects block size.
     * @returns {Array} - The unswizzled array of pixels in linear format.
     */
    unswizzlePlaystationPortable(bmpRgba, width, height, as4Bit) {
        if (width <= 16) return bmpRgba;

        const blockWidth = as4Bit ? 32 : 16;
        const blockHeight = 8;
        const blockSize = blockHeight * blockWidth;
        const size = bmpRgba.length;
        const blockCount = size / blockSize;
        const blocksPerRow = width / blockWidth;

        let unswizzled = new Array(size);

        for (let block = 0; block < blockCount; ++block) {
            const by = Math.floor(block / blocksPerRow) * blockHeight;
            const bx = (block % blocksPerRow) * blockWidth;

            let blockOffset = block * blockSize;
            for (let y = 0; y < blockHeight; ++y) {
                const destRowStart = (by + y) * width + bx;
                const srcRowStart = blockOffset + y * blockWidth;

                for (let x = 0; x < blockWidth; ++x) {
                    unswizzled[destRowStart + x] = bmpRgba[srcRowStart + x];
                }
            }
        }

        return unswizzled;
    }

    unswizzlePlaystation2(rgbaArray, width, height) {

        let result = [];

        for (let y = 0; y < height; y++){

            for (let x = 0; x < width; x++) {
                let block_loc = (y&(~0x0F))*width + (x&(~0x0F))*2;
                let swap_sel = (((y+2)>>2)&0x01)*4;
                let ypos = (((y&(~3))>>1) + (y&1))&0x07;
                let column_loc = ypos*width*2 + ((x+swap_sel)&0x07)*4;
                let byte_sum = ((y>>1)&1) + ((x>>2)&2);
                let swizzled = block_loc + column_loc + byte_sum;

                result[y*width+x] = rgbaArray[swizzled];
            }

        }

        return result;
    }

    convertIndexed8ToRGBA(binary, palette) {
        return Array.from(
            { length: binary.length() },
            () => palette[binary.uInt8()]
        );
    }

    paletteUnSwizzle(palette) {

        let newPalette = [];
        let i,j,chunk = 8;
        let palChunks = [];
        for (i=0,j=palette.length; i<j; i+=chunk) {
            palChunks.push(palette.slice(i,i+chunk));
        }

        let current = 0;
        let swapCount = 2;

        while(current < palChunks.length){

            let chunk = palChunks[current];

            if (current === 0){
                newPalette.push(chunk);
                current++;
                swapCount = 2;
                continue;
            }

            if (swapCount === 2){
                newPalette.push(palChunks[current + 1]);
                newPalette.push(palChunks[current]);
                current++;
                swapCount = 0;
            }else{
                newPalette.push(chunk);
                swapCount++;
            }

            current++;
        }

        let finalPalette = [];
        newPalette.forEach(function (chunk) {
            chunk.forEach(function (rgba) {
                finalPalette.push(rgba);
            });
        });

        return finalPalette;
    }

    convertIndexed4ToRGBA(binary, count, palette) {
        let result = [];

        for (let i = 0; i < count; i = i + 2) {
            let val = binary.uInt8();

            result.push(palette[val & 0x0F]);
            result.push(palette[val >> 4]);
        }

        return result;
    }

    /**
     *
     * @param {NBinary} colors
     * @return {int[]}
     */
    decode32ColorsToRGBA(colors) {
        const alphaDecodingTable = Array.from({ length: 256 }, (_, i) => (i > 0x80 ? 255 : i * 2));

        const result = [];
        while (colors.remain()) {
            result.push([
                colors.uInt8(), colors.uInt8(), colors.uInt8(),
                alphaDecodingTable[colors.uInt8()]
            ]);
        }

        return result;
    }

    /**
     *
     * @param {int} format
     * @param {int} bpp
     * @return {int}
     */
    calculatePaletteSize(format, bpp) {
        if (bpp === 8) {
            return 256 * 4;  // 256 Farben, 4 Bytes pro Farbe
        } else if (bpp === 4) {
            return 16 * 4;   // 16 Farben, 4 Bytes pro Farbe
        } else if (bpp === 32) {
            return 1024;
        } else {
            console.error("Unknown bpp: " + bpp);
            return -1;
        }
    }

    /**
     *
     * @param {int} format
     * @param {int} width
     * @param {int} height
     * @param {int} bpp
     * @return {int}
     */
    getRasterSize(format, width, height, bpp ){
        if (bpp === 8 || bpp === 32)
            return width * height;

        if (format === 256 && bpp === 4)
            return width * height;

        return (width * height) / 2;
    }

}

export default new ImageTex();