import assert from "assert";

import Database from "../../src/Layer0/Database.mjs";
import MimeType from "../../src/Layer0/MimeType.mjs";
import FileLoaderHelper from "./file.loader.helper.mjs";
import AudioContextMapBin from "../../src/Layer0/FileHandler/Audio.ContextMap.Bin.mjs";

describe('Bank Decoder (context_map.bin)', () => {

    describe('Testing context_map.bin', () => {

        FileLoaderHelper.load('./Unittest/Resources/ASYLUM_1_1_context_map.bin', AudioContextMapBin)

        const result = Database.findOneBy({ type: MimeType.AUDIO_BANK, name: "ASYLUM_1_1" });
        if (result === null) assert.fail('Result was not found');

        it('new entry is available in the database', () => {
            assert.equal(result.name, 'ASYLUM_1_1');
        });

        it('the ASYLUM_1_1 bank has 277 entries', async () => {
            const list = await result.decode();
            assert.equal(list.length, 277);
        });

    });

});
