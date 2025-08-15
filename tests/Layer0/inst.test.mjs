import assert from "assert";

import Database from "../../src/Layer0/Database.mjs";
import MimeType from "../../src/Layer0/MimeType.mjs";
import FileLoaderHelper from "./file.loader.helper.mjs";
import Inst from "../../src/Layer0/FileHandler/Inst.mjs";

describe('INST Relation File', () => {

    describe('Testing entity_pc.inst', async () => {

        FileLoaderHelper.load('./Unittest/Resources/entity_pc.inst', Inst);

        const result = Database.findOneBy({ type: MimeType.INST, name: "player(player)" });
        if (result === null) assert.fail('Result was not found');

        it('new entry is available in the database', () => {
            assert.equal(result.name, 'player(player)');
        });

    });

});
