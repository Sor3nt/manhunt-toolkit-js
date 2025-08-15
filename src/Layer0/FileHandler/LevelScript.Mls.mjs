// import FileHandlerAbstract from "./FileHandler.Abstract.mjs";
// import Database from "../Database.mjs";
// import Result from "../Result.mjs";
// import MimeType from "../MimeType.mjs";
//
// class LevelScriptMls extends FileHandlerAbstract{
//     tag = "MLS";
//
//     // /**
//     //  * @param binary {NBinary}
//     //  * @returns {boolean}
//     //  */
//     // canHandle(binary){
//     //     //MHLS
//     //     return AbstractLoader.checkFourCC(binary,1397508173);
//     // }
//
//
//     process(binary, infos) {
//
//         binary.seek(8); //FourCC + version
//
//         do{
//             let sourceInfo = this.getSourceOffset(binary);
// console.log(binary.length());
// die;
//             Database.add(
//                 new Result(MimeType.LEVEL_SCRIPT, this, binary, sourceInfo.name, sourceInfo.offset, 0, {}, infos.path)
//             );
//
//         }while(binary.remain() > 0);
//     }
//
//     async decode(binary, options = {}, props = {}) {
//         let labelData2 = this.getLabelSizeData(binary);
//         return labelData2.binary.consume(labelData2.binary.length(), 'string');
//     }
//
//     getLabelSizeData( binary ){
//         let label = binary.consume(4, 'string');
//         let size = binary.uInt32();
//
//         return {
//             label: label,
//             binary: binary.consume(size, 'nbinary')
//         };
//     }
//
//     getSourceOffset(binary){
//         let name = "";
//         do {
//             let labelData = this.getLabelSizeData(binary);
// console.log(labelData.label);
// // die;
//             switch (labelData.label) {
//
//                 case 'NAME':
//                     name = labelData.binary.getString(0);
//                     break;
//                 case 'DBUG':
//                     return {
//                         name: name,
//                         offset: binary.getAbsoluteOffset()
//                     };
//
//             }
//         }while(binary.remain() > 0);
//     }
//
// }
//
// export default new LevelScriptMls();