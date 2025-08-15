import NBinary from "../NBinary.mjs";
import {Bone, Box3, Matrix4, Vector3} from "../../Vendor/three.module.mjs";
import ManhuntMatrix from "../../Layer1/ManhuntMatrix.mjs";
import {BufferGeometryUtils} from "../../Vendor/BufferGeometryUtils.mjs";

let writeOffset;

/**
 * Huge thanks to MAJEST1C_R3 & Allen!
 *
 * Manhunt 2 - MDL Exporter
 */
class Manhunt2MDL {


    /**
     * MDL Offset Table
     * @type {int[]}
     */
    offsetTable = [];

    /**
     * Temporary Offset storage, will be written at end
     * @type {int[]}
     */
    offsets = [];

    /**
     * Bone section start offset's
     * @type {int[]}
     */
    createdBonesOffsets = [];

    /**
     * Temporary, hold the current bone index
     * @type {int}
     */
    boneCreationIndex = 0;

    animationDataOffset = 0;

    objectInfos = [];

    reset(){
        this.offsetTable = [];
        this.offsets = [];
        this.createdBonesOffsets = [];
        this.objectInfos = [];
        this.boneCreationIndex = 0;
        this.animationDataOffset = 0;
    }
    /**
     * 
     * @param {Group[]} groups
     * @return {NBinary}
     */
    build(groups) {
        this.reset();
        const binary = new NBinary(new ArrayBuffer(1000000));

        // const textureNameOffsets = [];

        let firstOffset = 0;
        let lastOffset = 0;
        let prevOffset = 0;
        
        let currentOffset = 32;

        //Little helper to create and add an offset to the main table
        writeOffset = ((binary) => {
            return (info = "", val = undefined) => {
                this.offsetTable.push(binary.current());
                binary.setInt32(val || 0);
                return binary.current() - 4;
            };
        })(binary);

        this.createHeader(binary);

        const meshOffsetTable = {
            nextObjectInfoOffset: [],
            prevObjectInfoOffset: [],
            objectParentBoneOffset: [],
            objectOffset: [],
            rootEntryOffset: [],

            material : [

            ]
        };

        groups.forEach((group, groupIndex) => {

            /**
             * @type {SkinnedMesh}
             */
            const firstChild = group.children[0];
            const bones = firstChild.skeleton.bones;

            if (prevOffset)
                this.offsets[prevOffset] = binary.current();

            const beforeOffset = currentOffset;
            currentOffset = binary.current();

            if (groupIndex === 0) firstOffset = binary.current();
            if (groupIndex === groups.length - 1) lastOffset = binary.current();

            prevOffset = writeOffset('prevOffset',32);

            writeOffset('beforeOffset', beforeOffset);
            writeOffset('entryOffset', binary.current() + 8);

            binary.setInt32(0); //zero ?


            //CreateEntry
            const objectInfoOffset = binary.current() + 20;
            const rootOffset = binary.current();

            let position = this.createEntry(binary);

            const list = [];
            this.mapBones(bones[0], list);

            const rootBoneOffset = binary.current();

            list.forEach((boneInfo) => {
                this.createBone(
                    binary,
                    boneInfo,
                    rootBoneOffset,
                    boneInfo.parent?.userData?.offset || 0
                );
            });

            //update sibling and child offsets
            list.forEach((boneInfo) => {
                if (boneInfo.sibling !== null){
                    this.offsets[boneInfo.siblingBoneOffset] = boneInfo.sibling.offset;
                }
                if (boneInfo.children !== null){
                    this.offsets[boneInfo.childrenBoneOffset] = boneInfo.children.offset;
                }
            });

            if (this.animationDataOffset) {

                this.offsets[this.animationDataOffset] = binary.current();
                this.createAnimationDataIndex(binary, bones, rootBoneOffset);
                // this.offsetTable.push(binary.current());

            }

            this.offsets[position.firstObjectInfoOffset] = binary.current();


            const meshBones = group.children[0].skeleton.bones.filter((b) => {
                return b.userData.meshBoneIndex !== undefined;
            });

            const meshes = [group.children[0]];
            meshBones.forEach((b, index) => {
                if (index > 0)
                    meshes.push(b.children[0])
            });

            if (meshes.length) {

                const skinFlag = typeof firstChild.geometry.attributes.skinWeight !== "undefined";

                let startOfObjectInfo = 0;
                let startOfObjectInfoArr = [];
                let objectOffsetPositionArr = [];


                meshes.forEach((mesh, index) => {
                    const meshBone = meshBones[index];

                    if (meshes.length - 1 === index)
                        this.offsets[position.lastObjectInfoOffset] = binary.current();

                    const prevStartOfObjectInfo = startOfObjectInfo;
                    // startOfObjectInfo = writeOffset('nextObjectInfoOffset');

                    startOfObjectInfo = binary.current();
                    startOfObjectInfoArr.push(startOfObjectInfo);

                    binary.setInt32(0); // nextObjectInfoOffset

                    // writeOffset('prevObjectInfoOffset');
                    const prevObjectInfoOffset = binary.current();
                    binary.setInt32(0); // prevObjectInfoOffset


                    // Save objectInfo prevOffset
                    if (index === 0) {
                        this.offsets[prevObjectInfoOffset] = objectInfoOffset;
                    } else {
                        this.offsets[prevObjectInfoOffset] = prevStartOfObjectInfo;
                    }


                    // writeOffset('parentBoneOffset', meshBone.userData.offset);
                    binary.setInt32(meshBone.userData.offset); // parentBoneOffset

                    // const objectOffsetPosition = writeOffset('objectOffsetPosition');
                    const objectOffsetPosition = binary.current();
                    binary.setInt32(0); // objectOffsetPosition
                    objectOffsetPositionArr.push(objectOffsetPosition);

                    // writeOffset('rootEntryOffset', rootOffset);
                    binary.setInt32(rootOffset); // rootEntryOffset

                    {
                        meshOffsetTable.nextObjectInfoOffset.push(binary.current() - 20);
                        meshOffsetTable.prevObjectInfoOffset.push(binary.current() - 16);
                        meshOffsetTable.objectParentBoneOffset.push(binary.current() - 12);
                        meshOffsetTable.objectOffset.push(binary.current() - 8);
                        meshOffsetTable.rootEntryOffset.push(binary.current() - 4);
                    }


                    binary.setInt32(0);
                    binary.setInt32(3); //unk
                    binary.setInt32(0);

                });


                meshes.forEach((mesh, index) => {
                    const meshBone = meshBones[index];
                    //
                    // if (meshes.length - 1 === index)
                    //     this.offsets[position.lastObjectInfoOffset] = binary.current();
                    //
                    // const prevStartOfObjectInfo = startOfObjectInfo;
                    // // startOfObjectInfo = writeOffset('nextObjectInfoOffset');
                    // startOfObjectInfo = binary.current();
                    // binary.setInt32(0); // nextObjectInfoOffset
                    //
                    // // writeOffset('prevObjectInfoOffset');
                    // binary.setInt32(0); // prevObjectInfoOffset


                    // // Save objectInfo prevOffset
                    // if (index === 0) {
                    //     this.offsets[startOfObjectInfo + 4] = objectInfoOffset;
                    // } else {
                    //     this.offsets[startOfObjectInfo + 4] = prevStartOfObjectInfo;
                    // }

                    //
                    // // writeOffset('parentBoneOffset', meshBone.userData.offset);
                    // binary.setInt32(meshBone.userData.offset); // parentBoneOffset
                    //
                    // // const objectOffsetPosition = writeOffset('objectOffsetPosition');
                    // const objectOffsetPosition = binary.current();
                    // binary.setInt32(0); // objectOffsetPosition
                    //
                    // // writeOffset('rootEntryOffset', rootOffset);
                    // binary.setInt32(rootOffset); // rootEntryOffset
                    //
                    // {
                    //     meshOffsetTable.nextObjectInfoOffset.push(binary.current() - 20);
                    //     meshOffsetTable.prevObjectInfoOffset.push(binary.current() - 16);
                    //     meshOffsetTable.objectParentBoneOffset.push(binary.current() - 12);
                    //     meshOffsetTable.objectOffset.push(binary.current() - 8);
                    //     meshOffsetTable.rootEntryOffset.push(binary.current() - 4);
                    // }
                    //
                    //
                    // binary.setInt32(0);
                    // binary.setInt32(3); //unk
                    // binary.setInt32(0);


                    let matOffsetInfo = {
                        materialOffset: 0,
                        textNameOffset: [],
                        boneTransDataOffset: 0,
                        boneTransDataIndexOffset: 0,
                    };

                    let materialOffset = 0;
                    if (mesh.material.length) {

                        const [matOffset, nameOffsets] = this.createMaterials(
                            binary,
                            mesh.material
                        );

                        materialOffset = matOffset;

                        nameOffsets.forEach((nameOffset) => {
                            matOffsetInfo.textNameOffset.push(nameOffset.position);
                            // textureNameOffsets.push(nameOffset);
                        });

                    } else {
                        binary.setInt32(0);
                    }

                    let objectMatrixOffset = 0;
                    if (mesh.skeleton !== undefined) {
                        objectMatrixOffset = binary.current();
                        matOffsetInfo.boneTransDataOffset = objectMatrixOffset + 4;
                        this.createObjectMatrix(binary, list, meshBone, mesh);
                    }

                    this.offsets[objectOffsetPositionArr[index]] = binary.current();

                    matOffsetInfo.materialOffset = binary.current();
                    // writeOffset('materialOffset', materialOffset);
                    binary.setInt32(materialOffset);


                    matOffsetInfo.boneTransDataIndexOffset = binary.current() + 4;

                    meshOffsetTable.material.push(matOffsetInfo);

                    this.createObject(
                        binary,
                        mesh,
                        objectMatrixOffset,
                        skinFlag,
                        meshBone
                    );


                    // Save objectInfo nextOffset
                    if (meshes.length - 1 === index) {
                        this.offsets[startOfObjectInfoArr[index]] = position.firstObjectInfoOffset;
                    } else {
                        this.offsets[startOfObjectInfoArr[index]] = startOfObjectInfoArr[index + 1];
                    }

                    console.log("SET", this.offsets[startOfObjectInfoArr[index]])

                });

            }

        });

        binary.writePadding("\x00", 16);

        // Generate texture names
        {
            // textureNameOffsets.forEach((texNameOffsetPosition) => {
                // this.offsets[texNameOffsetPosition.position] = binary.current();
                // binary.writeString(texNameOffsetPosition.name, 0);


                // this.offsetTable.push(texNameOffsetPosition.position);
            // });

            // binary.writePadding("\x00", 16);
        }

        console.log(meshOffsetTable);

        /**
         *
         * 213 => BoneInfo                                      BoneInfo

         * 214 => NextObjectInfoOffset                          NextObjectInfoOffset
         * 215 => PrevObjectInfoOffset                          PrevObjectInfoOffset
         * 216 => ObjectParentBoneOffset                        ObjectParentBoneOffset
         * 217 => ObjectOffset                                  ObjectOffset
         * 218 => RootEntryOffset                               RootEntryOffset




         * 219 => NextObjectInfoOffset                          BoneTransDataIndexOffset
         * 220 => PrevObjectInfoOffset                          MaterialOffset
         * 221 => ObjectParentBoneOffset                        BoneTransDataIndexOffset
         * 222 => ObjectOffset                                  NextObjectInfoOffset
         * 223 => RootEntryOffset                               PrevObjectInfoOffset

         * 224 => NextObjectInfoOffset                          ObjectParentBoneOffset
         * 225 => PrevObjectInfoOffset                          ObjectOffset
         * 226 => ObjectParentBoneOffset                        RootEntryOffset
         * 227 => ObjectOffset                                  BoneTransDataOffset
         * 228 => RootEntryOffset                               MaterialOffset

         * 229 => textNameOffset
         * 230 => textNameOffset
         * 231 => BoneTransDataOffset
         * 232 => MaterialOffset
         * 233 => BoneTransDataIndexOffset

         * 234 => textNameOffset
         * 235 => BoneTransDataOffset
         * 236 => MaterialOffset
         * 237 => BoneTransDataIndexOffset

         * 238 => textNameOffset
         * 239 => BoneTransDataOffset
         * 240 => MaterialOffset
         * 241 => BoneTransDataIndexOffset
         *
         *
         *
         *
         */

        meshOffsetTable.nextObjectInfoOffset.forEach((tmp, index) => {
            this.offsetTable.push(meshOffsetTable.nextObjectInfoOffset[index]);
            this.offsetTable.push(meshOffsetTable.prevObjectInfoOffset[index]);
            this.offsetTable.push(meshOffsetTable.objectParentBoneOffset[index]);
            this.offsetTable.push(meshOffsetTable.objectOffset[index]);
            this.offsetTable.push(meshOffsetTable.rootEntryOffset[index]);
        });

        meshOffsetTable.material.forEach((material) => {
            material.textNameOffset.forEach((textNameOffset) => {
                this.offsetTable.push(textNameOffset);
            })

            this.offsetTable.push(material.boneTransDataOffset);
            this.offsetTable.push(material.materialOffset);
            this.offsetTable.push(material.boneTransDataIndexOffset);
        })



        // Last Steps: Update offsets
        {
            this.offsets[12] = binary.current();
            this.offsets[16] = binary.current();

            this.offsets[20] = this.offsetTable.length;
            this.offsets[32] = firstOffset;
            this.offsets[36] = lastOffset;


                // Generate offset table
            this.offsetTable.forEach((offset) => {
                binary.setInt32(offset);
            });


            // Update file size
            this.offsets[8] = binary.current();

            const eof = binary.current();

            for(let i in this.offsets){
                binary.setCurrent(i);
                binary.setInt32(this.offsets[i])
            }

            binary.setCurrent(eof);
        }

        binary.end();
        binary.setCurrent(0);
        return binary;
    }

