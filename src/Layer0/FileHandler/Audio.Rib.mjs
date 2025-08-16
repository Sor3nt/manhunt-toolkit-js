import NBinary from "../NBinary.mjs";
import AudioWav from "./Audio.Wav.mjs";
import FileHandlerAbstract from "./FileHandler.Abstract.mjs";
import Database from "../Database.mjs";
import Result from "../Result.mjs";
import MimeType from "../MimeType.mjs";

/**
 * Manhunt 1 - Audio Format | *.RIB
 *
 * Code was ported from https://github.com/winterheart/ManhuntRIBber | Thanks for the awesome work!
 */
class AudioRib extends FileHandlerAbstract {
    tag = "RIB";

    constructor() {
        super();

        this.interleave = 0x10000;

        this.nbChannels = 0;
        this.chunkSize = 0;
        this.nbChunksInInterleave = 0;
        this.nb_chunk_decoded = 0;

        this.adpcmStepTable = [
            7, 8, 9, 10, 11, 12, 13, 14, 16, 17,                            // 10
            19, 21, 23, 25, 28, 31, 34, 37, 41, 45,                         // 20
            50, 55, 60, 66, 73, 80, 88, 97, 107, 118,                       // 30
            130, 143, 157, 173, 190, 209, 230, 253, 279, 307,               // 40
            337, 371, 408, 449, 494, 544, 598, 658, 724, 796,               // 50
            876, 963, 1060, 1166, 1282, 1411, 1552, 1707, 1878, 2066,       // 60
            2272, 2499, 2749, 3024, 3327, 3660, 4026, 4428, 4871, 5358,     // 70
            5894, 6484, 7132, 7845, 8630, 9493, 10442, 11487, 12635, 13899, // 80
            15289, 16818, 18500, 20350, 22385, 24623, 27086, 29794, 32767   // 89
        ];

        this.adpcmIndexTable = [
            -1, -1, -1, -1, 2, 4, 6, 8, // 8
            -1, -1, -1, -1, 2, 4, 6, 8, // 16
        ];
    }

    canHandle(binary, filePath){
        return filePath.substring(filePath.length - 4) == ".RIB";
    }

    process(binary, infos) {
        binary.setCurrent(0);

        // entry.params.duration = entry.size / entry.params.frequency;
        Database.add(
            new Result(MimeType.AUDIO, this, binary, undefined, 0, binary.length(), {
                mono: infos.mono,
                chunkSize: infos.chunkSize,
                duration: 12
            }, infos.path)
        );
    }

    /**
     * Decode RIB to PCM.
     *
     * @param {NBinary} binary - The binary data.
     * @param {{}} options
     * @param {{}} props
     * @return {NBinary}
     */
    async decode(binary, options = {}, props = {}) {

        this.calculateChunkInterleave(props.mono, props.chunkSize);

        let nbSamples = binary.length() / (this.nbChannels * this.interleave);

        const result = new NBinary(new ArrayBuffer(
            nbSamples * this.nbChuckDecoded * this.nbChunksInInterleave * this.nbChannels * 2
        ));

        while(nbSamples--)
        {
            const outputs = Array(this.nbChannels).fill([]);

            for (let ch = 0; ch < this.nbChannels; ch++)
                for (let j = 0; j < this.nbChunksInInterleave; j++)
                    this.adpcmRibDecodeFrame(binary, outputs[ch]);

            for (let j = 0; j < this.nbChuckDecoded * this.nbChunksInInterleave; j++)
                outputs.forEach(channel => {
                    result.setInt16(channel[j]);
                });
        }

        const pcm = AudioWav.pcm(
            result,
            this.nbChannels,
            props.mono ? 22100 : 44100,
            props.mono ? 88200 : 176400,
            props.mono ? 2 : 4
        );


        return {
            data: pcm,
            totalSamples: 0,
            play: async () => {

                const blob = new Blob([pcm.data], { type: "audio/wav" });
                const url = URL.createObjectURL(blob);

                const audioElement = new Audio(url);
                await audioElement.play();
            }
        };
    }

    /**
     * Calculate chunk interleave.
     *
     * @param {boolean} mono - Is mono audio.
     * @param {number} chunkSize - Size of each chunk.
     */
    calculateChunkInterleave(mono, chunkSize) {
        this.nbChannels = mono ? 1 : 2;
        this.chunkSize = chunkSize;

        this.nbChunksInInterleave = this.interleave / this.chunkSize;
        this.nbChuckDecoded = 2 * (this.chunkSize - 4) + 1;
    }

    /**
     * Decode a single ADPCM frame.
     *
     * @param {NBinary} in_stream - The input binary stream.
     * @param {Array<number>} out_stream - The output array.
     */
    adpcmRibDecodeFrame(in_stream, out_stream) {
        let adpcmChannelStatus = {
            predictor: in_stream.int16(),
            stepIndex: in_stream.uInt8()
        };

        in_stream.seek(1);
        out_stream.push(adpcmChannelStatus.predictor);

        for (let pos = 0; pos < this.chunkSize - 4; pos++) {
            const byte = in_stream.uInt8();
            out_stream.push(this.adpcmImaQtExpandNibble(adpcmChannelStatus, byte & 0x0f));
            out_stream.push(this.adpcmImaQtExpandNibble(adpcmChannelStatus, byte >> 4));
        }
    }

    /**
     * Clamp a value between a minimum and maximum.
     *
     * @param {number} val - The value to clamp.
     * @param {number} min - The minimum value.
     * @param {number} max - The maximum value.
     * @return {number} - The clamped value.
     */
    clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    }

    /**
     * Clip a value to int16 range.
     *
     * @param {number} a - The value to clip.
     * @return {number} - The clipped value.
     */
    adpcmClipInt16(a) {
        if (a < -0x8000 || a > 0x7FFF)
            return (a >> 31) ^ 0x7FFF;

        return a;
    }

    /**
     * Expand a nibble for ADPCM decoding.
     *
     * @param {{stepIndex: number, predictor: number}} adpcmChannelStatus - The ADPCM channel status.
     * @param {number} nibble - The nibble to expand.
     * @return {number} - The expanded nibble.
     */
    adpcmImaQtExpandNibble(adpcmChannelStatus, nibble) {

        const step = this.adpcmStepTable[adpcmChannelStatus.stepIndex];
        let stepIndex = adpcmChannelStatus.stepIndex + this.adpcmIndexTable[nibble];
        stepIndex = this.clamp(stepIndex, 0, 88);

        let diff = step >> 3;
        if (nibble & 4) diff += step;
        if (nibble & 2) diff += step >> 1;
        if (nibble & 1) diff += step >> 2;

        let predictor;
        if (nibble & 8)
            predictor = adpcmChannelStatus.predictor - diff;
        else
            predictor = adpcmChannelStatus.predictor + diff;

        adpcmChannelStatus.predictor = this.adpcmClipInt16(predictor);
        adpcmChannelStatus.stepIndex = stepIndex;

        return adpcmChannelStatus.predictor;
    }
}

export default new AudioRib();