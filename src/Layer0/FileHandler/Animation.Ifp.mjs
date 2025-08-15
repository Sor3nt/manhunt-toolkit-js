import FileHandlerAbstract from "./FileHandler.Abstract.mjs";
import Database from "../Database.mjs";
import Result from "../Result.mjs";
import MimeType from "../MimeType.mjs";
import { AnimationClip } from "../../Vendor/three.module.mjs";
import helper from "../../Helper.mjs";
import ManhuntMatrix from "../../Layer1/ManhuntMatrix.mjs";

class AnimationIfp extends FileHandlerAbstract{
    tag = "IFP";

    FOURCC_ANPK = 1263554113;
    FOURCC_ANCT = 1413697089;

    /**
     * @param binary {NBinary}
     * @returns {boolean}
     */
    canHandle(binary){
        if (binary.remain() < 4) return false;
        let fourCC = this.getFourCC(binary);

        //ANPK | ANCT
        return (fourCC === this.FOURCC_ANPK || fourCC === this.FOURCC_ANCT);
    }
    
    process(binary, infos) {
        let results = [];
        let fourCC = this.getFourCC(binary);
        binary.seek(4); //skip fourCC

        let IFPEntryArray = [];
        let IFPEntryIndexArray = [];

        switch (fourCC) {

            case this.FOURCC_ANCT:
                let numBlock = binary.int32();

                for (let i = 0; i < numBlock; i++) {
                    binary.seek(4);
                    let bNameLen = binary.int32();
                    let blockName = binary.consume(bNameLen, 'nbinary').getString(0);
                    let ANPK = this.readANPKIndex(binary);

                    ANPK.anpkName.forEach((name, index) => {
                        Database.add(
                            new Result(MimeType.ANIMATION, this, binary, name, ANPK.anpkOffset[index], 0, {...{
                                name,
                                blockName
                            }, ...infos}, infos.path)
                        );
                    });

                }
                break;

            case this.FOURCC_ANPK:
                let result = this.readStrmAnimBinIndex(binary);
                IFPEntryArray = result[0];
                IFPEntryIndexArray = result[1];

                IFPEntryIndexArray.forEach((ANPK) => {
                    ANPK.anpkName.forEach((name, index) => {

                        Database.add(
                            new Result(MimeType.ANIMATION, this, binary, name, ANPK.anpkOffset[index], 0, {
                                groupName: IFPEntryArray[index],
                                name
                            }, infos.path)
                        );

                    });
                });

                break;

        }

        return results;
    }

    async decode(binary, options = {}, props = {}) {

        const clipInfo = this.getANPKAnim({...options, ...props}, binary);
        clipInfo.name = props.name;

        return AnimationClip.parse( clipInfo );
    }

    getFourCC(binary){
        let current = binary.current();
        let fourCC = binary.uInt32();

        //strmanim_pc.bin
        if (fourCC === 1 && binary.remain() > 2048){
            binary.seek(2044);
            fourCC = binary.uInt32();
        }

        binary.setCurrent(current);
        return fourCC;
    }

    /**
     *
     * @param {NBinary} binary
     * @return {{frameTimeCount: *[], anpkName: *[], anpkOffset: *[]}}
     */
    readANPKIndex(binary) {

        binary.seek(4); //anpk_magic
        let numANPK = binary.int32();
        let ANPK = {
            anpkName: [],
            anpkOffset: [],
            frameTimeCount: [],
        };

        for (let j = 0; j < numANPK; j++) {
            binary.seek(4); //NAME_magic
            let AnimNameLen = binary.int32();
            let AnimName = binary.consume(AnimNameLen, 'nbinary').getString(0);

            ANPK.anpkOffset.push(binary.current());
            ANPK.anpkName.push(AnimName);

            let numBones = binary.int32();
            let chunkSize = binary.int32();

            let testVersion = binary.consume(4, 'string');
            binary.setCurrent( binary.current() - 4);

            let times = 10;
            let ANPKType;
            let mh064Patch = false;
            if (testVersion === "SEQT" || testVersion === "SEQU"){
                ANPKType = testVersion;
                mh064Patch = true;
            }else{
                times = binary.consume(4, 'float32');
                ANPKType = binary.consume(4, 'string');
            }

            ANPK.frameTimeCount.push(times);

            binary.seek(-4);

            let patchOffset = 0;
            if (mh064Patch)
                patchOffset = 4; //we have no frameTimeCount field


            if (ANPKType === "SEQT") {
                binary.setCurrent(binary.current() + (chunkSize + numBones * 13) + patchOffset);
            } else if (ANPKType === "SEQU") {
                binary.setCurrent(binary.current() + (chunkSize + numBones * 9) + patchOffset);
            }else{
                helper.log(this.tag, `Parsing error, assume SEQT or SEQU got ${ANPKType}`, 'error');
            }

            binary.seek(4); //unk
            binary.seek(4); //pecTime
            let perEntrySize = binary.int32();
            let numEntry = binary.uInt32();
            let pecSize = perEntrySize * numEntry;

            binary.setCurrent(binary.current() + pecSize);
        }

        return ANPK;
    }