    /**
     *
     * @param {NBinary} binary
     */
    createHeader(binary) {
        [
            1129074000, // fourCC / PMLC
            1,      // always 1
            0,      // file size
            0,      // offsetTable
            0,      // offsetTable2
            0,      // offsetTable entry count
            0, 0,   // zero/pad
            0,      // FirstEntryIndexOffset
            0,      // LastEntryIndexOffset
            0, 0    // zero/pad
        ].forEach(val => binary.setInt32(val));
        
        this.offsetTable.push(
            32,     // Point to firstOffset
            36      // Point to lastOffset
        );
    }

    /**
     *
     * @param {NBinary} binary
     */
    createEntry(binary) {

        writeOffset("rootBoneOffset", binary.current() + 32);

        //todo: this is invalid
        binary.setZero(3, binary.setInt32.bind(binary));

        //objectInfoIndexOffset
        // binary.setInt32(binary.current() + 4);
        binary.setInt32(0);

        const positions = {
            firstObjectInfoOffset: writeOffset("firstObjectInfoOffset"),
            lastObjectInfoOffset: writeOffset("lastObjectInfoOffset")
        };

        binary.setInt32(0); //zero

        return positions;
    }

    /**
     *
     * @param {NBinary} binary
     * @param {{
     *     bone: Bone,
     *     offset: undefined,
     *     childrenBoneOffset: int,
     *     siblingBoneOffset: int,
     *     sibling: Bone,
     *     children: Bone
     * }} boneInfo
     * @param {int} rootBoneOffset
     * @param {int} parentBoneOffset
     */
    createBone(binary,  boneInfo, rootBoneOffset, parentBoneOffset = 0) {

        boneInfo.bone.userData.offset = binary.current();
        boneInfo.offset = binary.current();

        //todo looks like it is optional...
        binary.setInt32(boneInfo.bone.userData.tag); // firstInt?
        // binary.setInt32(3408248); // firstInt?

        if (boneInfo.sibling !== null) boneInfo.siblingBoneOffset = writeOffset('siblingBoneOffsetPosition')
        else binary.setInt32(0);

        if (this.boneCreationIndex > 0) writeOffset('parentBoneOffset', parentBoneOffset);
        else binary.setInt32(parentBoneOffset);

        writeOffset("rootBoneOffset", rootBoneOffset);

        if (boneInfo.children !== null)
            boneInfo.childrenBoneOffset = writeOffset("childBoneOffset");
        else binary.setInt32(0);

        if (boneInfo.bone.userData.animFlag === true)
            this.animationDataOffset = writeOffset('animationDataOffset');
        else binary.setInt32(0);

        let name = ManhuntMatrix.getBoneNameByBoneId(boneInfo.bone.userData.boneId) || boneInfo.bone.userData.name;
        if (name === "0")
            name = "Danny_Ingame-DAsy";
        if (name === "DrWhyte_Cutscene")
            name = "Danny_Ingame-DAsy";
        if (name === "Leo_Asylum_Cutscene")
            name = "Danny_Ingame-DAsy";


        // console.log("NAME", name, boneInfo.bone.userData.boneId, boneInfo.bone.userData.name)

        // console.log(boneInfo.bone.userData.name);
        binary.writeString(name.padEnd(32, "\x00"));
        binary.setInt32(1);
        binary.setInt32(0);

        //Write bone matri
        // binary.setMatrix4(boneInfo.bone.userData.originalMatrix.local);
        // binary.setMatrix4(boneInfo.bone.userData.originalMatrix.world);
        binary.setMatrix4(boneInfo.bone.matrix);
        binary.setMatrix4(boneInfo.bone.matrixWorld);

        this.boneCreationIndex++;
    }

