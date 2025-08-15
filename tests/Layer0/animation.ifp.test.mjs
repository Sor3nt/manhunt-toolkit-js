import assert from "assert";
import fs from "fs";

import Database from "../../src/Layer0/Database.mjs";
import MimeType from "../../src/Layer0/MimeType.mjs";
import {AnimationClip} from "../../src/Vendor/three.module.mjs";
import FileLoader from "../../src/Layer0/FileLoader.mjs";
import NBinary from "../../src/Layer0/NBinary.mjs";
import FileLoaderHelper from "./file.loader.helper.mjs";
import AnimationIfp from "../../src/Layer0/FileHandler/Animation.Ifp.mjs";

describe('Animations', () => {

    describe('Parsing Manhunt2; PC; *.bin|*.ifp', async () => {

        FileLoaderHelper.load('./Unittest/Resources/strmanim_pc.bin', AnimationIfp)

        const result = Database.findOneBy({ type: MimeType.ANIMATION, name: "BAT_USE_EXECUTE_SMALL_BAT_JUMP_ANIM" });
        if (result === null) assert.fail('Result was not found');

        it('new entry is available in the database', () => {
            assert.equal(result.name, 'BAT_USE_EXECUTE_SMALL_BAT_JUMP_ANIM');
        });

        const clip = await result.decode();

        it('the decoded animation generates an AnimationClip', () => {
            assert.equal(clip instanceof AnimationClip, true);
        });

        it('the AnimationClip has the right duration', () => {
            assert.equal(clip.duration, 2.866666555404663);
        });

    });
});