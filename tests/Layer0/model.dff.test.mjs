import assert from "assert";

import Database from "../../src/Layer0/Database.mjs";
import MimeType from "../../src/Layer0/MimeType.mjs";
import ModelMdl from "../../src/Layer0/FileHandler/Model.Mdl.mjs";
import {Group, Mesh, SkinnedMesh} from "../../src/Vendor/three.module.mjs";
import RenderwareLoader from "../../src/Layer0/FileHandler/RenderwareLoader.mjs";
import FileLoaderHelper from "./file.loader.helper.mjs";
import hash from 'object-hash';

describe('Models', () => {

    describe('Testing Manhunt 2; PSP; *.dff', () => {

        FileLoaderHelper.load('./Unittest/Resources/MODELS.DFF', ModelMdl, {
            platform: 'psp'
        });

        const result = Database.findOneBy({ type: MimeType.MODEL, name: "mirror" });
        if (result === null) assert.fail('Result was not found');

        it('new entry is available in the database', () => {
            assert.equal(result.name, 'mirror');
        });
        //
        it('the decoded result is a mesh', async () => {
            let group = await result.decode();

            assert.equal(group.children[0] instanceof Mesh, true);
        });
        //
        // it('the decoded model has the assumed values', async () => {
        //     let group = await result.decode();
        //
        //     assert.equal(group.children.length, 3);
        //     assert.equal(group.children[0].geometry.attributes.position.count, 6816);
        //     assert.equal(group.children[0].geometry.attributes.normal.count, 6816);
        //     assert.equal(group.children[0].geometry.attributes.color.count, 6816);
        //     assert.equal(group.children[0].geometry.attributes.uv.count, 6816);
        // });

    });

});
