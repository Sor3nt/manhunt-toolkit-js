import NBinary from "../NBinary.mjs";

class AudioWav {
    STEP_TABLE = [
        7,8,9,10,11,12,13,14,16,17,19,21,23,25,28,31,
        34,37,41,45,50,55,60,66,73,80,88,97,107,118,130,143,
        157,173,190,209,230,253,279,307,337,371,408,449,494,544,598,658,
        724,796,876,963,1060,1166,1282,1411,1552,1707,1878,2066,2272,2499,2749,3024,
        3327,3660,4026,4428,4871,5358,5894,6484,7132,7845,8630,9493,10442,11487,12635,13899,
        15289,16818,18500,20350,22385,24623,27086,29794,32767
    ];

    INDEX_TABLE = [-1,-1,-1,-1,2,4,6,8];

    clamp(v, lo, hi){ return v < lo ? lo : (v > hi ? hi : v); }

    samplesPerBlock(blockAlign, channels){
        return 1 + Math.floor(((blockAlign - 4 * channels) * 2) / channels);
    }

    async playPCM(pcmInterleaved, channels, sampleRate){
        const ac = new (window.AudioContext || window.webkitAudioContext)();
        const frames = Math.floor(pcmInterleaved.length / channels);
        const buffer = ac.createBuffer(channels, frames, sampleRate);

        for (let ch = 0; ch < channels; ch++){
            const chData = buffer.getChannelData(ch);
            for (let i = 0; i < frames; i++){
                chData[i] = pcmInterleaved[i * channels + ch];
            }
        }
        const src = ac.createBufferSource();
        src.buffer = buffer;
        src.connect(ac.destination);
        src.start();
        return ac;
    }

    // ====== WAV-Wrapper (fmt=0x11 IMA ADPCM) ======
    u32(le){ return new DataView(new ArrayBuffer(4)); }

    buildImaWav(rawU8, channels, sampleRate, blockAlign){
        const spb = this.samplesPerBlock(blockAlign, channels);
        const blocks = Math.floor(rawU8.length / blockAlign);
        const totalSamples = blocks * spb;

        // fmt chunk size für IMA ADPCM ist 20 (WAVEFORMATEX + cbSize=2 + SamplesPerBlock)
        const fmtChunkSize = 20; // 0x14

        const dataSize = blocks * blockAlign;

        // RIFF Größe = 4 (WAVE) + (8+fmt) + (8+fact) + (8+data)
        const factChunkSize = 4; // enthält totalSamples (u32)
        const riffSize = 4 + (8 + fmtChunkSize) + (8 + factChunkSize) + (8 + dataSize);

        const buf = new ArrayBuffer(8 + riffSize);
        const dv = new DataView(buf);
        let p = 0;

        function w4(tag){ dv.setUint8(p++, tag.charCodeAt(0)); dv.setUint8(p++, tag.charCodeAt(1)); dv.setUint8(p++, tag.charCodeAt(2)); dv.setUint8(p++, tag.charCodeAt(3)); }

        // RIFF Header
        w4('RIFF'); dv.setUint32(p, riffSize, true); p += 4; w4('WAVE');

        // fmt chunk
        w4('fmt '); dv.setUint32(p, fmtChunkSize, true); p += 4;
        dv.setUint16(p, 0x0011, true); p += 2;        // wFormatTag = IMA ADPCM
        dv.setUint16(p, channels, true); p += 2;      // nChannels
        dv.setUint32(p, sampleRate, true); p += 4;    // nSamplesPerSec

        // nAvgBytesPerSec ≈ sampleRate * blockAlign / samplesPerBlock
        const nAvgBytesPerSec = Math.floor(sampleRate * blockAlign / spb);
        dv.setUint32(p, nAvgBytesPerSec, true); p += 4;

        dv.setUint16(p, blockAlign, true); p += 2;    // nBlockAlign
        dv.setUint16(p, 4, true); p += 2;             // wBitsPerSample (nominal 4 bei IMA)
        dv.setUint16(p, 2, true); p += 2;             // cbSize = 2 (extra bytes)
        dv.setUint16(p, spb, true); p += 2;           // SamplesPerBlock

        // fact chunk (benötigt bei komprimiertem WAV)
        w4('fact'); dv.setUint32(p, factChunkSize, true); p += 4;
        dv.setUint32(p, totalSamples, true); p += 4;

        // data chunk
        w4('data'); dv.setUint32(p, dataSize, true); p += 4;

        // Rohdaten anhängen
        new Uint8Array(buf, p).set(rawU8);

        return new Uint8Array(buf);
    }

