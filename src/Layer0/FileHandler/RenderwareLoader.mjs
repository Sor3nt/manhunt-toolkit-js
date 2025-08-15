import FileHandlerAbstract from "./FileHandler.Abstract.mjs";
import Renderware from "./Renderware/Renderware.mjs";
import Database from "../Database.mjs";
import Result from "../Result.mjs";
import MimeType from "../MimeType.mjs";
import NormalizeMap from "./Renderware/Utils/NormalizeMap.mjs";
import TextureNative from "./Renderware/Chunk/TextureNative.mjs";
import Texture from "../ThreeLoader/Texture.mjs";
import TexDictionary from "./Renderware/Chunk/TexDictionary.mjs";
import {Bone, Face3, Group, Matrix4, Skeleton, Vector2, Vector3, Vector4} from "../../Vendor/three.module.mjs";
import helper from "../../Helper.mjs";
import SkeletonHelper from "../../Layer2/SkeletonHelper.mjs";
import ModelHelper from "../../Layer2/ModelHelper.mjs";
import ManhuntMatrix from "../../Layer1/ManhuntMatrix.mjs";

/**
 * @deprecated
 */
class NormalizeModel{

    constructor( data, props ){
        this.data = data;

        this.result = {};
        this.props = props;

        this.frameCount = this.data.frames.frameList.length;

        this.allBones = [];
        this.allBonesMesh = [];
        this.#normalize();
    }


    #getFrameBones(){

        let bones = [];
        for(let i = 0; i < this.frameCount; i++){

            let boneId = i;
            let name = "bone_" + boneId;

            if (this.data.frameNames.length > 0){
                if (this.data.frames.length === this.data.frameNames.length){
                    name = this.data.frameNames[i];
                    boneId = this.data.boneIdArray[i];
                }else{
                    name = i === 0 ? name : this.data.frameNames[i - 1];
                    boneId = i === 0 ? -1 : this.data.boneIdArray[i - 1];
                }
            }

            // name = ManhuntMatrix.getBoneNameByBoneId(boneId, 'mh2') || name;


            let bone = {
                name: name,
                boneId,
                userProp: {
                    name: name,
                    boneId
                },
                frame: this.data.frames.frameList[i]
            };

            if(name === "Bip01")
                bone.userProp.animFlag = true;

            this.data.hAnimBoneArray.forEach((animBone) => {
                if (animBone.boneId !== boneId)
                    return;

                bone.userProp.boneIndex = animBone.boneIndex;
                bone.userProp.boneType = animBone.boneType;
            });

            bones.push(bone);
        }

