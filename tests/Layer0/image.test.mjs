import assert from "assert";

import Database from "../../src/Layer0/Database.mjs";
import MimeType from "../../src/Layer0/MimeType.mjs";
import {DataTexture} from "../../src/Vendor/three.module.mjs";
import UnitTestHelper from "./file.loader.helper.mjs";
import RenderwareLoader from "../../src/Layer0/FileHandler/RenderwareLoader.mjs";
import ImageTex from "../../src/Layer0/FileHandler/Image.Tex.mjs";

describe('Textures', () => {

    describe('Testing Manhunt 1; PC; *.txd', async () => {

        UnitTestHelper.load('./Unittest/Resources/modelspc.txd', RenderwareLoader);

        const result = Database.findOneBy({ type: MimeType.TEXTURE, name: "cj_sheetmetal" });
        if (result === null) assert.fail('Result was not found');

        it('new entry is available in the database', () => {
            assert.equal(result.name, 'cj_sheetmetal');
        });

        const texture = await result.decode();

        it('the image is a data texture', () => {
            assert.equal(texture instanceof DataTexture, true);
        });
    });

    describe('Testing Manhunt 2; PC; danny_asylum_bloody_pc.tex', async () => {

        UnitTestHelper.load('./Unittest/Resources/danny_asylum_bloody_pc.tex', ImageTex);

        const result = Database.findOneBy({ type: MimeType.TEXTURE, name: "danny_asylum_blood" });
        if (result === null) assert.fail('Result was not found');

        it('new entry is available in the database', () => {
            assert.equal(result.name, 'danny_asylum_blood');
        });

        const texture = await result.decode();
        it('the decoded texture has mipmaps', () => {
            assert.equal(texture.mipmaps.length > 0, true);
        });
    });



});
