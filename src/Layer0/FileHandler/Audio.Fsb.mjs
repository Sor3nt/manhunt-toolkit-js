import AudioGenH from "./Audio.GenH.mjs";
import AudioWav from "./Audio.Wav.mjs";
import FileHandlerAbstract from "./FileHandler.Abstract.mjs";
import Result from "../Result.mjs";
import MimeType from "../MimeType.mjs";
import Database from "../Database.mjs";
import helper from "../../Helper.mjs";
import NBinary from "../NBinary.mjs";
import imaadpcm from "../../../node_modules/imaadpcm/index.js";

class AudioFsb extends FileHandlerAbstract{
    tag = "FSB";

    constructor() {
        super();

        this.sampleModes = {
            FSOUND_LOOP_OFF: 0x00000001, /* For non looping samples. */
            FSOUND_LOOP_NORMAL: 0x00000002, /* For forward looping samples. */
            FSOUND_LOOP_BIDI: 0x00000004, /* For bidirectional looping samples. (no effect if in hardware). */
            FSOUND_8BITS: 0x00000008, /* For 8 bit samples. */
            FSOUND_16BITS: 0x00000010, /* For 16 bit samples. */
            FSOUND_MONO: 0x00000020, /* For mono samples. */
            FSOUND_STEREO: 0x00000040, /* For stereo samples. */
            FSOUND_UNSIGNED: 0x00000080, /* For user created source data containing unsigned samples. */
            FSOUND_SIGNED: 0x00000100, /* For user created source data containing signed data. */
            FSOUND_DELTA: 0x00000200, /* For user created source data stored as delta values. */
            FSOUND_IT214: 0x00000400, /* For user created source data stored using IT214 compression. */
            FSOUND_IT215: 0x00000800, /* For user created source data stored using IT215 compression. */
            FSOUND_HW3D: 0x00001000, /* Attempts to make samples use 3d hardware acceleration. (if the card supports it) */
            FSOUND_2D: 0x00002000, /* Tells software (not hardware) based sample not to be included in 3d processing. */
            FSOUND_STREAMABLE: 0x00004000, /* For a streamimg sound where you feed the data to it. */
            FSOUND_LOADMEMORY: 0x00008000, /*name will be interpreted as a pointer to data for streaming and samples. */
            FSOUND_LOADRAW: 0x00010000, /* Will ignore file format and treat as raw pcm. */
            FSOUND_MPEGACCURATE: 0x00020000, /* For FSOUND_Stream_Open - for accurate FSOUND_Stream_GetLengthMs/FSOUND_Stream_SetTime. WARNING, see FSOUND_Stream_Open for inital opening time performance issues. */
            FSOUND_FORCEMONO: 0x00040000, /* For forcing stereo streams and samples to be mono - needed if using FSOUND_HW3D and stereo data - incurs a small speed hit for streams */
            FSOUND_HW2D: 0x00080000, /* 2D hardware sounds. allows hardware specific effects */
            FSOUND_ENABLEFX: 0x00100000, /* Allows DX8 FX to be played back on a sound. Requires DirectX 8 - Note these sounds cannot be played more than once, be 8 bit, be less than a certain size, or have a changing frequency */
            FSOUND_MPEGHALFRATE: 0x00200000, /* For FMODCE only - decodes mpeg streams using a lower quality decode, but faster execution */
            FSOUND_IMAADPCM: 0x00400000, /* Contents are stored compressed as IMA ADPCM */
            FSOUND_VAG: 0x00800000, /* For PS2 only - Contents are compressed as Sony VAG format */
            FSOUND_XMA: 0x01000000,
            FSOUND_GCADPCM: 0x02000000, /* For Gamecube only - Contents are compressed as Gamecube DSP-ADPCM format */
            FSOUND_MULTICHANNEL: 0x04000000, /* For PS2 and Gamecube only - Contents are interleaved into a multi-channel (more than stereo) format */
            FSOUND_USECORE0: 0x08000000, /* For PS2 only - Sample/Stream is forced to use hardware voices 00-23 */
            FSOUND_USECORE1: 0x10000000, /* For PS2 only - Sample/Stream is forced to use hardware voices 24-47 */
            FSOUND_LOADMEMORYIOP: 0x20000000, /* For PS2 only -name will be interpreted as a pointer to data for streaming and samples. The address provided will be an IOP address */
            FSOUND_IGNORETAGS: 0x40000000, /* Skips id3v2 etc tag checks when opening a stream, to reduce seek/read overhead when opening files (helps with CD performance) */
            FSOUND_STREAM_NET: 0x80000000, /* Specifies an internet stream */
            //        FSOUND_NORMAL: (0x00000010 | 0x00000100 | 0x00000020)
        };

        this.headerModes = {
            FSOUND_FSB_SOURCE_FORMAT: 0x00000001, /* all samples stored in their original compressed format */
            FSOUND_FSB_SOURCE_BASICHEADERS: 0x00000002, /* samples should use the basic header structure */
            UNK_BIG_ENDIAN_SAMPLES: 0x08,
            UNK_ALIGNED_FILES: 0x40,
        };
    }