    decodeImaAdpcm(rawU8, channels, blockAlign){
        if (channels < 1 || channels > 2) throw new Error('Nur 1–2 Kanäle werden unterstützt.');
        const spb = this.samplesPerBlock(blockAlign, channels);
        const bytesPerBlock = blockAlign;
        const totalBlocks = Math.floor(rawU8.length / bytesPerBlock);
        const totalSamples = totalBlocks * spb;

        // Output: interleaved Float32 PCM [-1..1]
        const out = new Float32Array(totalSamples * channels);

        let outPos = 0;
        let offset = 0;

        for (let b = 0; b < totalBlocks; b++){
            // Pro Kanal: 4-Byte-Header: predictor (LE int16), index (u8), reserved (u8)
            const st = new Array(channels);
            const idx = new Array(channels);

            for (let ch = 0; ch < channels; ch++){
                const lo = rawU8[offset++] | 0;
                const hi = rawU8[offset++] | 0;
                st[ch] = (hi << 8) | lo; // signed 16
                if (st[ch] & 0x8000) st[ch] = st[ch] - 0x10000;
                idx[ch] = rawU8[offset++];
                offset++; // skip reserved
                idx[ch] = this.clamp(idx[ch] | 0, 0, 88);
            }

            // Erstes Sample ist der Predictor
            for (let ch = 0; ch < channels; ch++){
                out[outPos + ch] = st[ch] / 32768;
            }
            outPos += channels;

            const dataBytesPerBlock = bytesPerBlock - 4 * channels;
            const bytesPerChannel = Math.floor(dataBytesPerBlock / channels);

            // Wir nehmen an: kanalweise Byte-Interleave nach den Headern.
            // D.h. für i=0..bytesPerChannel-1: byte(ch0), byte(ch1), ...
            for (let i = 0; i < bytesPerChannel; i++){
                for (let ch = 0; ch < channels; ch++){
                    const byte = rawU8[offset++];
                    // zwei Nibbles (low, high)
                    for (let nn = 0; nn < 2; nn++){
                        const code = (nn === 0) ? (byte & 0x0F) : (byte >> 4);
                        let step = this.STEP_TABLE[idx[ch]];
                        let diff = step >> 3;
                        if (code & 1) diff += step >> 2;
                        if (code & 2) diff += step >> 1;
                        if (code & 4) diff += step;
                        if (code & 8) st[ch] -= diff; else st[ch] += diff;
                        st[ch] = this.clamp(st[ch], -32768, 32767);

                        idx[ch] += this.INDEX_TABLE[code & 7];
                        idx[ch] = this.clamp(idx[ch], 0, 88);

                        out[outPos + ch] = st[ch] / 32768;
                        outPos += channels;
                    }
                }
            }
        }

        return { pcm: out, samplesPerBlock: spb, totalSamples };
    }
    /**
     *
     * @param data {NBinary}
     * @param numChannels
     * @param defFreq
     * @param bytespersecond
     * @param blockalign
     * @return {NBinary}
     */
    pcm(
        data,
        numChannels,
        defFreq,
        bytespersecond,
        blockalign
    ) {

        const wav = new NBinary(new ArrayBuffer(data.length() + 44));
        wav.writeString('RIFF');
        wav.setInt32(data.length() + 36);
        wav.writeString('WAVE');

        wav.writeString('fmt ');
        wav.setInt32(16); // sectionsize
        wav.setInt16(1); // waveformat
        wav.setInt16(numChannels);
        wav.setInt32(defFreq); // samplespersecond
        wav.setInt32(bytespersecond); // bytespersecond
        wav.setInt16(blockalign); // blockalign
        wav.setInt16(16); // bitspersample

        wav.writeString('data'); // dataheader
        wav.setInt32(data.length()); // datasize
        wav.append(data);

        return wav;
    }


}

export default new AudioWav();

