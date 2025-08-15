// import assert from "assert";
// import fs from "fs";
//
// import Database from "../src/Database.mjs";
// import MimeType from "../src/MimeType.mjs";
// import CameraTvp from "../src/FileHandler/Camera.Tvp.mjs";
// import LevelScriptMls from "../src/FileHandler/LevelScript.Mls.mjs";
//
// describe('Level Script', () => {
//
//     describe('Testing parsing', () => {
//
//         const file = './Unittest/Resources/A01_Escape_Asylum.mls';
//
//         const buffer = fs.readFileSync(file);
//         LevelScriptMls.processBinary(new Uint8Array(buffer).buffer, file, {});
//
//         const dirResult = Database.findOneBy({ type: MimeType.LEVEL_SCRIPT });
// console.log(dirResult);
// die;
//         it('new entry is available in the database', () => {
//             assert.equal(dirResult.name, 'EXEC_SHARD_JUMP_ANIM');
//         });
//
//         it('the decoded vectors has 3 pairs', async () => {
//             let pairs = await dirResult.decode();
//             assert.equal(pairs.length, 3);
//         });
//     });
//
// });