    canHandle(binary, filePath){
        try {
            if (binary.int32() === 859984710) //FSB3
                return true;
        }catch(e){}
        return false;
    }


    process(binary, infos){
        binary.setCurrent(0);

        const version = this.getVersion(binary);
        if (version === false) return [];

        let fsbHeader = this.fSoundFsbHeader(binary, version);
        let fileOff = fsbHeader.size + fsbHeader.shdrSize;

        let entry = {
            name: "",
            size: 0,
            params: {
                parseIndex: 0,
                moreSizeDump: null,
                bits: 16,
            }
        }

        if (version === 3 && fsbHeader.version === 0x00030001) {
            const fs = this.fSoundFsbSampleHeader31(binary);
            console.log(fs);

            entry.name = fs.name;
            entry.size = fs.lengthCompressedBytes;

            Object.assign(entry.params, {
                frequency: fs.frequency,
                channels: fs.channels,
                mode: fs.mode,
                samples: fs.samples,
                moreSize: fs.size - 80
            });
        }else{
            helper.log(this.tag, `FSB${version} with header version ${fsbHeader.version} is not supported.`, 'error');
            return [];
        }

        Database.add(
            new Result(MimeType.AUDIO, this, binary, entry.name, fileOff, entry.size, {...entry.params}, infos.path)
        );
        fileOff += entry.size;

        for(let i = 1; i < fsbHeader.numSamples; i++){
            entry.params.parseIndex = i;

            if (version === 3){
                entry.name = i;
                entry.params.samples = binary.int32();
                entry.size = binary.int32();
            }else{
                helper.log(this.tag, `Version "${version}" is not supported.`, 'error');
                return false;
            }

            Database.add(
                new Result(MimeType.AUDIO, this, binary, entry.name, fileOff, entry.size, {...entry.params}, infos.path)
            );

            fileOff += entry.size;
        }
    }


    async decode(binary, options = {}, props = {}) {

        if (props.mode.indexOf('FSOUND_IMAADPCM') !== false){
console.log(props);

            const { pcm, totalSamples } = AudioWav.decodeImaAdpcm(new Uint8Array(binary.data), props.channels, 36);

            return {
                data: pcm,
                totalSamples,
                play: async () => {
                    await AudioWav.playPCM(pcm, props.channels, props.frequency);
                }
            };


            // const blob = new Blob([binary.data], { type:"application/octet-stream"});
            // const url = URL.createObjectURL(blob);
            // const a = document.createElement('a');
            // a.href = url;
            // a.download = "test.wav";
            // a.click();
            // URL.revokeObjectURL(url);



        }


        if (props.mode.indexOf('FSOUND_GCADPCM') !== false)
            return AudioGenH.encodeGenH(
                binary,
                props.channels,
                props.frequency,
                props.moreSizeDump,
                props.moreSize
            );

        helper.log(this.tag, `Mode "${mode.join(',')}" is not supported.`, 'error');

        return false;
    }