    mapBones(bone, list, parentBone = null) {
        const result = {
            id: bone.userData.boneId,
            bone,
            parent: parentBone,
            children: null,
            sibling: null
        };

        list.push(result);

        const childBones = bone.children.filter(child => child.isBone);
        if (childBones.length > 0) {
            result.children = this.mapBones(childBones[0], list, bone);

            let previousSibling = result.children;
            for (let i = 1; i < childBones.length; i++) {
                const siblingBone = childBones[i];
                previousSibling.sibling = this.mapBones(siblingBone, list, bone);
                previousSibling = previousSibling.sibling;
            }
        }

        return result;
    }

    /**
     *
     * @param {NBinary} binary
     * @param {MeshBasicMaterial[]} materials
     * @return {(*|*[])[]}
     */
    createMaterials(binary, materials) {
        const materialOffset = binary.current();
        const texNameOffsetPositions = [];

        let materialOffsets = [];
        materials.forEach((material) => {
            texNameOffsetPositions.push({ position: binary.current(), name: material.name });

            // writeOffset('textureNameOffset')
            materialOffsets.push(binary.current())
            binary.setInt32(0); // textureNameOffset

            binary.setInt8(0); //bLoaded (?)

            //Color
            [material.color.r, material.color.g, material.color.b, material.opacity].forEach((val) => {
                binary.setUInt8(val * 255.0);
            });

            //Pad
            binary.setZero(3, binary.setInt8.bind(binary));


        });

        materials.forEach((material, index) => {
            this.offsets[materialOffsets[index]] = binary.current();
            binary.writeString(material.name, 0);
        })


        binary.writePadding("\x00", 16);

        return [materialOffset, texNameOffsetPositions];
    }

