import assert from "assert";
import fs from "fs";

import Database from "../../src/Layer0/Database.mjs";
import MimeType from "../../src/Layer0/MimeType.mjs";
import EntityConfigGlg from "../../src/Layer0/FileHandler/Entity.Config.Glg.mjs";
import FileLoaderHelper from "./file.loader.helper.mjs";

describe('Entity Config File', () => {

    describe('Testing parsing', async () => {

        FileLoaderHelper.load('./Unittest/Resources/resource3.glg', EntityConfigGlg);

        const result = Database.findOneBy({ type: MimeType.CONFIG_GLG, name: "A01_BurntPile" });
        if (result === null) assert.fail('Result was not found');

        it('new entry is available in the database', () => {
            assert.equal(result.name, 'A01_BurntPile');
        });

        it('getValue(MODEL) returns A01_BurntPile', async () => {
            const config = await result.decode();
            assert.equal(config.getValue('MODEL'), 'A01_BurntPile');
        });
    });

});