    resolveSampleMode(mode){
        let modes = [];
        for (name in this.sampleModes){
            if (mode & this.sampleModes[name]) modes.push(name);
        }

        return modes;
    }

    resolveHeaderMode(mode){
        let modes = [];
        for (name in this.headerModes){
            if (mode & this.headerModes[name]) modes.push(name);
        }

        return modes;
    }

    fSoundFsbHeader(header, version) {
        let result = {
            size: 24, //FSB3 size

            numSamples: header.int32(), /* number of samples in the file */
            shdrSize: header.int32(),   /* size in bytes of all of the sample headers including extended information */
            dataSize: header.int32(),   /* size in bytes of compressed sample data */
            version: header.int32(),    /* extended fsb version */

            mode: this.resolveHeaderMode(header.uInt32())
        };

        if (version === 4){
            result.size = 48;
            result.zerp = header.consume(8, 'nbinary');
            result.hash = header.consume(16, 'nbinary');
        }

        return result;
    }

    fSoundFsbSampleHeader31(binary){
        return {
            size: binary.int16(),
            name: binary.consume(30, 'nbinary').getString(0),
            samples: binary.int32(4, false),
            lengthCompressedBytes: binary.int32(4, false),
            loopStart: binary.int32(4, false),
            loopEnd: binary.int32(4, false),
            mode: this.resolveSampleMode(binary.int32( )),
            frequency: binary.int32(),
            defVol: binary.uInt16(),
            defPan: binary.int16(),
            defPri: binary.uInt16(),
            channels: binary.uInt16(),
            minDistance: binary.float32(),
            maxDistance: binary.float32(),
            varVol: binary.int32(),
            varFreq: binary.uInt16(false),
            varPan: binary.int16()
        };
    }

    getVersion(binary){

        const fourCC = binary.consume(3, 'string');

        if (fourCC !== "FSB") {
            helper.log(this.tag, `${fourCC} is not a valid FSB file`, 'error');
            return false;
        }

        const version = parseInt(binary.consume(1, 'string'));

        if (version > 4 || version < 3){
            helper.log(this.tag, `FSB${version} is not supported`, 'error');
            return false;
        }

        return version;
    }