    /**
     *
     * @param {NBinary} binary
     * @param {{bone:Bone}[]} boneInfos
     * @param {Bone} meshBone
     * @param {SkinnedMesh} tmpMesh
     */
    createObjectMatrix(binary, boneInfos, meshBone, tmpMesh) {

        binary.setInt32(boneInfos.length);

        let matrixOffset = binary.current();
        binary.setInt32(0); //BoneTransDataOffset

        binary.setInt32(0); //pad
        binary.setInt32(0); //pad
        this.offsets[matrixOffset] = binary.current();

        console.log("used mesh", meshBone.name);

        boneInfos.forEach((boneInfo, index) => {

            //
            if (index === 0){
                binary.setMatrix4(meshBone.matrixWorld);
            }else{

                const parentInverse = new Matrix4().copy(meshBone.matrix);
                const productMatrix = new Matrix4().copy(boneInfo.bone.matrixWorld).invert().multiply(parentInverse);
                const boneMatrix = new Matrix4().copy(productMatrix);

                binary.setMatrix4(boneMatrix);
            }

        });

    }

    /**
     *
     * @param {NBinary} binary
     * @param {Mesh} mesh
     * @param {int} objectMatrixOffset
     * @param {boolean} skinFlag
     * @param {Bone} meshBone
     */
    createObject(binary, mesh, objectMatrixOffset, skinFlag, meshBone) {
        const elementInfo = this.getVertexElementInfo(
            mesh.geometry.attributes.uv.count,
            mesh.geometry.attributes.uv2?.count || 0,
            skinFlag
        );

        /**
         * @type {BufferGeometry}
         */
        const mergedVerticesGeo = BufferGeometryUtils.mergeVertices(mesh.geometry)


        binary.setInt32(mesh.material.length);

        if (objectMatrixOffset !== false)
            binary.setInt32(objectMatrixOffset); // objectMatrixOffset | BoneTransDataIndexOffset
            // writeOffset('objectMatrixOffset', objectMatrixOffset);
        else
            binary.setInt32(0);

        //unk
        binary.setFloat32(0); // default 0, 1 for mirror.mdl todo value checks
        binary.setInt32(1); // default 0, 1 for mirror.mdl

        //pad
        binary.setZero(3, binary.setInt32.bind(binary));


        binary.setInt32(0x45d454); //modelChunkFlag (PC)

        const modelChunkSizeOffset = binary.current();
        binary.setInt32(0);

        binary.setInt32(0); //zero

        binary.setInt32(mesh.material.length);

        // const testMode = false;

        // if (testMode){
        //     face count
            // binary.setInt32(mesh.userData.ogObject.object.faces.length);

        // }else{
            //face count
            binary.setInt32(mergedVerticesGeo.index.count);

        // }

        //Mesh Bounding Box
        {
            // if (testMode){
            //     binary.writeVector3(mesh.userData.ogObject.object.boundingSphereXYZ, binary.setFloat32.bind(binary));
            //     binary.setFloat32(mesh.userData.ogObject.object.boundingSphereRadius);
            //     binary.writeVector3(mesh.userData.ogObject.object.boundingSphereScale, binary.setFloat32.bind(binary));
            //
            // }else{
                const bbox = this.getMeshBoundingInfos(mergedVerticesGeo);
                binary.writeVector3(bbox.center, binary.setFloat32.bind(binary));
                binary.setFloat32(bbox.radius);


                binary.setFloat32(1);
                binary.setFloat32(1);
                binary.setFloat32(1);

            // }
            // binary.writeVector3(bbox.scale, binary.setFloat32.bind(binary));
        }

        //Vertex count
        {

            // if (testMode){
            //     binary.setInt32(mesh.userData.ogObject.object.vertexCount);
            // }else{
                binary.setInt32(mergedVerticesGeo.attributes.position.count);
            // }

            binary.setZero(3, binary.setInt32.bind(binary));
        }

        binary.setInt32(elementInfo.size);

        //unknown
        [0x65, 7, 0, 1, 0, 0x7C9106AB, 0x64, 6, 0, 1, 0].forEach((v) => {
            binary.setInt32(v);
        });

        binary.setInt32(elementInfo.type);

        //unknown
        [0x14050e4, 0x1408624, 0, 0, 0x12f594, 0x330000, 0x7c91732, 5].forEach((v) => {
            binary.setInt32(v);
        });

        // if (testMode){
        //
        //     mesh.userData.ogObject.object.materialIds.forEach((material, index) => {
        //         binary.writeVector3(material.boundingBox.min, binary.setFloat32.bind(binary));
        //         binary.writeVector3(material.boundingBox.max, binary.setFloat32.bind(binary));
        //
        //         binary.setInt16(mesh.geometry.groups[index].count);
        //         binary.setInt16(mesh.geometry.groups[index].materialIndex);
        //         binary.setInt16(mesh.geometry.groups[index].start);
        //
        //         binary.setUInt16(0x7C91);
        //         binary.setZero(3, binary.setInt32.bind(binary));
        //     });
        // }else{
            this.createMaterialIDs(binary, mesh);

        // }


        //face index
        {
            // if (testMode){
            //     mesh.userData.ogObject.object.faces.forEach((fIndex) => {
            //         binary.setInt16(fIndex);
            //     });
            //
            // }else{
                mergedVerticesGeo.index.array.forEach((fIndex) => {
                    binary.setInt16(fIndex);
                });

            // }

        }


        const hasSkinWeights = [0x115E, 0x125E].includes(elementInfo.type);
        const uvSetCount = elementInfo.type === 0x252 || elementInfo.type === 0x125E ? 2 :
            elementInfo.type === 0x152 || elementInfo.type === 0x115E ? 1 : 0;

        const decomposed = ManhuntMatrix.decomposeMesh(
            mesh,
            mergedVerticesGeo,
            meshBone
        );

        // if (testMode){
        //     mesh.userData.ogObject.object.vertices.forEach((vertex, index) => {
        //         if (index === 0)
        //             console.log("write vec3", vertex.toArray());
        //
        //         binary.writeVector3(vertex, binary.setFloat32.bind(binary));
        //         if (hasSkinWeights){
        //             const weight = mesh.userData.ogObject.object.skinWeights[index];
        //             binary.setFloat32(weight.w);//4
        //             binary.setFloat32(weight.z);//3
        //             binary.setFloat32(weight.y);//2
        //             binary.setFloat32(weight.x);//1
        //
        //             const indices = mesh.userData.ogObject.object.skinIndices[index];
        //             binary.setInt8(indices.w);//4
        //             binary.setInt8(indices.z);//3
        //             binary.setInt8(indices.y);//2
        //             binary.setInt8(indices.x);//1
        //         }
        //
        //         binary.writeVector3(mesh.userData.ogObject.object.normals[index], binary.setInt16.bind(binary), 32768.0);
        //
        //         binary.setInt16(0);//zero
        //
        //         binary.setInt8(mesh.userData.ogObject.object.colorPerVertex[index].b);
        //         binary.setInt8(mesh.userData.ogObject.object.colorPerVertex[index].g);
        //         binary.setInt8(mesh.userData.ogObject.object.colorPerVertex[index].r);
        //         binary.setInt8(-1); //a
        //
        //         if (uvSetCount >= 1){
        //             binary.setFloat32(mesh.userData.ogObject.object.uv1[index][0]);
        //             binary.setFloat32(mesh.userData.ogObject.object.uv1[index][1]);
        //         }
        //
        //         if (uvSetCount === 2){
        //             binary.setFloat32(mesh.userData.ogObject.object.uv2[index][0]);
        //             binary.setFloat32(mesh.userData.ogObject.object.uv2[index][1]);
        //         }
        //
        //
        //     });
        //
        // }else{
            decomposed.forEach((vertexInfo) => {

                binary.writeVector3(vertexInfo.vertex, binary.setFloat32.bind(binary));

                if (hasSkinWeights){
                    binary.setFloat32(vertexInfo.weight.w);//4
                    binary.setFloat32(vertexInfo.weight.z);//3
                    binary.setFloat32(vertexInfo.weight.y);//2
                    binary.setFloat32(vertexInfo.weight.x);//1

                    binary.setInt8(vertexInfo.skinIndices.w);//4
                    binary.setInt8(vertexInfo.skinIndices.z);//3
                    binary.setInt8(vertexInfo.skinIndices.y);//2
                    binary.setInt8(vertexInfo.skinIndices.x);//1
                }

                binary.writeVector3(vertexInfo.normal, binary.setInt16.bind(binary), 32768.0);

                binary.setInt16(0);//zero

                binary.setInt8(vertexInfo.color.b);
                binary.setInt8(vertexInfo.color.g);
                binary.setInt8(vertexInfo.color.r);
                binary.setInt8(-1); //a

                if (uvSetCount >= 1){
                    binary.setFloat32(vertexInfo.tu);
                    binary.setFloat32(vertexInfo.tv);
                }

                if (uvSetCount === 2){
                    binary.setFloat32(vertexInfo.tu2);
                    binary.setFloat32(vertexInfo.tv2);
                }

            });
        // }


        //Update chunk size

        this.offsets[modelChunkSizeOffset] = binary.current() - modelChunkSizeOffset + 4;

        binary.writePadding("\x00", 16);

    }

