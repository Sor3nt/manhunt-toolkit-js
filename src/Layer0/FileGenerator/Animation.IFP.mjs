import NBinary from "../NBinary.mjs";

/**
 * Huge thanks to MAJEST1C_R3 & Allen!
 *
 * Manhunt 2 - IFP Exporter
 */
class AnimationIFP {

    /**
     *
     * @param {AnimationClip[]} animations
     * @param game
     * @param platform
     * @param isCutscene
     * @return {NBinary}
     */
    packAnimation(animations, game, platform, isCutscene = false) {
        const binary = new NBinary(new ArrayBuffer(1000000));
        // if (platform === MHT.PLATFORM_WII) {
        //     binary.numericBigEndian = true;
        // }

        binary.writeString('ANPK');
        binary.setInt32(animations.length);

        for (let animationName in animations) {
            let animation = animations[animationName];
            if (animation === null) continue;

            binary.writeString('NAME');

            animationName += '\x00';

            binary.setInt32(animationName.length);
            binary.writeString(animationName);

            binary.setInt32(animation['bones'].length);

            let chunkBinary = new NBinary();
            // chunkBinary.numericBigEndian = binary.numericBigEndian;

            let chunkSize = 0;

            if (animation['frameTimeCount'] === 0) {
                animation['frameTimeCount'] = this.findMaxStartTime(animation);
            }
            let fixedFrameTimeCount = animation['frameTimeCount'];

            for (let bone of animation['bones']) {
                chunkBinary.writeString(
                    game === "mh" ? 'SEQU' : 'SEQT'
                );

                let boneId = bone['boneId'];

                chunkBinary.setInt16(boneId);
                chunkBinary.setInt8(bone['frameType']);
                chunkBinary.setInt16(bone['frames']['frames'].length);

                let singleChunkBinary = new NBinary();
                // singleChunkBinary.numericBigEndian = chunkBinary.numericBigEndian;

                //NBinary.LITTLE_U_INT_16
                singleChunkBinary.setUInt16(Math.floor((bone['startTime'] / 30) * 2048));

                if (bone['frameType'] === 3) {
                    singleChunkBinary.setInt16(bone['direction'][0] * 2048);
                    singleChunkBinary.setInt16(bone['direction'][1] * 2048);
                    singleChunkBinary.setInt16(bone['direction'][2] * 2048);
                    singleChunkBinary.setInt16(bone['direction'][3] * 2048);
                }

                let onlyFirstTime = true;

                for (let index in bone['frames']['frames']) {
                    let frame = bone['frames']['frames'][index];

                    if (bone['startTime'] === 0) {
                        if (index === 0 && bone['frameType'] === 3) {
                            // Do nothing
                        } else {
                            if (onlyFirstTime) {
                                if (frame['time'] !== 0) {
                                    //LITTLE_U_INT_16
                                    singleChunkBinary.setInt16((frame['time'] / 30) * 2048);
                                }
                                onlyFirstTime = false;
                            } else {
                                //LITTLE_U_INT_16
                                singleChunkBinary.setInt16((frame['time'] / 30) * 2048);
                            }
                        }
                    }

                    if (bone['frameType'] < 3) {
                        singleChunkBinary.setInt16(Math.floor(frame['rotation']['x'] * 4096));
                        singleChunkBinary.setInt16(Math.floor(frame['rotation']['y'] * 4096));
                        singleChunkBinary.setInt16(Math.floor(frame['rotation']['z'] * 4096));
                        singleChunkBinary.setInt16(Math.floor(frame['rotation']['w'] * 4096));

                    } else {
                        singleChunkBinary.setInt16(Math.floor(frame['quat'][0] * 4096));
                        singleChunkBinary.setInt16(Math.floor(frame['quat'][1] * 4096));
                        singleChunkBinary.setInt16(Math.floor(frame['quat'][2] * 4096));
                        singleChunkBinary.setInt16(Math.floor(frame['quat'][3] * 4096));
                    }

                    if (bone['frameType'] > 1) {
                        let factor = 2048;
                        if (isCutscene) factor = 1024;

                        singleChunkBinary.setInt16(Math.floor(frame['position'][0] * factor));
                        singleChunkBinary.setInt16(Math.floor(frame['position'][1] * factor));
                        singleChunkBinary.setInt16(Math.floor(frame['position'][2] * factor));
                    }
                }

                chunkSize += singleChunkBinary.current();
                chunkBinary.append(singleChunkBinary);

                if (game === 'mh') {
                    // Do nothing
                } else if (game === 'mh2') {
                    if (!bone['frames']['lastFrameTime']) {
                        if (fixedFrameTimeCount === 0) {
                            console.log(`Autocorrect ${animationName}, set duration to ${bone['frames']['lastFrameTime']} (MH v0.64 port)`);
                            fixedFrameTimeCount = bone['frames']['lastFrameTime'];
                        }

                        chunkBinary.setFloat32(fixedFrameTimeCount / 30);
                    } else {
                        if (
                            bone['frames']['lastFrameTime'] > fixedFrameTimeCount ||
                            fixedFrameTimeCount === 0
                        ) {
                            console.log(`Autocorrect ${animationName}, set duration to ${bone['frames']['lastFrameTime']} (instead of ${animation['frameTimeCount']})`);
                            fixedFrameTimeCount = bone['frames']['lastFrameTime'];
                        }

                        chunkBinary.setFloat32(bone['frames']['lastFrameTime'] / 30);
                    }
                }
            }

            binary.setInt32(chunkSize);
            binary.setFloat32(fixedFrameTimeCount / 30);
            binary.append(chunkBinary);

            binary.setInt32(16); //todo UNK

            binary.setFloat32(3); //todo UNK

            if (game === 'mh2') {
                binary.setInt32(160);
            } else {
                binary.setInt32(64);
            }

            //Animation effects
            {
                if (!animation['entry']) animation['entry'] = [];

                binary.setInt32(0);//(animation['entry'].length);

                // for (let entry of animation['entry']) {
                //     binary.setFloat32(entry['time']);
                //     binary.write(entry['unknown'], NBinary.HEX);
                //     binary.write(entry['unknown2'], NBinary.HEX);
                //
                //     if (game === "mh2") {
                //         binary.writeString(entry['CommandName']);
                //         binary.writeString(entry['unknownCommandRemain']);
                //     }
                //
                //     binary.write(entry['unknown3'], NBinary.HEX);
                //
                //     if (game === MHT.GAME_MANHUNT) {
                //         binary.write(entry['unknown4'], NBinary.HEX);
                //     }
                //
                //     binary.setFloat32(entry['unknown6']);
                //
                //     binary.writeString(entry['particleName']);
                //     binary.writeString(entry['unknownParticleName']);
                //
                //     for (let pPos of entry['particlePosition']) {
                //         binary.setFloat32(pPos);
                //     }
                //
                //     binary.write(entry['unknown5'], NBinary.HEX);
                // }
            }
        }

        return binary;
    }
}

export default new AnimationIFP();