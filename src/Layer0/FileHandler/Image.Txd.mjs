import FileHandlerAbstract from "./FileHandler.Abstract.mjs";
import Result from "../Result.mjs";
import Texture from "../ThreeLoader/Texture.mjs";

import Database from "../Database.mjs";
import MimeType from "../MimeType.mjs";
import TextureFormat from "../TextureFormat.mjs";
import {DataTexture, RepeatWrapping, RGB_S3TC_DXT1_Format, RGBAFormat} from "../../Vendor/three.module.mjs";
import NBinary from "../NBinary.mjs";
import ImageDxt from "./Image.Dxt.mjs";


class ImageTxd extends FileHandlerAbstract{
    tag = "TXD";

    canHandle(binary, filePath){
        // TDCT
        return binary.int32() === 1413694548;
    }

    process(binary, infos) {
        binary.seek(8 * 4);
        let textureCount = binary.int32();
        if (textureCount > 10000){
            infos.platform = "wii";
            binary.littleEndian = false;
            textureCount = binary.seek(-4).int32();
        }

        const offsets = {first: binary.int32(), last: binary.int32()};
        let currentOffset = offsets.first;

        for(let i = 0; i < textureCount; i++){
            binary.setCurrent(currentOffset);
            let partOffsets = {next: binary.int32(), prev: binary.int32()}


            const name = binary.consume(96, 'nbinary').getString(0)

            Database.add(
                new Result(MimeType.TEXTURE, this, binary, name, 0, binary.length(), {
                    name,
                    offset: binary.current()
                }, infos.path)
            );

            currentOffset = partOffsets.next;
        }
    }

    async decode(binary, options = {}, props = {}) {
        binary.littleEndian = true;

        binary.setCurrent(props.offset);

        const infos = {
            width: binary.int32(),
            height: binary.int32(),
            bitPerPixel: binary.int32(),
            rasterFormat: binary.int32(),
            dataOffset: binary.seek(8).int32(false),
            dataSize: binary.seek(4).int32(),
        };

        binary.setCurrent(infos.dataOffset + 4);

        const headerCount = binary.int32(false);
        binary.seek(12 + (headerCount === 2 ? 8 : 0));

        infos.height = binary.int16(false);
        infos.width = binary.int16(false);
        binary.seek(4 * 4);
        infos.numMipMaps = binary.int32(false);

        binary.setCurrent(infos.dataOffset + (64 * headerCount));

        const levelSize = (Math.floor(infos.width / 4) * Math.floor(infos.height / 4)) * 8;
        const mipmap0 = binary.consume(levelSize, 'nbinary');

        const texture = new DataTexture(
            this.decodeData(infos, this.unswizzle(infos, mipmap0.data)),
            infos.width,
            infos.height,
            RGBAFormat
        );

        texture.wrapS = RepeatWrapping;
        texture.wrapT = RepeatWrapping;
        texture.minFilter = 1006;
        texture.needsUpdate = true;

        return texture;
    }

    getMipmaps(binary, infos) {
        const mipmaps = [];
        let offset = 0;

        for (let i = 0; i < infos.numMipMaps; i++) {
            const levelWidth = Math.max(1, infos.width >> i);
            const levelHeight = Math.max(1, infos.height >> i);
            const levelSize = levelWidth * levelHeight * 3;


            const mipmap = binary.consume(levelSize, 'nbinary');
            // const mipmap = new Uint8Array(buffer, offset, levelSize);
            mipmaps.push({
                width: levelWidth,
                height: levelHeight,
                data: mipmap
            });

            offset += levelSize;
        }

        return mipmaps;
    }

