import assert from "assert";

import Database from "../../src/Layer0/Database.mjs";
import MimeType from "../../src/Layer0/MimeType.mjs";
import FileLoaderHelper from "./file.loader.helper.mjs";
import HashDir from "../../src/Layer0/FileHandler/Hash.Dir.mjs";

describe('Hash DIR', () => {

    describe('Testing Execution.dir', () => {

        FileLoaderHelper.load('./Unittest/Resources/Executions.dir', HashDir);

        const result = Database.findOneBy({ type: MimeType.EXECUTION_AUDIO_NAMES, name: "Executions" });
        if (result === null) assert.fail('Result was not found');

        it('new entry is available in the database', () => {
            assert.equal(result.name, 'Executions');
        });

        it('some names can be translated', async () => {
            const list = await result.decode();

            let validCount = 0;
            list.forEach(entry => {
                if (entry.file !== null)
                    validCount++;
            });

            if (validCount > 0)
                assert.ok(validCount, 'was translated');
            else
                assert.fail('nothing translated')
        });

    });

});