    /**
     *
     * @param {BufferGeometry} geometry
     * @return {{min: *, max: *, center: *, scale: Vector3, radius: number}}
     */
    getMeshBoundingInfos(geometry){
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        // console.log(geometry.boundingSphere.center, geometry.boundingSphere.radius);
        let bbox = geometry.boundingBox;
        let min = bbox.min.clone();
        let max = bbox.max.clone();
        let center = bbox.getCenter(new Vector3());
        let scale = new Vector3().subVectors(max, min);

        return { min, max, center, scale, radius: geometry.boundingSphere.radius };
    }

    /**
     * 
     * @param {NBinary} binary
     * @param {Bone[]} bones
     * @param {int} rootBoneOffset
     */
    createAnimationDataIndex(binary, bones, rootBoneOffset) {

        binary.setInt32(bones.length);


        binary.setInt32(12187648); //unknownFlag
        // binary.setInt32(0); //unknownFlag

        writeOffset("rootBoneOffset", rootBoneOffset);

        const animationDataOffset = writeOffset("rootBoneOffset");
        const boneTransformOffset = writeOffset("boneTransformOffset");

        binary.setInt32(0); //zero

        binary.writePadding("\x00", 16);


        this.offsets[animationDataOffset] = binary.current();


        const transformData = [];
        bones.forEach((bone) => {

            transformData.push(
                0,0,0,1.0,
                0,0,0,0
            );

            //todo: possible source of issue, guess we have more cases
            if (bone.name.indexOf('bone_') !== -1){
                const boneId = bone.userData.boneId;
                binary.setInt16(boneId);
                if (ManhuntMatrix.boneId2BoneType[bone.name] === undefined){
                    console.error(`Unable to convert BoneId ${boneId} to BoneAnimationType`);
                    binary.setInt16(0); // no animation transform
                }else{
                    binary.setInt16(ManhuntMatrix.boneId2BoneType[bone.name]);

                }
            }else if(bone.name === "LurebagEmpty_(CT)"){
                binary.setInt16(-1);
                binary.setInt16(1);
            }else if(bone.name === "weapstrap"){
                binary.setInt16(-1);
                binary.setInt16(3); // only Position Animation
            }else if(bone.name.indexOf('_L0') !== -1){
                binary.setInt16(-1);
                binary.setInt16(3); // only Position Animation
            }else{
                binary.setInt16(-1);
                binary.setInt16(0); // no animation transform
            }

            writeOffset('boneOffset', bone.userData.offset);
        });

        binary.writePadding("\x00", 16);

        this.offsets[boneTransformOffset] = binary.current();
        transformData.forEach((val) => binary.setFloat32(val));

        binary.writePadding("\x00", 16);
    }

