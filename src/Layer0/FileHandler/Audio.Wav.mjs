import NBinary from "../NBinary.mjs";

class AudioWav {


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


    /**
     *
     * @param data {NBinary}
     * @param lengthUncompressedBytes {int}
     * @param numChannels {int}
     * @param defFreq {int}
     * @return {NBinary}
     */
    adPcm(
        data,
        lengthUncompressedBytes,
        numChannels,
        defFreq
    ) {

        const wav = new NBinary(new ArrayBuffer(data.length() + 60));
        // const wav = new NBinary();
        wav.writeString('RIFF');
        wav.setInt32(data.length() + 52);
        wav.writeString('WAVE');

        wav.writeString('fmt ');
        wav.setInt32(20); // sectionsize
        wav.setInt16(0x69); // waveformat
        wav.setInt16(numChannels);
        wav.setInt32(defFreq); // samplespersecond
        wav.setInt32(defFreq); // bytespersecond
        wav.setInt16(0x24 * numChannels); // blockalign
        wav.setInt16(4); // bitspersample
        wav.setInt16(2); // adpcm bit
        wav.setInt16(0x64); // adpcm bit

        wav.writeString('fact');
        wav.setInt32(4); // factsize
        wav.setInt32(lengthUncompressedBytes); // uncompressedsize

        wav.writeString('data'); // dataheader
        wav.setInt32(data.length()); // datasize
        wav.append(data);

        return wav;
    }

    // IMA ADPCM Standard Tabellen
    STEP_TABLE = [
        7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31,
        34, 37, 41, 45, 50, 55, 60, 66, 73, 80, 88, 97, 107, 118, 130, 143,
        157, 173, 190, 209, 230, 253, 279, 307, 337, 371, 408, 449, 494, 544,
        598, 658, 724, 796, 876, 963, 1060, 1166, 1282, 1411, 1552
    ];

    INDEX_TABLE = [
        -1, -1, -1, -1, 2, 4, 6, 8,
        -1, -1, -1, -1, 2, 4, 6, 8
    ];

    /**
     * Dekodiert ein einzelnes IMA‑ADPCM Nibble.
     * @param {number} nibble - 4 Bit Wert
     * @param {number} predictor - aktueller Vorhersagewert (Sample)
     * @param {number} index - aktueller Index in STEP_TABLE
     * @returns {{sample: number, predictor: number, index: number}}
     */
    decodeNibble(nibble, predictor, index) {
        let step = this.STEP_TABLE[index];
        // Berechne den Differenzwert
        let diff = step >> 3;
        if (nibble & 1) diff += step >> 2;
        if (nibble & 2) diff += step >> 1;
        if (nibble & 4) diff += step;
        // Negativkorrektur falls das Vorzeichenbit gesetzt ist
        if (nibble & 8) diff = -diff;

        predictor += diff;
        // Clamp predictor auf 16 Bit Bereich
        if (predictor > 32767) predictor = 32767;
        if (predictor < -32768) predictor = -32768;

        // Update des Index
        index += this.INDEX_TABLE[nibble];
        if (index < 0) index = 0;
        if (index > 88 - 1) index = 88 - 1;

        return { sample: predictor, predictor, index };
    }

    /**
     * Konvertiert einen ArrayBuffer mit IMA‑ADPCM–Daten in eine unkomprimierte PCM WAV-Datei.
     * @param {ArrayBuffer} adpcmBuffer - ArrayBuffer mit den IMA‑ADPCM Daten
     * @returns {ArrayBuffer} - ArrayBuffer mit dem kompletten WAV File (Header + PCM Daten)
     */
    convertIMAADPCMToWav(adpcmBuffer) {
        // Parameter aus der FSB-Datei
        const channels = 1;
        const sampleRate = 44100;
        const bitsPerSample = 16;
        const blockSize = 100; // angenommene Blockgröße

        const adpcmView = new DataView(adpcmBuffer);
        const pcmSamples = [];

        // Blöcke nacheinander dekodieren
        for (let blockOffset = 0; blockOffset < adpcmBuffer.byteLength; blockOffset += blockSize) {
            // Falls letzter Block kleiner als blockSize ist:
            const currentBlockSize = Math.min(blockSize, adpcmBuffer.byteLength - blockOffset);
            // Blockheader: 2 Byte initialer Predictor (little-endian), 1 Byte stepIndex, 1 Byte reserviert
            let offset = blockOffset;
            let predictor = adpcmView.getInt16(offset, true);
            offset += 2;
            let stepIndex = adpcmView.getUint8(offset);
            offset += 1;
            // Überspringe reserviertes Byte
            offset += 1;

            // Füge den initialen Sample hinzu
            pcmSamples.push(predictor);

            // Für jeden Rest des Blocks (jeder Byte enthält 2 Nibbles)
            while (offset < blockOffset + currentBlockSize) {
                const byte = adpcmView.getUint8(offset);
                offset++;
                // Niedriges Nibble zuerst
                let nibble = byte & 0x0F;
                let result = this.decodeNibble(nibble, predictor, stepIndex);
                predictor = result.predictor;
                stepIndex = result.index;
                pcmSamples.push(result.sample);

                // Hohes Nibble
                nibble = (byte >> 4) & 0x0F;
                result = this.decodeNibble(nibble, predictor, stepIndex);
                predictor = result.predictor;
                stepIndex = result.index;
                pcmSamples.push(result.sample);
            }
        }

        // WAV Header erstellen
        const numSamples = pcmSamples.length;
        const byteRate = sampleRate * channels * bitsPerSample / 8;
        const blockAlign = channels * bitsPerSample / 8;
        const dataChunkSize = numSamples * channels * bitsPerSample / 8;
        const headerSize = 44;
        const wavBuffer = new ArrayBuffer(headerSize + dataChunkSize);
        const view = new DataView(wavBuffer);

        // "RIFF" Chunk Descriptor
        this.writeString(view, 0, "RIFF");
        view.setUint32(4, 36 + dataChunkSize, true);
        this.writeString(view, 8, "WAVE");

        // "fmt " Subchunk
        this.writeString(view, 12, "fmt ");
        view.setUint32(16, 16, true); // Subchunk1Size für PCM
        view.setUint16(20, 1, true);  // AudioFormat PCM = 1
        view.setUint16(22, channels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitsPerSample, true);

        // "data" Subchunk
        this.writeString(view, 36, "data");
        view.setUint32(40, dataChunkSize, true);

        // PCM-Daten schreiben (als 16-Bit little-endian)
        let pcmOffset = headerSize;
        for (let i = 0; i < numSamples; i++) {
            view.setInt16(pcmOffset, pcmSamples[i], true);
            pcmOffset += 2;
        }

        return wavBuffer;
    }

    /**
     * Hilfsfunktion zum Schreiben eines ASCII-Strings in einen DataView
     * @param {DataView} view
     * @param {number} offset
     * @param {string} string
     */
    writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

// Beispielnutzung:
// Angenommen, "adpcmArrayBuffer" ist der ArrayBuffer mit den IMA-ADPCM Daten
// const wavArrayBuffer = convertIMAADPCMToWav(adpcmArrayBuffer);
// Nun kann wavArrayBuffer z.B. als Blob genutzt oder als Datei abgespeichert werden.



}

export default new AudioWav();

