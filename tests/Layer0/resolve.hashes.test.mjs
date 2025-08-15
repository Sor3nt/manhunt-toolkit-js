import assert from "assert";
import ResolveHashes from "../../src/Layer0/Resolve.Hashes.mjs";

describe('Hash resolver', () => {

    describe('Testing Execution.dir resolver', () => {

        it('hash 7b190377 (1996691835) resolved to 1HFirearm', async () => {
            const info =  await ResolveHashes.executionAudio('1996691835');
            assert.equal(info.file, "executions\\1hfirear\\pc_jump.wav");
            assert.equal(info.weapon, "1HFirearm");
        });

    });

    describe('Testing INST resolver', () => {

        it('hash bcd42800 (2675900) resolved to HP%_', async () => {
            const name =  await ResolveHashes.instOption('2675900');
            assert.equal(name, "HP%_");
        });

        it('hash 00000000 (0) resolved to 00000000', async () => {
            const name =  await ResolveHashes.instOption('00000000');
            assert.equal(name, "00000000");
        });

    });

});