    /**
     *
     * @param {NBinary} binary
     * @param {SkinnedMesh|Mesh} mesh
     */
    createMaterialIDs(binary, mesh) {
        const matBB = this.getMaterialFaceDataByMesh(mesh);

        mesh.material.forEach((material, index) => {
            binary.writeVector3(matBB[index].min, binary.setFloat32.bind(binary));
            binary.writeVector3(matBB[index].max, binary.setFloat32.bind(binary));

            binary.setInt16(mesh.geometry.groups[index].count);
            binary.setInt16(mesh.geometry.groups[index].materialIndex);
            binary.setInt16(mesh.geometry.groups[index].start);

            binary.setUInt16(0x7C91);
            binary.setZero(3, binary.setInt32.bind(binary));
        });
    }

    /**
     *
     * @param {Mesh} mesh
     * @return {Box3[]}
     */
    getMaterialFaceDataByMesh(mesh) {
        const geometry = mesh.geometry;
        const position = geometry.attributes.position;
        const groups = geometry.groups;
        const materialCount = mesh.material.length;

        const boundingBoxes = [];

        for (let n = 0; n < materialCount; n++) {
            const materialBoundingBox = new Box3();
            const tempVertices = [];

            groups.forEach((group) => {
                if (group.materialIndex !== n) return;

                for (let i = group.start; i < group.start + group.count; i += 3) {
                    tempVertices.push(new Vector3(
                        position.getX(i),
                        position.getY(i),
                        position.getZ(i)
                    ), new Vector3(
                        position.getX(i + 1),
                        position.getY(i + 1),
                        position.getZ(i + 1)
                    ), new Vector3(
                        position.getX(i + 2),
                        position.getY(i + 2),
                        position.getZ(i + 2)
                    ));
                }

            });

            if (tempVertices.length === 0)
                continue;

            tempVertices.forEach((vertex) => materialBoundingBox.expandByPoint(vertex));
            boundingBoxes.push(materialBoundingBox);
        }

        return boundingBoxes;
    }

    /**
     * Determine the vertex element size and type based on uv counts and skin flag
     *
     * @param {int} uv1Count
     * @param {int} uv2Count
     * @param {boolean} skinFlag
     * @return {{size: number, type: number}}
     */
    getVertexElementInfo(uv1Count, uv2Count, skinFlag) {
        if (skinFlag === true)
            return {
                size: uv2Count > 2 ? 0x3C   : 0x34,
                type: uv2Count > 2 ? 0x125E : 0x115E
            };

        if (uv1Count > 0)
            return {
                size: uv2Count > 2 ? 0x28   : 0x20,
                type: uv2Count > 2 ? 0x252  : 0x152
            };

        return {
            size: 0x18,
            type: 0x52
        };
    }
}

export default new Manhunt2MDL();