    unswizzle(texture, input) {
        var bmpRgba = new Uint8Array(input);
        var result = new Uint8Array(bmpRgba.length);

        var BlocksPerW = texture.width / 8;
        var BlocksPerH = texture.height / 8;

        for (var h = 0; h < BlocksPerH; h++) {
            for (var w = 0; w < BlocksPerW; w++) {
                for (var BlocksPerRow = 0; BlocksPerRow < 2; BlocksPerRow++) {
                    var swizzled = h * BlocksPerW * 32 + w * 32 + BlocksPerRow * 16;
                    var unswizzled = h * BlocksPerW * 32 + w * 16 + BlocksPerRow * BlocksPerW * 16;

                    for (var n = 0; n < 16; n++) {
                        result[unswizzled + n] = bmpRgba[swizzled + n];
                    }
                }
            }
        }

        return new NBinary(result.buffer);
    }

    decodeData(infos, binary){
        binary.littleEndian = false;

        const rgba = new Uint8Array(infos.width * infos.height * 4);

        const height4 = Math.floor(infos.height / 4);
        const width4 = Math.floor(infos.width / 4);

        for (let h = 0; h < height4; h++) {
            for (let w = 0; w < width4; w++) {

                const firstVal = binary.uInt16();
                const secondVal = binary.uInt16();

                const colorValues = ImageDxt.interpolateColorValues(firstVal, secondVal, true);

                //todo maybe i need true...
                const colorIndices = binary.uInt32();

                for (let y = 0; y < 4; y++) {
                    for (let x = 0; x < 4; x++) {
                        const pixelIndex = (3 - x) + (y * 4);
                        const rgbaIndex = ((h * 4 + 3 - y) * infos.width + (w * 4 + x)) * 4;
                        const colorIndex = (colorIndices >> (2 * (15 - pixelIndex))) & 0x03;

                        // Copy interpolated color values
                        rgba[rgbaIndex] = colorValues[colorIndex * 4];
                        rgba[rgbaIndex + 1] = colorValues[colorIndex * 4 + 1];
                        rgba[rgbaIndex + 2] = colorValues[colorIndex * 4 + 2];
                        rgba[rgbaIndex + 3] = colorValues[colorIndex * 4 + 3];
                    }
                }
            }
        }

        return rgba;
    }