    /**
     *
     * @param {NBinary} binary
     * @return {*[][]}
     */
    readStrmAnimBinIndex(binary) {
        let IFPEntryArray = [];
        let IFPEntryIndexArray = [];
        let i, ANPK, nextOffset;

        let numExec = binary.uInt32();
        let numEnvExec = binary.uInt32();
        for (i = 0; i < numExec; i++) {
            ANPK = {
                anpkName: [],
                anpkOffset: []
            };

            let tempAnpk = [];

            IFPEntryArray.push(
                "Execution" + binary.uInt32()
            );

            let JumpExecutionOffset = binary.uInt32();
            binary.seek(4); //JumpExecutionSize
            let WhileLevelExecOffset = binary.uInt32();
            binary.seek(4); //WhileLevelExecSize
            let YellowLevelExecOffset = binary.uInt32();
            binary.seek(4); //YellowLevelExecSize
            let RedLevelExecOffset = binary.uInt32();
            binary.seek(4); //RedLevelExecSize
            nextOffset = binary.current();

            if (JumpExecutionOffset > 0) {
                binary.setCurrent(JumpExecutionOffset);
                tempAnpk.push(this.readANPKIndex(binary));
            }

            if (WhileLevelExecOffset > 0) {
                binary.setCurrent(WhileLevelExecOffset);
                tempAnpk.push(this.readANPKIndex(binary));
            }

            if (YellowLevelExecOffset > 0) {
                binary.setCurrent(YellowLevelExecOffset);
                tempAnpk.push(this.readANPKIndex(binary));
            }

            if (RedLevelExecOffset > 0) {
                binary.setCurrent(RedLevelExecOffset);
                tempAnpk.push(this.readANPKIndex(binary));
            }

            for (let j = 0; j < tempAnpk.length; j++) {
                for (let jj = 0; jj < tempAnpk[j].anpkName.length; jj++) {
                    ANPK.anpkName.push(tempAnpk[j].anpkName[jj]);
                    ANPK.anpkOffset.push(tempAnpk[j].anpkOffset[jj]);
                }
            }

            binary.setCurrent(nextOffset);

            IFPEntryIndexArray.push(ANPK);
        }

        for (i = 0; i < numEnvExec; i++) {

            let executionID = binary.uInt32();
            let envExecOffset = binary.uInt32();
            binary.seek(4); //EnvExecSize

            nextOffset = binary.current();
            IFPEntryArray.push(
                "Environmental Exec" + executionID
            );

            if (envExecOffset > 0) {
                binary.setCurrent(envExecOffset);
                ANPK = this.readANPKIndex(binary);
                IFPEntryIndexArray.push(ANPK);

                binary.setCurrent(nextOffset);
            }

        }

        return [IFPEntryArray, IFPEntryIndexArray];
    }

