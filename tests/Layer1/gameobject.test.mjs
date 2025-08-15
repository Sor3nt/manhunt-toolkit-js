
import Inst from "../../src/Layer0/FileHandler/Inst.mjs";
import FileLoaderHelper from "../Layer0/file.loader.helper.mjs";
import EntityConfigGlg from "../../src/Layer0/FileHandler/Entity.Config.Glg.mjs";
import Database from "../../src/Layer0/Database.mjs";
import MimeType from "../../src/Layer0/MimeType.mjs";
import GameObject from "../../src/Layer1/GameObject.mjs";
import assert from "assert";
import ImageTex from "../../src/Layer0/FileHandler/Image.Tex.mjs";
import ModelMdl from "../../src/Layer0/FileHandler/Model.Mdl.mjs";
import {Group} from "../../src/Vendor/three.module.mjs";

FileLoaderHelper.load('./Unittest/Resources/entity_pc.inst', Inst, {}, false);
FileLoaderHelper.load('./Unittest/Resources/resource3.glg', EntityConfigGlg, {}, false);
FileLoaderHelper.load('./Unittest/Resources/modelspc.tex', ImageTex, {}, false);
FileLoaderHelper.load('./Unittest/Resources/modelspc.mdl', ModelMdl, {}, false);

describe('GameObject', () => {

    describe('Create new GameObject', async () => {

        const instResult = Database.findOneBy({ type: MimeType.INST, name: 'ExecTut(hunter)' });
        const gameObject = new GameObject(instResult);

        it('GLG record for INST was found', async () => {
            await gameObject.load();
            assert.equal(gameObject.glg !== null, true);
        });

        it('Can generate the Model', async () => {
            const model = await gameObject.getModel();
            assert.equal(model instanceof Group, true);
        });

    });
});