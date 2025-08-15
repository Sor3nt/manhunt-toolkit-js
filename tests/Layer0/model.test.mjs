import assert from "assert";

import Database from "../../src/Layer0/Database.mjs";
import MimeType from "../../src/Layer0/MimeType.mjs";
import ModelMdl from "../../src/Layer0/FileHandler/Model.Mdl.mjs";
import {Group, SkinnedMesh} from "../../src/Vendor/three.module.mjs";
import RenderwareLoader from "../../src/Layer0/FileHandler/RenderwareLoader.mjs";
import FileLoaderHelper from "./file.loader.helper.mjs";
import hash from 'object-hash';

describe('Models', () => {

    describe('Testing Manhunt 1; PC; *.dff', async () => {


        FileLoaderHelper.load('./Unittest/Resources/modelspc.dff', RenderwareLoader, {});

        const result = Database.findOneBy({ type: MimeType.MODEL, name: "CJ_MED_TABLE" });
        if (result === null) assert.fail('Result was not found');

        it('new entry is available in the database', () => {
            assert.equal(result.name, 'CJ_MED_TABLE');
        });


        it('the decoded result is a group', async () => {
            assert.equal(model instanceof Group, true);
        });

        it('the decoded result is children', async () => {
            assert.equal(model.children.length > 0, true);
        });

        let model = await result.decode();
        it('the decoded model has the assumed values', async () => {
            assert.equal(model.children[0].geometry.attributes.position.count, 246);
            assert.equal(model.children[0].geometry.attributes.normal.count, 246);
            assert.equal(model.children[0].geometry.attributes.color.count, 246);
            assert.equal(model.children[0].geometry.attributes.uv.count, 246);
        });

    });

    describe('Testing Manhunt 2; PC; *.mdl', () => {

        FileLoaderHelper.load('./Unittest/Resources/danny_asylum_bloody.mdl', ModelMdl, {
            name: 'danny_asylum_bloody'
        });

        const result = Database.findOneBy({ type: MimeType.MODEL, name: "danny_asylum_bloody" });
        if (result === null) assert.fail('Result was not found');

        it('new entry is available in the database', () => {
            assert.equal(result.name, 'danny_asylum_bloody');
        });

        it('the decoded result is a skinned mesh', async () => {
            let group = await result.decode();

            assert.equal(group.children[0] instanceof SkinnedMesh, true);
        });

        it('the decoded model has the assumed values', async () => {
            let group = await result.decode();

            assert.equal(group.children.length, 3);
            assert.equal(group.children[0].geometry.attributes.position.count, 6816);
            assert.equal(group.children[0].geometry.attributes.normal.count, 6816);
            assert.equal(group.children[0].geometry.attributes.color.count, 6816);
            assert.equal(group.children[0].geometry.attributes.uv.count, 6816);
        });

    });

});