    /**
     *
     * @param {{blockName: string, name: string, path: string, source: { game: string, platform: string, version: string, isCutscene: boolean }, target: { game: string, platform: string, version: string, isCutscene: boolean } }} options
     * @param binary
     * @return {{duration, name: string, tracks: *[]}}
     */
    getANPKAnim(options, binary) {

        let resultBones = [];

        let numBones = binary.int32();
        binary.seek(4); //chunkSize

        let testVersion = binary.consume(4, 'string');
        binary.setCurrent( binary.current() - 4);

        let times = false;
        if (testVersion === "SEQT" || testVersion === "SEQU"){
        }else{
            times = binary.consume(4, 'float32');
        }

        for (let b = 0; b < numBones; b++) {

            let ANPKType = binary.consume(4, 'string');

            let boneId = binary.int16();
            let frameType = binary.int8();
            let frames = binary.consume(2, 'uint16');

            let frameTime = 0.0;
            let startTime = (binary.int16()) / 2048.0 * 30.0;

            let resultBone = {
                'boneId' : boneId,
                'frameType' : frameType,
                'startTime' : startTime,
                'frames' : [],
                'direction': []
            };

            if (frameType > 2) {
                resultBone.direction = [
                    binary.int16() / 2048.0,
                    binary.int16() / 2048.0,
                    binary.int16() / 2048.0,
                    binary.int16() / 2048.0,
                ];

            }else if(startTime === 0){
                //back to start time
                binary.setCurrent(binary.current() - 2);
            }

            let resultFrames = { frames: [] };
            for (let i = 0; i < frames; i++) {
                let resultFrame = {
                    time: 0,
                    quat: [],
                    position: [],
                };

                let currentTime;

                if (startTime === 0) {

                    if (frameType === 3 && i === 0) {
                        currentTime = 0.0;
                    } else {
                        currentTime = binary.consume(2, 'uint16') / 2048.0 * 30.0;
                    }

                    frameTime += currentTime;
                } else {
                    if (startTime < 1) startTime = 1;

                    if ((frames === 0) && (startTime === (times*30))){
                        frameTime = (i) + startTime;
                    }else{
                        frameTime = (i) + startTime - 1
                    }
                }

                resultFrame.time =  frameTime;

                if (frameType < 3) {
                    resultFrame.quat = [
                        binary.int16() / 4096.0,
                        binary.int16() / 4096.0,
                        binary.int16() / 4096.0,
                        binary.int16() / 4096.0,
                    ];
                }

                if (frameType > 1) {

                    let factor = 2048;
                    if (options.source.isCutscene) factor = 1024.0;

                    //tX tY tZ
                    resultFrame.position = [
                        binary.int16() / factor,
                        binary.int16() / factor,
                        binary.int16() / factor,
                    ];
                }

                resultFrames.frames.push(resultFrame);
            }

            //fix for the ps2 0.64, they don't use a time value
            if (times === false)
                times = resultFrames.frames[resultFrames.frames.length - 1].time / 30;

            //fix for three.js, we need the last frame
            if (frameTime < times * 30)
                resultFrames.frames[resultFrames.frames.length - 1].time = times * 30;

            if (ANPKType === "SEQT")
                resultFrames.lastFrameTime = binary.consume(4, 'float32');

            resultBone.frames.push(resultFrames);
            resultBones.push(resultBone);
        }

        return this.convertBonesToAnimation(options, resultBones, times);
    }

    convertBonesToAnimation(options, bones, duration) {

        let animation = {
            name: "noname",
            duration: duration,
            tracks: []
        };

        console.groupCollapsed('Bone animation removal info');
        for(let i in bones){
            if (!bones.hasOwnProperty(i)) continue;

            let bone = bones[i];

            //todo, map missed bones... skip unused bones
            if (ManhuntMatrix.getBoneNameByBoneId(bone.boneId) === null){
                console.warn(`Remove BoneId ${bone.boneId} animation, unknown BoneName`);
                continue;
            }

            let trackPosition = {
                name: `bone_${bone.boneId}.position`,
                times: [],
                values: [],
                type: "vector"
            };

            let trackQuaternion = {
                name: `bone_${bone.boneId}.quaternion`,
                times: [],
                values: [],
                type: "quaternion"
            };

            bone.frames[0].frames.forEach((frame) => {

                if (frame.quat.length > 0){
                    trackQuaternion.times.push(frame.time / 30);
                    trackQuaternion.values.push(
                        frame.quat[0] * -1,
                        frame.quat[1] * -1,
                        frame.quat[2] * -1,
                        frame.quat[3]
                    );
                }

                if (frame.position.length > 0){
                    trackPosition.times.push(frame.time / 30);
                    if (options.source.platform === "psp" && options.source.isCutscene){
                        frame.position[0] *= -1;
                        frame.position[2] *= -1;
                    }

                    trackPosition.values.push(
                        frame.position[0], frame.position[1], frame.position[2]
                    );
                }
            });

            if (trackPosition.values.length > 0)
                animation.tracks.push(trackPosition);

            if (trackQuaternion.values.length > 0)
                animation.tracks.push(trackQuaternion);
        }
        console.groupEnd();

        return animation;
    }
}

export default new AnimationIfp();