        return bones;
    }

    #getSkinBones(bones){
        return bones
            .filter(bne => {
                const boneIndex = bne.userProp.boneIndex;
                return boneIndex !== undefined && boneIndex >= 0 && boneIndex < this.frameCount;
            })
            .sort((a, b) => a.userProp.boneIndex - b.userProp.boneIndex);
    }

    #getMeshes(){

        let chunksGeometry = this.data.geometries;
        let meshes = [];

        for(let i = 0; i < chunksGeometry.length; i++){

            let skinFlag = false;
            let skinPLG = {};

            if (this.data.skins.length > 0){
                let chunkSkin = this.data.skins[i];
                if (chunkSkin !== false && chunkSkin !== undefined){
                    skinFlag = true;
                    skinPLG = chunkSkin.skinPLG;
                }
            }

            let mesh = {
                skinned: skinFlag,
                parentFrameID: this.data.atomics[i].frameIndex,
                material: [],
                skinPLG: skinPLG,
                face: chunksGeometry[i].faceMat.face,
                materialPerFace: chunksGeometry[i].faceMat.matId,
                normal: chunksGeometry[i].normal,
                vertices: chunksGeometry[i].vert,
                uv1: chunksGeometry[i].uv1,
                uv2: chunksGeometry[i].uv2,
                cpv: chunksGeometry[i].vColor,
            };

            /**
             * I did here a hack:
             * The material names for all objects are read into one array (Material.mjs:43)
             * but each object need his own material.
             * i currently hope that the order of the matId is always ASC
             * so we can "shift" the values from the big name array
             */
            let requiredMaterials = [];
            chunksGeometry[i].faceMat.matId.forEach((matId) => {
                if (requiredMaterials.indexOf(matId) !== -1) return;
                requiredMaterials.push(matId);

                if (this.data.material !== undefined) {
                    mesh.material.push({
                        diffuse: this.data.materials[matId].rgba,
                        textureName: this.data.material[matId],
                        opacitymap: null,
                    });
                }
            });
            meshes.push(mesh);
        }

        return meshes;
    }

    #createBone( data ){
        let bone = new Bone();
        bone.name = data.name;
        bone.userData = data.userProp;

        // if (data.frame.matrixCreationFlags === 3)
        bone.applyMatrix4((new Matrix4()).fromArray(data.frame.matrix));

        return bone;
    }

    #generateSkeletonBones(frameBones, skinBones){

        let _this = this;
        frameBones.forEach((bone) => {
            this.allBones.push(_this.#createBone(bone));
        });
        frameBones.forEach((bone, index) => {

            frameBones.forEach((boneInner, indexInner) => {
                if (indexInner === 0) return;

                if (index === boneInner.frame.parentFrameID - 1){

                    this.allBones[index].add(_this.allBones[indexInner]);
                }
            });
        });


        if (skinBones.length > 0){
            skinBones.forEach(function (boneInner) {
                frameBones.forEach(function (bone, indexInner) {
                    if (bone.name === boneInner.name ){
                        _this.allBonesMesh.push(_this.allBones[indexInner]);
                    }
                });
            });
        }

    }

    #normalize(){
        let meshes = this.#getMeshes();
        let frameBones = this.#getFrameBones();
        let skinBones = this.#getSkinBones(frameBones);
        this.#generateSkeletonBones(frameBones, skinBones);

        const scaleFactor = this.props.applyScaleFactor || 1;
        const scaleMatrix = new Matrix4().makeScale(scaleFactor, scaleFactor, scaleFactor);

        if (this.props.applyScaleFactor){
            this.allBones.forEach((b, index) => {
                b.position.applyMatrix4(scaleMatrix);
            });
        }


        if (this.props.applyBoneOrderFrom){
            SkeletonHelper.applyBoneOrderFrom(this.props.applyBoneOrderFrom, this.allBones);
        }

        let result = {
            skeleton: false,

            bones: [],
            objects: []
        };

        result.skeleton = this.props.skeleton || new Skeleton( this.allBones );
        result.skeleton.bones.forEach(function(bone){
            bone.updateWorldMatrix();
        });

        let meshBone;
        meshes.forEach((mesh, index) => {
            meshBone = result.skeleton.bones[mesh.parentFrameID];

            // meshBone.userData.meshBone = true;
            meshBone.userData.meshBoneIndex = index;

            let genericObject = {
                material: [],
                //Note: Models from 7Sin has per mesh a skin ?
                skinning: index === 0 ? mesh.skinned : false,
                meshBone: meshBone,

                faces: [],
                faceVertexUvs: [[]],

                vertices: [],
                skinIndices: [],
                skinWeights: [],
            };

            mesh.material.forEach((parsedMaterial) => {
                genericObject.material.push(parsedMaterial.textureName);
            });

            mesh.vertices.forEach((vertexInfo, index) => {
                if (skinBones.length > 0 && typeof mesh.skinPLG.indices !== "undefined") {

                    let indice = new Vector4(0,0,0,0);
                    indice.fromArray(mesh.skinPLG.indices[index]);
                    genericObject.skinIndices.push(indice);

                    let weight = new Vector4(0,0,0,0);
                    weight.fromArray(mesh.skinPLG.weights[index]);
                    genericObject.skinWeights.push(weight);
                }

                const vert = new Vector3( vertexInfo[0], vertexInfo[1], vertexInfo[2] );

                if (this.props.applyScaleFactor){
                    vert.applyMatrix4(scaleMatrix);
                }

                genericObject.vertices.push(vert);

            });

            for(let x = 0; x < mesh.face.length; x++) {

                let face = new Face3(mesh.face[x][0], mesh.face[x][1], mesh.face[x][2]);

                face.materialIndex = mesh.materialPerFace[x];

                if (mesh.normal.length > 0)
                    face.vertexNormals = [
                        new Vector3(mesh.normal[face.a][0], mesh.normal[face.a][1], mesh.normal[face.a][2]),
                        new Vector3(mesh.normal[face.b][0], mesh.normal[face.b][1], mesh.normal[face.b][2]),
                        new Vector3(mesh.normal[face.c][0], mesh.normal[face.c][1], mesh.normal[face.c][2]),
                    ];

                if(mesh.uv1.length > 0){
                    genericObject.faceVertexUvs[0].push([
                        new Vector2(
                            mesh.uv1[face.a][0],
                            mesh.uv1[face.a][1]
                        ),
                        new Vector2(
                            mesh.uv1[face.b][0],
                            mesh.uv1[face.b][1]
                        ),
                        new Vector2(
                            mesh.uv1[face.c][0],
                            mesh.uv1[face.c][1]
                        ),
                    ]);
                }

                genericObject.faces.push(face);
            }

            result.objects.push(genericObject);
        });

        if (this.allBonesMesh.length > 0){
            const firstMeshBone = result.skeleton.bones[meshes[0].parentFrameID]

            //hack for other RW games...
            if (firstMeshBone.name === "bone_0"){


            }else{
                //we need to rebuild the skeleton based only on mesh bones otherwise the indices and weight orders are wrong
                result.skeleton = this.props.skeleton || new Skeleton( this.allBonesMesh );

            }

        }

        this.result = result;
    }


    #get(field){
        if (this.result[field] === undefined)
            return false;

        return this.result[field];
    }

    getMaterial(){
        return this.#get('material');
    }

    getObjects(){
        return this.#get('objects');
    }

    getSkeleton(){
        return this.#get('skeleton');
    }

    getBones(){
        return this.#get('bones');
    }

}