    // async decode(binary, options = {}, props = {}) {
        //
        //     binary.setCurrent(props.offset)
        //     let texture;
        //     if (props.platform === "PC"){
        //         binary.seek(96);
        //         const offset = binary.int32();
        //         binary.seek(4);
        //
        //         const size = binary.int32();
        //         binary.setCurrent(offset); //data offset
        //
        //         texture = (new Texture({
        //             format: TextureFormat.FORMAT_DDS,
        //             data: binary.consume(size, 'arraybuffer')
        //         })).get();
        //     }else{
        //         binary.seek(72);
        //         const info = {
        //             width: binary.uInt32(),
        //             height: binary.uInt32(),
        //             bitPerPixel: binary.uInt32(),
        //             rasterFormat: binary.uInt32(),
        //
        //             pixelFormat: binary.uInt32(),
        //             numMipLevels: binary.uInt8(),
        //             swizzleMask: binary.uInt8(),
        //
        //             pPixel: binary.uInt8(),
        //             renderPass: binary.uInt8(),
        //
        //             dataOffset: binary.uInt32(),
        //             paletteOffset: binary.uInt32(),
        //             palette: false
        //         };
        //
        //         if (info.paletteOffset > 0){
        //             let paletteSize = this.calculatePaletteSize(info.rasterFormat, info.bitPerPixel);
        //             binary.setCurrent(info.paletteOffset);
        //             info.palette = binary.consume(paletteSize, 'nbinary');
        //         }
        //
        //         const dataSize = this.getRasterSize(info.rasterFormat, info.width, info.height, info.bitPerPixel );
        //         binary.setCurrent(info.dataOffset);
        //         info.data = binary.consume(dataSize, 'nbinary');
        //
        //         texture = new DataTexture(
        //             this.playstationToRGBA(info, props.platform),
        //             info.width,
        //             info.height,
        //             RGBAFormat
        //         );
        //
        //         texture.wrapS = RepeatWrapping;
        //         texture.wrapT = RepeatWrapping;
        //         texture.minFilter = 1006;
        //         texture.needsUpdate = true;
        //     }
        //
        //
        //     texture.name = props.name;
        //     return texture;
        // }
        //
        // /**
        //  *
        //  * @param info
        //  * @param {string} platform
        //  * @return {Uint8Array}
        //  */
        // playstationToRGBA(info, platform){
        //
        //     let palette = false;
        //     if (info.palette)
        //         palette = this.decode32ColorsToRGBA( info.palette );
        //
        //     let rgbaArray;
        //     switch (info.bitPerPixel) {
        //         case 4:
        //             rgbaArray = this.convertIndexed4ToRGBA(
        //                 info.data,
        //                 info.width * info.height,
        //                 palette
        //             );
        //
        //             break;
        //         case 8:
        //             if (platform === "PS2")
        //                 palette = this.paletteUnSwizzle(palette);
        //
        //             rgbaArray = this.convertIndexed8ToRGBA(
        //                 info.data,
        //                 palette
        //             );
        //
        //             break;
        //         case 32:
        //             rgbaArray = this.decode32ColorsToRGBA( info.data );
        //             break;
        //
        //         default:
        //             debugger;
        //             break;
        //     }
        //
        //     if (platform === "PS2" && info.swizzleMask & 0x1 !== 0) {
        //         rgbaArray = this.unswizzlePlaystation2(rgbaArray, info.width, info.height);
        //     }else if (platform === "PSP"){
        //         rgbaArray = this.unswizzlePlaystationPortable(rgbaArray, info.width, info.height, info.bitPerPixel === 4);
        //     }
        //
        //     return new Uint8Array(rgbaArray.flatMap(block => block));
        // }
        //
        // /**
        //  * This function converts an image stored in a "swizzled" (tiled) format,
        //  * back into a standard linear pixel format (unswizzled).
        //  *
        //  * @param {Array} bmpRgba - The array of pixel data in RGBA format (one element per pixel).
        //  *                          Each pixel is represented as a sub-array of four elements [R, G, B, A].
        //  * @param {number} width - The width of the image in pixels.
        //  * @param {number} height - The height of the image in pixels.
        //  * @param {boolean} as4Bit - A flag indicating whether the image is in a 4-bit color format,
        //  *                           which affects block size.
        //  * @returns {Array} - The unswizzled array of pixels in linear format.
        //  */
        // unswizzlePlaystationPortable(bmpRgba, width, height, as4Bit) {
        //     if (width <= 16) return bmpRgba;
        //
        //     const blockWidth = as4Bit ? 32 : 16;
        //     const blockHeight = 8;
        //     const blockSize = blockHeight * blockWidth;
        //     const size = bmpRgba.length;
        //     const blockCount = size / blockSize;
        //     const blocksPerRow = width / blockWidth;
        //
        //     let unswizzled = new Array(size);
        //
        //     for (let block = 0; block < blockCount; ++block) {
        //         const by = Math.floor(block / blocksPerRow) * blockHeight;
        //         const bx = (block % blocksPerRow) * blockWidth;
        //
        //         let blockOffset = block * blockSize;
        //         for (let y = 0; y < blockHeight; ++y) {
        //             const destRowStart = (by + y) * width + bx;
        //             const srcRowStart = blockOffset + y * blockWidth;
        //
        //             for (let x = 0; x < blockWidth; ++x) {
        //                 unswizzled[destRowStart + x] = bmpRgba[srcRowStart + x];
        //             }
        //         }
        //     }
        //
        //     return unswizzled;
        // }
        //
        // unswizzlePlaystation2(rgbaArray, width, height) {
        //
        //     let result = [];
        //
        //     for (let y = 0; y < height; y++){
        //
        //         for (let x = 0; x < width; x++) {
        //             let block_loc = (y&(~0x0F))*width + (x&(~0x0F))*2;
        //             let swap_sel = (((y+2)>>2)&0x01)*4;
        //             let ypos = (((y&(~3))>>1) + (y&1))&0x07;
        //             let column_loc = ypos*width*2 + ((x+swap_sel)&0x07)*4;
        //             let byte_sum = ((y>>1)&1) + ((x>>2)&2);
        //             let swizzled = block_loc + column_loc + byte_sum;
        //
        //             result[y*width+x] = rgbaArray[swizzled];
        //         }
        //
        //     }
        //
        //     return result;
        // }
        //
        // convertIndexed8ToRGBA(binary, palette) {
        //     return Array.from(
        //         { length: binary.length() },
        //         () => palette[binary.uInt8()]
        //     );
        // }
        //
        // paletteUnSwizzle(palette) {
        //
        //     let newPalette = [];
        //     let i,j,chunk = 8;
        //     let palChunks = [];
        //     for (i=0,j=palette.length; i<j; i+=chunk) {
        //         palChunks.push(palette.slice(i,i+chunk));
        //     }
        //
        //     let current = 0;
        //     let swapCount = 2;
        //
        //     while(current < palChunks.length){
        //
        //         let chunk = palChunks[current];
        //
        //         if (current === 0){
        //             newPalette.push(chunk);
        //             current++;
        //             swapCount = 2;
        //             continue;
        //         }
        //
        //         if (swapCount === 2){
        //             newPalette.push(palChunks[current + 1]);
        //             newPalette.push(palChunks[current]);
        //             current++;
        //             swapCount = 0;
        //         }else{
        //             newPalette.push(chunk);
        //             swapCount++;
        //         }
        //
        //         current++;
        //     }
        //
        //     let finalPalette = [];
        //     newPalette.forEach(function (chunk) {
        //         chunk.forEach(function (rgba) {
        //             finalPalette.push(rgba);
        //         });
        //     });
        //
        //     return finalPalette;
        // }
        //
        // convertIndexed4ToRGBA(binary, count, palette) {
        //     let result = [];
        //
        //     for (let i = 0; i < count; i = i + 2) {
        //         let val = binary.uInt8();
        //
        //         result.push(palette[val & 0x0F]);
        //         result.push(palette[val >> 4]);
        //     }
        //
        //     return result;
        // }
        //
        // /**
        //  *
        //  * @param {NBinary} colors
        //  * @return {int[]}
        //  */
        // decode32ColorsToRGBA(colors) {
        //     const alphaDecodingTable = Array.from({ length: 256 }, (_, i) => (i > 0x80 ? 255 : i * 2));
        //
        //     const result = [];
        //     while (colors.remain()) {
        //         result.push([
        //             colors.uInt8(), colors.uInt8(), colors.uInt8(),
        //             alphaDecodingTable[colors.uInt8()]
        //         ]);
        //     }
        //
        //     return result;
        // }
        //
        // /**
        //  *
        //  * @param {int} format
        //  * @param {int} bpp
        //  * @return {int}
        //  */
        // calculatePaletteSize(format, bpp) {
        //     if (bpp === 8) {
        //         return 256 * 4;  // 256 Farben, 4 Bytes pro Farbe
        //     } else if (bpp === 4) {
        //         return 16 * 4;   // 16 Farben, 4 Bytes pro Farbe
        //     } else if (bpp === 32) {
        //         return 1024;
        //     } else {
        //         console.error("Unknown bpp: " + bpp);
        //         return -1;
        //     }
        // }
        //
        // /**
        //  *
        //  * @param {int} format
        //  * @param {int} width
        //  * @param {int} height
        //  * @param {int} bpp
        //  * @return {int}
        //  */
        // getRasterSize(format, width, height, bpp ){
        //     if (bpp === 8 || bpp === 32)
        //         return width * height;
        //
        //     if (format === 256 && bpp === 4)
        //         return width * height;
        //
        //     return (width * height) / 2;
        // }

    }

    export default new ImageTxd();