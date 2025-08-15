import assert from "assert";

import Database from "../../src/Layer0/Database.mjs";
import MimeType from "../../src/Layer0/MimeType.mjs";
import {Group, Mesh} from "../../src/Vendor/three.module.mjs";
import FileLoaderHelper from "./file.loader.helper.mjs";
import RenderwareLoader from "../../src/Layer0/FileHandler/RenderwareLoader.mjs";
import Manhunt2MapBsp from "../../src/Layer0/FileHandler/Manhunt2.Map.Bsp.mjs";

describe('Map', () => {

    describe('Testing Manhunt 1; PC; *.bsp', async () => {

        FileLoaderHelper.load('./Unittest/Resources/scene1.bsp', RenderwareLoader, {
            name: 'scene1_mh1',
            isScene3: false
        });

        const result = Database.findOneBy({ type: MimeType.MAP, name: "scene1_mh1"});
        if (result === null) assert.fail('Result was not found');

        it('new entry is available in the database', () => {
            assert.equal(result.name, 'scene1_mh1');
        });

        let mesh = await result.decode();

        it('the decoded result is a group', async () => {
            assert.equal(mesh instanceof Group, true);
        });

        it('mesh has children', async () => {
            assert.equal(mesh.children.length > 0, true);
        });
    });

    describe('Testing Manhunt 2; PC; *.bsp', async () => {

        FileLoaderHelper.load('./Unittest/Resources/scene1_pc.bsp', Manhunt2MapBsp, {
            name: 'scene1',
            isScene3: false
        });

        const result = Database.findOneBy({ type: MimeType.MAP, name: "scene1" });
        if (result === null) assert.fail('Result was not found');

        it('new entry is available in the database', () => {
            assert.equal(result.name, 'scene1');
        });

        let mesh = await result.decode();
        it('the decoded result is a mesh', async () => {
            assert.equal(mesh instanceof Mesh, true);
        });

        it('mesh has children', async () => {
            assert.equal(mesh.children.length > 0, true);
        });

    });

});
