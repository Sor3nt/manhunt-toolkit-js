import assert from "assert";
import fs from "fs";

import Rib from "../../src/Layer0/FileHandler/Audio.Rib.mjs";
import MimeType from "../../src/Layer0/MimeType.mjs";
import Database from "../../src/Layer0/Database.mjs";
import FileLoaderHelper from "./file.loader.helper.mjs";
import AudioRib from "../../src/Layer0/FileHandler/Audio.Rib.mjs";

describe('RIB Audio', () => {

    describe('Testing MONO|0x400 (DDEATH.RIB)', () => {

        FileLoaderHelper.load('./Unittest/Resources/DDEATH.RIB', AudioRib, {
            mono: false,
            chunkSize: 0x400
        });

        const result = Database.findOneBy({ type: MimeType.AUDIO, name: "DDEATH" });
        if (result === null) assert.fail('Result was not found');

        it('new entry is available in the database', () => {
            assert.equal(result.name, 'DDEATH');
        });

        it('the entry has the correct raw size', () => {
            assert.equal(result.get().length(), 655360);
        });

        it('the entry has the correct decoded size', async () => {
            assert.equal((await result.decode()).length(), 2612524);
        });

    });

});