    //
    // /**
    //  *
    //  * @param binary {NBinary}
    //  * @return {*[]}
    //  */
    // fsb2wav(binary){
    //     binary.setCurrent(0);
    //
    //     const version = this.getVersion();
    //     if (version === false) return [];
    //
    //     let fsbHeader = this.fSoundFsbHeader(binary, version);
    //
    //     let fileOff = fsbHeader.size + fsbHeader.shdrSize;
    //     let headMode = fsbHeader.mode;
    //
    //     console.log(
    //         `- FSB${version}
    //         version ${(fsbHeader.version >> 16) & 0xffff}.${fsbHeader.version & 0xffff}
    //         mode(s) ${headMode.join(',')}\n`
    //     );
    //
    //
    //
    //     let mode = 0 ;
    //     let moresize = 0 ;
    //     let freq = 44100;
    //     let bits = 16;
    //     let chans = 1;
    //
    //     let name;
    //     let size;
    //     let samples;
    //
    //     if (version === 3){
    //         if (fsbHeader.version === 0x00030001){
    //
    //             const fs = this.fSoundFsbSampleHeader31(binary);
    //
    //             name = fs.name;
    //             freq = fs.frequency;
    //             chans = fs.channels;
    //             mode = fs.mode;
    //             size = fs.lengthCompressedBytes;
    //             samples = fs.samples;
    //
    //             moresize = fs.size - 80;
    //
    //         }else{
    //             console.log('FSOUND_FSB_SAMPLE_HEADER_2 not implemented!');
    //             return false;
    //         }
    //     }else{
    //         console.error(`FSB Format "${version}" is not supported`);
    //         return false;
    //     }
    //
    //     let files = {};
    //     for(let i = 0; i < fsbHeader.numSamples; i++){
    //
    //         if (i > 0){
    //             if (version === 3){
    //                 name = i;
    //                 samples = binary.int32();
    //                 size = binary.int32();
    //             }else{
    //                 console.error(`FSB Format "{version}" is not supported`);
    //                 return false;
    //             }
    //         }
    //
    //         // switch (version){
    //         //
    //         //     case 3:
    //         //
    //         //         if (
    //         //             headMode.indexOf('FSOUND_FSB_SOURCE_BASICHEADERS') !== -1 &&
    //         //             i
    //         //         ){
    //         //             name = i;
    //         //             samples = binary.int32();
    //         //             size = binary.int32();
    //         //         }else{
    //         //             if (fsbHeader.version === 0x00030001){
    //         //
    //         //                 const fs = this.fSoundFsbSampleHeader31(binary);
    //         //
    //         //                 name = fs.name;
    //         //                 freq = fs.frequency;
    //         //                 chans = fs.channels;
    //         //                 mode = fs.mode;
    //         //                 size = fs.lengthCompressedBytes;
    //         //                 samples = fs.samples;
    //         //
    //         //                 moresize = fs.size - 80;
    //         //
    //         //             }else{
    //         //                 console.log('FSOUND_FSB_SAMPLE_HEADER_2 not implemented!');
    //         //                 return false;
    //         //             }
    //         //         }
    //         //
    //         //         break;
    //         //
    //         //     case 4:
    //         //         if (
    //         //             headMode.indexOf('FSOUND_FSB_SOURCE_BASICHEADERS') !== -1 &&
    //         //             i
    //         //         ){
    //         //             name = i;
    //         //             samples = binary.int32();
    //         //             size = binary.int32();
    //         //
    //         //         }else{
    //         //             const fs = this.fSoundFsbSampleHeader31(binary);
    //         //
    //         //             name = fs.name;
    //         //             freq = fs.frequency;
    //         //             chans = fs.channels;
    //         //             mode = fs.mode;
    //         //             size = fs.lengthCompressedBytes;
    //         //             samples = fs.samples;
    //         //
    //         //             moresize = fs.size - 80;
    //         //         }
    //         //
    //         //         break;
    //         //
    //         //     default:
    //         //         console.error(`FSB Format "{version}" is not supported`);
    //         //         return false;
    //         // }
    //
    //         console.log(name, size, mode.join(','), freq, chans, bits, moresize);
    //
    //         let moresize_dump = null;
    //         if (moresize > 0)
    //             moresize_dump = binary.consume(moresize, 'nbinary');
    //
    //         let current_offset = binary.current();
    //         binary.setCurrent(fileOff);
    //
    //         if (mode.indexOf('FSOUND_GCADPCM') !== -1)
    //             name += `.genh`;
    //         else if (mode.indexOf('FSOUND_IMAADPCM') !== -1)
    //             name += `.wav`;
    //         else
    //             name += `.unk`;
    //
    //         const file = this.extract_file(binary, freq, chans, bits, size, moresize_dump, moresize, samples, mode);
    //
    //         if (file === false){
    //             console.error('Unable to extract file :(');
    //             return false;
    //         }
    //
    //         files[name] = file;
    //         fileOff += size;
    //
    //         binary.setCurrent(current_offset);
    //     }
    //
    //     return files;
    //
    // }
    //
    // extract_file(
    //     binary,
    //     freq,
    //     chans,
    //     bits,
    //     size,
    //     moresize_dump,
    //     moresize,
    //     samples,
    //     mode)
    // {
    //     const raw = binary.consume(size, 'nbinary');
    //
    //     if (mode.indexOf('AD') !== false)
    //         // return raw;
    //         return AudioWav.adPcm(raw, samples, chans, freq);
    //
    //     if (mode.indexOf('FSOUND_GCADPCM') !== false)
    //         return AudioGenH.encodeGenH(raw, chans, freq, moresize_dump, moresize);
    //
    //     console.error(`Mode {mode} is unsupported`);
    //
    //     return false;
    //
    // }
}

export default new AudioFsb();