class RenderwareLoader extends FileHandlerAbstract{
    tag = "RW";

    canHandle(binary, filePath){
        if (binary.length() <= 12) return false;

        let current = binary.current();

        let header = Renderware.parseHeader(binary);
        binary.setCurrent(current);
        if (header.version === 0)
            return false;

        switch (header.id) {
            case Renderware.CHUNK_TOC:
            case Renderware.CHUNK_WORLD:
            case Renderware.CHUNK_CLUMP:
            case Renderware.CHUNK_TEXDICTIONARY:
                return true;
        }

        return false;
    }

    process(binary, infos) {

        let results = [];
        while(binary.remain() > 0){
            let current = binary.current();
            let header = Renderware.parseHeader(binary);

            switch (header.id) {

                case Renderware.CHUNK_WORLD:

                    Database.add(
                        new Result(MimeType.MAP, this, binary, infos.name, current, 0, {
                            type: MimeType.MAP
                        }, infos.path)
                    );

                    break;
                case Renderware.CHUNK_CLUMP:
                    binary.setCurrent(current);
                    let list = Renderware.readClumpList(binary);

                    list.forEach((info) => {
                        Database.add(
                            new Result(MimeType.MODEL, this, binary, info.name, info.offset, 0, {
                                type: MimeType.MODEL,
                                name: info.name
                            }, infos.path)
                        );
                    });

                    //note: readClumpList will return all names we have only one loop and no next offset
                    if (binary.remain() === 0)
                        return results;

                    break;

                case Renderware.CHUNK_TEXDICTIONARY:


                    let texDic = new TexDictionary(binary, header, {});

                    texDic.list().forEach((info) => {
                        Database.add(
                            new Result(MimeType.TEXTURE, this, binary, info.name, info.offset, 0, {
                                type: MimeType.TEXTURE,
                                name: info.name
                            }, infos.path)
                        );


                    });

                    break;

                default:
                    helper.log(this.tag, `${header.id} is a unknown Renderware ChunkId`, 'error');
                    break;
            }

            binary.setCurrent(current + 12 + header.size);

        }

        return results;
    }


    /**
     * @deprecated
     * @param generic
     * @param result
     * @return {Promise<Group|boolean>}
     */
    async convertFromNormalized(generic, result){

        if (generic === false) return false;

        let group = new Group();
        group.userData.LODIndex = 0;
        group.name = result.name;

        let objects = generic.getObjects();

        for (const entry of objects) {

            let mesh = ModelHelper.getGeometry(
                entry.vertices,
                await this.generateMaterial(entry.material, entry.skinning),
                entry.faces,
                entry.faceVertexUvs,
                entry.skinIndices,
                entry.skinWeights,
                {
                    matrix: entry.meshBone.matrixWorld
                }
            );

            /**
             * @type {Skeleton} skeleton
             */
            let skeleton = generic.getSkeleton();
            mesh.add(skeleton.bones[0]);
            mesh.bind(skeleton);

            SkeletonHelper.useBoneIdAsName(skeleton.bones);

            group.add(mesh);
        }

        return group;
    }

    /**
     * todo: recode
     *
     * @param material
     * @param skinning
     * @returns {[]|Array}
     */
    async generateMaterial( material, skinning){

        let result = [];
        for (const mat of material) {
            result.push((await ModelHelper.getMaterial([{
                name: mat
            }], skinning))[0]);
        }
        return result;

    }


    async decode(binary, options = {}, props = {}) {

        if (props.type === MimeType.MODEL){
            let tree = Renderware.parse(binary);

            //todo recode !!!!
            const normalized = new NormalizeModel(tree.rootData, options);

            return await this.convertFromNormalized(normalized, {
                name: props.name
            });

        }

        if (props.type === MimeType.TEXTURE){
            let chunk = Renderware.parseHeader(binary);

            let texNative = new TextureNative(binary, chunk, {});
            texNative.parse();

            const texture = (new Texture({
                mipmaps: texNative.texture.mipmaps,
                bbp: texNative.texture.bitPerPixel,
                platform: texNative.platform,
                format: texNative.texture.format
            })).get();

            texture.name = props.name;
            return texture;
        }

        if (props.type === MimeType.MAP){
            let tree = Renderware.parse(binary, {});

            // todo: what a none sense ... recode
            const normalized =  new NormalizeMap(tree);

            return await this.convertFromNormalized(normalized, {
                name: props.name
            });
        }

    }
}

export default new RenderwareLoader();