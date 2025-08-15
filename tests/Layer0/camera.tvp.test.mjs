import assert from "assert";

import Database from "../../src/Layer0/Database.mjs";
import MimeType from "../../src/Layer0/MimeType.mjs";
import FileLoaderHelper from "./file.loader.helper.mjs";
import CameraTvp from "../../src/Layer0/FileHandler/Camera.Tvp.mjs";

describe('Execution Vector Pairs', () => {

    describe('Testing parsing', () => {

        FileLoaderHelper.load('./Unittest/Resources/mh2_pc.tvp', CameraTvp);

        const result = Database.findOneBy({ type: MimeType.CAMERA_TVP, name: "EXEC_SHARD_JUMP_ANIM" });
        if (result === null) assert.fail('Result was not found');

        it('new entry is available in the database', () => {
            assert.equal(result.name, 'EXEC_SHARD_JUMP_ANIM');
        });

        it('the decoded vectors has 3 pairs', async () => {
            let pairs = await result.decode();
            assert.equal(pairs.length, 3);
        });
    });

});
