import FileHandlerAbstract from "./FileHandler.Abstract.mjs";
import {Color, Group, Matrix4, Skeleton, Vector3, Vector4} from "../../Vendor/three.module.mjs";
import Database from "../Database.mjs";
import Result from "../Result.mjs";
import MimeType from "../MimeType.mjs";
import ModelHelper from "../../Layer2/ModelHelper.mjs";
import SkeletonHelper from "../../Layer2/SkeletonHelper.mjs";

/**
 * Manhunt 2 Model Loader (PC, PSP, PS2 and WII)
 *
 * Original implementation by Allen and MAJEST1C_R3 (3ds Max Script)
 * Reimplemented by Sor3nt (ThreeJs, Javascript)
 *
 * I am deeply grateful to MAJEST1C_R3 and Allen; without their support,
 * the implementation of the code would not have been possible!
 */
class ModelMdl extends FileHandlerAbstract{
    tag = "MDL";

    canHandle(binary, filePath){
        try {
            if (binary.getString(1) === "PMLC")
                return true;

            binary.setCurrent(0);
            if (binary.int32() === 1347243075) //WII CLMP
                return true;

        }catch(e){}
        return false;
    }

    process(binary, infos) {
        infos.platform = infos.platform || 'pc';

        binary.littleEndian = true;
        if (binary.int32() === 1347243075){
            infos.platform = "wii";
            binary.littleEndian = false;
        }

        binary.setCurrent(32);
        binary.setCurrent(binary.int32()); //firstEntryIndexOffset

        let nextEntryIndexOffset;
        do{
            nextEntryIndexOffset = binary.int32();

            const entryOffset = binary.seek(4).int32();
            binary.setCurrent(entryOffset);

            const rootBoneOffset = binary.int32()
            binary.setCurrent(rootBoneOffset + 24); //rootBoneOffset + offset to name

            let name = binary.consume(40, 'nbinary').getString(0);
            if (infos.name) name = infos.name;

            Database.add(
                new Result(MimeType.MODEL, this, binary, name, entryOffset, 0, {
                    name: name,
                    platform: infos.platform
                }, infos.path)
            );

            if (nextEntryIndexOffset !== 0x20)
                binary.setCurrent(nextEntryIndexOffset);

        }while(nextEntryIndexOffset !== 0x20);
    }

    async decode(binary, options = {}, props = {}) {

        let data = await this.readClump(binary, {...props, ...options});
        if (data !== false)
            data.name = props.name;

        return data;
    }

    /**
     *
     * @param {NBinary} binary
     * @param {int} materialCount
     * @return {{name:string, color: Color, opacity: int}[]}
     */
    parseMaterial(binary, materialCount ){
        let materials = [];

        for(let i = 0; i < materialCount; i++){

            const textureNameOffset = binary.int32();
            binary.seek(1); //bLoaded

            let material = {
                name: "",
                color: binary.colorRGB(binary.uInt8.bind(binary), 255.0),
                opacity: binary.uInt8() / 255.0
            };

            let nextMaterialOffset = binary.seek(3).current();

            binary.setCurrent(textureNameOffset);
            material.name = binary.getString(0, true);
            materials.push(material);
            binary.setCurrent(nextMaterialOffset);
        }

        return materials;
    }

    /**
     *
     * @param {NBinary} binary
     * @param {{platform: string}} props
     * @param {int} offset
     * @return {{}}
     */
    parseObject(binary, props, offset ){

        let platform = props.platform;
        if (platform !== "wii") {
            binary.setCurrent(offset + 32);
            platform = binary.uInt32() === 4576340 ? "pc" : (() => {
                binary.setCurrent(offset + 80);
                return binary.uInt32() === 1347629636 ? "ps2" : "psp";
            })();
        }

        binary.setCurrent(offset);

        if(platform === "pc")
            return this.parseObjectMDL(binary);

        if(platform === "psp")
            return this.parseObjectPsp(binary, offset);

        if(platform === "ps2")
            return this.parseObjectPs2(binary, offset);

        if(platform === "wii")
            return this.parseObjectWiiDFF(binary, offset);
    }

    /**
     *
     * @param {NBinary} binary
     * @param {int} chunkOffset
     */
    parseObjectPs2(binary, chunkOffset){

        const data = {
            materialOffset: binary.int32(),
            materialCount: binary.int32(),
            boneTransformOffset: binary.int32(),

            colorPerVertex: [],
            faces: [],
            vertices: [],
            materialIds: [],
            normals: [],
            skinIndices: [],
            skinWeights: [],
            uv1: [],
            uv2: []
        };

        function skipPadding(){
            const pos = binary.current();
            let pad = 0;
            if ((pos % 4) > 0) {
                pad = 4 - (pos % 4);
            }
            binary.seek(pad);
        }

        function convertIntToFloat(IntValue) {
            // Perform bitwise AND operation with 0xffff0000
            IntValue = IntValue & 0xffff0000;

            // Create an ArrayBuffer and views to interpret the bits
            const buffer = new ArrayBuffer(4);
            const intView = new Int32Array(buffer);
            const floatView = new Float32Array(buffer);

            // Set the integer value
            intView[0] = IntValue;

            // Return the float interpretation of the bits
            return floatView[0];
        }

        binary.setCurrent(chunkOffset + 32);

        let chunkSize = binary.uInt16();
        data.numMaterialID = binary.uInt16();

        chunkSize = ((((data.numMaterialID % 16) << 16) >>> 0) ^ chunkSize) >>> 0;
        const endChunkOffset = chunkSize + chunkOffset + 16;

        data.vertexElementType = binary.uInt32();
        binary.seek(16);

        data.scaleFactor = binary.vector3(binary.float32.bind(binary));
        data.translateFactor = binary.vector3(binary.float32.bind(binary));

        data.modelChunkFlag = binary.int32();
        binary.seek(12);

        let realNumMatID = (data.numMaterialID / 16)

        const UVScale_Array = [];
        const FaceDir_Array = [];
        const materialIdInfo = {
            'startFaceID': [],
            'matID': [],
            'numface': []
        };

        if (realNumMatID > 1) realNumMatID--;

        for(let i = 0; i < realNumMatID; i++){
            binary.seek(16);

            UVScale_Array.push({
                x: binary.float32(),
                y: binary.float32()
            });

            binary.seek(8);

            const materialIdFaceCount = binary.uInt16();
            const materialId = binary.uInt16();

            FaceDir_Array.push(materialIdFaceCount);
            materialIdInfo.matID.push(materialId);
            binary.seek(12);
        }

        let startIndex = 0;
        let stripNum = 0;
        let faceDirection = 1;

        do {
            const triangleStripSize = binary.uInt16();
            binary.seek(14);

            const endOffset = binary.current() + (triangleStripSize * 16)
            const uv = UVScale_Array[stripNum];

            if ((FaceDir_Array[stripNum] % 2) === 0)
                faceDirection = -1;
            else
                faceDirection = 1;

            let faceCount = 0;
            do {
                binary.seek(12);
                const numVerts = binary.uInt32();
                binary.seek(32);

                let f1 = startIndex;
                let f2 = startIndex + 1;

                binary.seek(4); //vertsBlockHeader
                for(let i = 0; i < numVerts; i++){
                    data.vertices.push(binary.vector3(binary.int16.bind(binary), 32768.0)
                        .multiply(data.scaleFactor)
                        .add(data.translateFactor)
                    );

                    if (i > 1) {
                        faceDirection *= -1;
                        let f3 = startIndex + i;

                        const c = data.vertices[ data.vertices.length - 1 ]
                        const a = data.vertices[ data.vertices.length - 3 ]
                        const b = data.vertices[ data.vertices.length - 2 ]

                        if (
                            c.toArray().join('_') !== b.toArray().join('_') &&
                            c.toArray().join('_') !== a.toArray().join('_') &&
                            b.toArray().join('_') !== a.toArray().join('_')
                        ){
                            faceCount++;
                            if (faceDirection > 0)
                                data.faces.push(f1,f2,f3);
                            else
                                data.faces.push(f2,f1,f3);
                        }


                        f1 = f2;
                        f2 = f3;
                    }
                }

                skipPadding();
                binary.seek(28);

                binary.seek(4); //UVBlockHeader
                for(let i = 0; i < numVerts; i++){
                    data.uv1.push([
                        (binary.uInt8() / 255.0) * uv.x,
                        (binary.uInt8() / 255.0) * uv.y,
                        0
                    ]);
                }

                skipPadding();

                binary.seek(4); //VColBlockHeader
                for(let i = 0; i < numVerts; i++){

                    const blue = binary.uInt8();
                    const green = binary.uInt8();
                    const red = binary.uInt8();
                    const alpha = binary.uInt8();

                    data.colorPerVertex.push(new Color(red, green, blue));
                }

                binary.seek(4); //NormalsBlockHeader
                for(let i = 0; i < numVerts; i++){
                    data.normals.push(binary.vector3(binary.int8.bind(binary), 127.0));
                }

                skipPadding();
                if (data.vertexElementType > 15){
                    data.skinDataFlag = true;

                    binary.seek(4); //SkinBlockHeader
                    for(let i = 0; i < numVerts; i++){

                        const weightsRaw = [
                            binary.uInt32(),
                            binary.uInt32(),
                            binary.uInt32(),
                            binary.uInt32()
                        ];
                        const weights = [
                            convertIntToFloat(weightsRaw[0]),
                            convertIntToFloat(weightsRaw[1]),
                            convertIntToFloat(weightsRaw[2]),
                            convertIntToFloat(weightsRaw[3])
                        ];

                        // console.log(weightsRaw, weights);
                        // die;
                        const w = { weights:[], boneIds: [] };
                        const maxWeight = weights[0] + weights[1] + weights[2] + weights[3];
                        if (maxWeight > 0){
                            if (weights[3] > 0){
                                w.boneIds.push((weightsRaw[3] & 0xffff) / 4)
                                w.weights.push(weights[3])
                            }
                            if (weights[2] > 0){
                                w.boneIds.push((weightsRaw[2] & 0xffff) / 4)
                                w.weights.push(weights[2])
                            }
                            if (weights[1] > 0){
                                w.boneIds.push((weightsRaw[1] & 0xffff) / 4)
                                w.weights.push(weights[1])
                            }
                            if (weights[0] > 0){
                                w.boneIds.push((weightsRaw[0] & 0xffff) / 4)
                                w.weights.push(weights[0])
                            }
                        }


                        data.skinWeights.push(new Vector4(
                            w.weights[0] || 0,
                            w.weights[1] || 0,
                            w.weights[2] || 0,
                            w.weights[3] || 0
                        ));

                        data.skinIndices.push(new Vector4(
                            w.boneIds[0] || 0,
                            w.boneIds[1] || 0,
                            w.boneIds[2] || 0,
                            w.boneIds[3] || 0
                        ));
                    }
                }

                binary.seek(4); //blockEndingFlag
                const padlen = endOffset - binary.current()
                if (padlen < 16 && padlen > 0)
                    binary.seek(padlen)

                startIndex += numVerts;
            }while(binary.current() < endOffset);

            materialIdInfo.numface.push(faceCount);
            stripNum++;
        }while(binary.current() < endChunkOffset);


        let startFaceId = 0;
        for(let m = 0; m < materialIdInfo.matID.length; m++){
            const numFaces = materialIdInfo.numface[m] * 3;

            data.materialIds.push({
                'startFaceId': startFaceId,
                'materialID': materialIdInfo.matID[m],
                'faceCount': numFaces
            });

            startFaceId += numFaces;
        }

        return data;
    }

    /**
     *
     * @param {NBinary} binary
     * @param {int} chunkOffset
     */
    parseObjectWiiDFF(binary, chunkOffset){
        let data = {
            materialOffset: binary.uInt32(),
            materialCount: binary.uInt32(),
            boneTransformOffset: binary.uInt32(),

            faces: [],
            vertices: [],
            materialIds: [],
            colorPerVertex: [],
            uv1: [],
            uv2: [],
            normals: [],
            skinIndices: [],
            skinWeights: []
        }

        function addSkinWeight(index, boneId, weight, reset = false){
            if (reset === true || data.skinWeights[index] === undefined)
                data.skinWeights[index] = { boneIds: [], weights: [] };

            data.skinWeights[index].boneIds.push(boneId);
            data.skinWeights[index].weights.push(weight);
        }

        binary.setCurrent(chunkOffset + 108);
        const meshChunkOffset = binary.int32();

        binary.setCurrent(chunkOffset + 116);
        const skinChunkOffset = binary.int32();

        binary.setCurrent(meshChunkOffset + 12);
        const modelFlag = binary.int32();
        if (modelFlag !== 1){
            console.log('Unabale to parse DFF file');
            return;
        }

        let haveUV1;
        let haveUV2;
        let haveSkin = false;
        let haveColor = false;
        let haveNormal;

        binary.seek(12);

        let start = binary.current();

        const vertexInfoOffset = binary.int32();
        const colorOffset = binary.int32();
        const UVOffset = binary.int32();
        const normalOffset = binary.int32();
        const faceMaterialOffset = binary.int32();

        binary.setCurrent(start + normalOffset);
        const normalType = binary.int32();
        haveNormal = normalType === 42;


        binary.setCurrent(start + vertexInfoOffset);
        const vertexOffset = binary.int32();
        const vertexCount = binary.int16();
        const vertFlag = binary.int16();


        const vertDataFormat = (vertFlag & 0xF000) >>> 12;
        let vertPower = (vertFlag & 0xF00) >>> 8;
        vertPower = Math.pow(2, vertPower);

        const UV1_array = [];
        const UV2_array = [];
        const UV1Face_array = [];
        const UV2Face_array = [];
        const oldColorPerVertex = [];
        const materialIdInfo = {
            'startFaceID': [],
            'matID': [],
            'numface': []
        };

        //Vertex & Normal
        {
            binary.setCurrent(start + vertexOffset)

            for (let j = 0; j < vertexCount; j++) {

                if (vertDataFormat === 3){
                    data.vertices.push(binary.vector3(binary.int16.bind(binary), vertPower));
                    data.normals.push(binary.vector3(binary.int16.bind(binary), vertPower));
                }else if (vertDataFormat === 4){
                    data.vertices.push(binary.vector3(binary.float32.bind(binary), vertPower));
                    data.normals.push(new Vector3(0,0,0));
                }

                data.colorPerVertex.push(new Color());
                data.skinWeights.push({ boneIds: [], weights: [] })
            }
        }

        //Color
        {
            binary.setCurrent(start + colorOffset + 4);

            const colorCount = binary.int16();
            const colorFlag = binary.int16();

            if (colorCount){
                haveColor = true;

                const colorDataFormat = (colorFlag & 0xF000) >>> 12;

                for(let i = 0; i < colorCount; i++){

                    const blue = binary.uInt8();
                    const green = binary.uInt8();
                    const red = binary.uInt8();
                    let alpha = 255;

                    if (colorDataFormat === 2)
                        binary.seek(1); //pad
                    else if (colorDataFormat === 5)
                        alpha = binary.uInt8();
                    else
                        console.log(`Unsupported Color Format ${colorDataFormat}`)

                    oldColorPerVertex.push(new Color(red, green, blue));
                }
            }
        }

        //UV1 + UV2
        {
            binary.setCurrent(start + UVOffset);

            function readUVInfo(){
                let data = {
                    offset: binary.int32(),
                    count: binary.int16(),
                    flag: binary.int16(),
                    tplNameOffset: binary.int32(),

                    format: null,
                    power: 0,
                };

                data.format = (data.flag & 0xF000) >>> 12;
                data.power = Math.pow(2, (data.flag & 0xF00) >>> 8);

                binary.seek(4);//pad ?

                return data;
            }

            function readUv(info){
                binary.setCurrent(start + info.offset);
                let uv = [];
                for(let i = 0; i < info.count; i++){
                   if (info.format === 2)
                       uv.push([binary.int8() / info.power, binary.int8() / info.power, 0]);
                   else if (info.format === 3)
                       uv.push([binary.int16() / info.power, binary.int16() / info.power, 0]);
                   else if (info.format === 4)
                       uv.push([binary.float32() / info.power, binary.float32() / info.power, 0]);
                   else
                       console.error(`Unsupported UV Format ${info.format}`)
                }

                return uv;
            }

            const uv1 = readUVInfo();
            const uv2 = readUVInfo();

            haveUV1 = uv1.count > 0;
            haveUV2 = uv2.count > 0;

            if (uv1.count){
                binary.setCurrent(start + uv1.offset);
                readUv(uv1).forEach((uv) => UV1_array.push(uv))
            }

            if (uv2.count){
                binary.setCurrent(start + uv2.offset);
                readUv(uv2).forEach((uv) => UV2_array.push(uv))
            }
        }

        {
            binary.setCurrent(start + faceMaterialOffset + 4);

            const indexOffset = binary.int32();
            const numIndex = binary.int16();

            binary.setCurrent(start + indexOffset);

            let formatInfos = {
                bone: 0,
                vertex: 0,
                normal: 0,
                color: 0,
                uv1: 0,
                uv2: 0,
            }

            for (let i = 0; i < numIndex; i++) {
                binary.seek(5);

                const boneId = binary.uInt8();
                const materialId = binary.int16();
                const dataOffset = binary.int32();
                binary.seek(4);

                const nextPosition = binary.current();

                if (i === 2) {
                    const parseFormatInfos = (matId) => ({
                        bone: matId & 0x3,
                        vertex: (matId & 0xC) >>> 2,
                        normal: (matId & 0x30) >>> 4,
                        color: (matId & 0xC0) >>> 6,
                        unk2: (matId & 0x300) >>> 8,
                        uv1: (matId & 0xC00) >>> 10,
                        uv2: (matId & 0x3000) >>> 12,
                        unk3: (matId & 0xC000) >>> 14,
                    });

                    formatInfos = parseFormatInfos(materialId);
                    if (formatInfos.bone > 0) haveSkin = true;
                }

                if (i > 1 && dataOffset) {
                    materialIdInfo.matID.push(i === 2 ? 0 : materialId);

                    binary.setCurrent(start + dataOffset);

                    const type = binary.uInt8(); // Expected value: 144
                    if (type !== 144) console.error("Parsing is invalid!");

                    const numFaces = binary.int16() / 3;
                    materialIdInfo.numface.push(numFaces);

                    const readFaceData = (format) => {
                        if (format === 0) return null;
                        if (format > 0 && format < 3) return binary.uInt8();
                        return binary.int16();
                    };

                    for (let m = 0; m < numFaces; m++) {
                        const idPack = [];
                        for (let j = 0; j < 3; j++) {
                            idPack.push({
                                skin: readFaceData(formatInfos.bone),
                                vertex: readFaceData(formatInfos.vertex),
                                normal: readFaceData(formatInfos.normal),
                                color: readFaceData(formatInfos.color),
                                unk2: readFaceData(formatInfos.unk2),
                                uv1: readFaceData(formatInfos.uv1),
                                uv2: readFaceData(formatInfos.uv2),
                                unk3: readFaceData(formatInfos.unk3),
                            });
                        }

                        data.faces.push([idPack[1].vertex, idPack[0].vertex, idPack[2].vertex]);

                        if (haveUV1)
                            UV1Face_array.push([idPack[1].uv1, idPack[0].uv1, idPack[2].uv1]);

                        if (haveUV2)
                            UV2Face_array.push([idPack[1].uv2, idPack[0].uv2, idPack[2].uv2]);

                        if (haveColor)
                            for (const vertexData of idPack)
                                data.colorPerVertex[vertexData.vertex] = oldColorPerVertex[vertexData.color];

                        if (haveSkin)
                            for (const vertexData of idPack)
                                addSkinWeight(vertexData.vertex, boneId, 1.0, true)
                    }
                }

                binary.setCurrent(nextPosition);
            }

            if (skinChunkOffset){
                haveSkin = true;

                binary.setCurrent(skinChunkOffset);
                const skinStart = binary.current();

                const skinHeaderCount = [
                    binary.int16(),
                    binary.int16(),
                    binary.int16()
                ];

                const skinOffset = [
                    binary.seek(2).int32() + skinStart,
                    binary.int32() + skinStart,
                    binary.int32() + skinStart,
                ];

                for (let i = 0; i < skinHeaderCount[0]; i++) {
                    binary.setCurrent( skinOffset[0] + i * 64 + 48);

                    let src_verts_offset = binary.int32();
                    let dst_verts_offset = binary.int32();

                    const boneId = binary.int16();
                    const numVertices = binary.int16();
                    const cache_line_offset = binary.int8();

                    src_verts_offset += skinStart;
                    dst_verts_offset += cache_line_offset;

                    //Set weights
                    for (let w = 0; w < numVertices; w++) {
                        const vert_idx = dst_verts_offset / 12 + w;
                        addSkinWeight(vert_idx, boneId, 1.0, true)
                    }
                }

                for (let i = 0; i < skinHeaderCount[1]; i++) {
                    binary.setCurrent( skinOffset[1] + i * 116 + 48 * 2);

                    let src_verts_offset = binary.int32();
                    let weights_offset = binary.int32();
                    let dst_verts_offset = binary.int32();

                    const boneId1 = binary.int16();
                    const boneId2 = binary.int16();

                    const numVertices = binary.int16();
                    const cache_line_offset = binary.int8()

                    src_verts_offset += skinStart
                    weights_offset += skinStart
                    dst_verts_offset += cache_line_offset

                    for (let w = 0; w < numVertices; w++) {
                        binary.setCurrent( weights_offset + w * 2);
                        const vert_idx = dst_verts_offset / 12 + w;

                        addSkinWeight(vert_idx, boneId1, binary.uInt8() / 256.0);
                        addSkinWeight(vert_idx, boneId2, binary.uInt8() / 256.0);
                    }
                }

                for (let i = 0; i < skinHeaderCount[2]; i++) {
                    binary.setCurrent( skinOffset[2] + i * 68 + 48);

                    let src_verts_offset = binary.int32();
                    let indices_offset = binary.int32();
                    binary.seek(4); //dst_verts_offset
                    let weights_offset = binary.int32();

                    const boneId = binary.int16();
                    const numVertices = binary.int16();

                    src_verts_offset += skinStart
                    indices_offset += skinStart
                    weights_offset += skinStart

                    for (let w = 0; w < numVertices; w++) {
                        binary.setCurrent( indices_offset + w * 2);
                        const vert_idx = binary.int16();

                        binary.setCurrent( weights_offset + w);

                        addSkinWeight(vert_idx, boneId, binary.uInt8() / 256.0);
                    }
                }

            }

            if (haveSkin){
                data.skinWeights.forEach((info) => {
                    if (info.boneIds.length === 0){
                        info.boneIds.push(0);
                        info.weights.push(1.0);
                    }
                });
            }

            if (haveNormal === false){
                data.faces.forEach((face) => {

                    const v0 = data.vertices[face.x];
                    const v1 = data.vertices[face.y];
                    const v2 = data.vertices[face.z];

                    const firstVec = new Vector3().subVectors(v1, v0);
                    const secondVec = new Vector3().subVectors(v2, v0);
                    const normal = new Vector3().crossVectors(firstVec, secondVec).normalize();

                    data.normals[face.x].add(normal);
                    data.normals[face.y].add(normal);
                    data.normals[face.z].add(normal);
                });

                data.normals.forEach( (normal) => {
                    normal.normalize()
                });
            }
        }


        /**
         * Remap Infos
         */

        const newData = {
            face: [],
            vertices: [],
            boneids_weights: [],
            normals: [],
            vcolors: [],
            uv1: [],
            uv2: [],
        }

        data.faces.forEach((face, fIndex) => {
           newData.face.push([0,0,0]);

           for(let i = 0; i < 3; i++){


               newData.face[fIndex][i] = fIndex * 3 + i;

               const vertId = face[i];

               newData.vertices.push( data.vertices[vertId] );
               newData.normals.push( data.normals[vertId] );

               if (haveColor)
                   newData.vcolors.push(data.colorPerVertex[vertId]);

               if (haveUV1)
                   newData.uv1.push(UV1_array[ UV1Face_array[fIndex][i] ]);

               if (haveUV2)
                   newData.uv2.push(UV2_array[ UV2Face_array[fIndex][i] ]);

               if (haveSkin)
                    newData.boneids_weights.push( data.skinWeights[vertId] );
           }
        });

        data.faces = [];
        newData.face.forEach(f => data.faces.push(f[0], f[1], f[2]) )

        let startFaceId = 0;
        for(let m = 0; m < materialIdInfo.matID.length; m++){
            const numFaces = materialIdInfo.numface[m] * 3;
            
            data.materialIds.push({
                'startFaceId': startFaceId,
                'materialID': materialIdInfo.matID[m],
                'faceCount': numFaces
            });

            startFaceId += numFaces;
        }

        data.vertices = newData.vertices;
        data.normals = newData.normals;
        if (haveColor) data.colorPerVertex = newData.vcolors;
        if (haveUV1) data.uv1 = newData.uv1;
        if (haveUV2) data.uv2 = newData.uv2;

        if (haveSkin){
            data.skinIndices = [];
            data.skinWeights = [];

            newData.boneids_weights.forEach(info => {
                data.skinIndices.push( new Vector4(info.boneIds[0],info.boneIds[1] || 0,info.boneIds[2] || 0,info.boneIds[3] || 0))
                data.skinWeights.push( new Vector4(info.weights[0],info.weights[1] || 0,info.weights[2] || 0,info.weights[3] || 0))
            })

            data.skinDataFlag = haveSkin;
        }

        return data;
    }

    /**
     *
     * @param {NBinary} binary
     * @param {int} start
     */
    parseObjectPsp(binary, start){

        let data = {
            materialOffset: binary.int32(),
            materialCount: binary.int32(),
            boneTransformOffset: binary.int32(),

            chunkSize: binary.seek(4).int32(),
            vertexElementType: binary.int32(),
            numMaterialID: binary.int32(),

            boundingSphereXYZ: binary.seek(4).consume(12, 'arraybuffer'),
            boundingSphereRadius: binary.float32(),

            scaleFactor: binary.vector3(binary.float32.bind(binary)),
            verticeCount: binary.int32(),
            translateFactor: binary.vector3(binary.float32.bind(binary)),

            headerSize: binary.seek(4).int32(),

            colorPerVertex: [],
            faces: [],
            vertices: [],
            materialIds: [],
            normals: [],
            skinIndices: [],
            skinWeights: [],
            uv1: [],
            uv2: []
        };

        binary.seek(12); //pad

        let startIndex = 0;
        let vertColorType = data.vertexElementType & 0xff;
        let weightFormat = (data.vertexElementType >> 9) & 3;
        let numWeights = ((data.vertexElementType >> 14) & 7) + 1;

        let perVertElementSize = (data.chunkSize - data.headerSize) / data.verticeCount;

        let startFace = 0;
        for (let i = 0; i < data.numMaterialID; i++) {
            let faceCount = 0;
            let vertexIndices = [];

            //skip bounding box (3*int16 + 2byte padding) * 2
            binary.seek(16);

            let vertexCount = binary.int16();
            let materialId = binary.int16();

            binary.seek(4);

            let boneIds = binary.single(8, binary.uInt8.bind(binary));

            let next = binary.current();
            binary.setCurrent(start + 16 + data.headerSize + startIndex * perVertElementSize);

            for (let j = 0; j < vertexCount; j++) {

                //skin + weight + indices
                {
                    if (weightFormat > 0) {

                        let weights = binary.single(numWeights, binary.uInt8.bind(binary), 128.0);

                        let weightBonePairs = weights.map((w, idx) => ({ weight: w, boneId: boneIds[idx] }));
                        weightBonePairs.sort((a, b) => b.weight - a.weight);

                        let topWeights = weightBonePairs.slice(0, 4);
                        let totalWeight = topWeights.reduce((sum, wb) => sum + wb.weight, 0);
                        topWeights.forEach(wb => wb.weight /= totalWeight);

                        data.skinWeights.push(new Vector4(
                            topWeights[0]?.weight || 0,
                            topWeights[1]?.weight || 0,
                            topWeights[2]?.weight || 0,
                            topWeights[3]?.weight || 0
                        ));

                        data.skinIndices.push(new Vector4(
                            topWeights[0]?.boneId || 0,
                            topWeights[1]?.boneId || 0,
                            topWeights[2]?.boneId || 0,
                            topWeights[3]?.boneId || 0
                        ));
                    }

                    data.skinDataFlag = weightFormat > 0;
                }

                //UV1
                {
                    data.uv1.push([binary.uInt8() / 128.0, (binary.uInt8() / 128.0), 0]);
                }

                //Color
                {
                    if (vertColorType === 0x35)
                        data.colorPerVertex.push(binary.colorRGB555(binary.uInt16.bind(binary)));
                    else if (vertColorType === 0x3d) {
                        binary.seek(2); //unk
                        data.colorPerVertex.push(binary.colorBGRA8888(binary.uInt8.bind(binary)));
                    }else{
                        data.colorPerVertex.push(new Color(0,0,0));
                        console.error(`[Model.MDL] Unsupported DFF Color Format ${vertColorType}`);
                    }
                }

                //Normal
                {
                    data.normals.push(binary.vector3(binary.int8.bind(binary), 128.0));
                    binary.seek(1);//ukn / padding?;
                }

                //vertices
                {
                    data.vertices.push(binary.vector3(binary.int16.bind(binary), 32768.0)
                        .multiply(data.scaleFactor)
                        .add(data.translateFactor)
                    );
                }

                //Faces
                {
                    vertexIndices.push(data.vertices.length - 1);

                    if (j >= 2) {
                        let a = vertexIndices[j - 2];
                        let b = vertexIndices[j - 1];
                        let c = vertexIndices[j];

                        if ((j % 2) === 0) data.faces.push(a, b, c);
                        else data.faces.push(b, a, c);

                        faceCount += 1;
                    }
                }
            }

            //material
            {
                data.materialIds.push({
                    'startFaceId': startFace * 3,
                    'materialID': materialId,
                    'faceCount': faceCount * 3 - 1
                });

                startFace += faceCount;
                startIndex += vertexCount;
            }

            binary.setCurrent(next);
        }

        return data;
    }

    /**
     *
     * @param {NBinary} binary
     */
    parseObjectMDL(binary) {

        let data = {
            materialOffset: binary.int32(),
            materialCount: binary.int32(),
            boneTransformOffset: binary.int32(), //BoneTransDataIndexOffset

            unknown: binary.float32(), // default 0, 1 for mirror.mdl todo value checks
            unknown2: binary.int32(),  // default 0, 1 for mirror.mdl

            modelChunkFlag: binary.seek(12).int32(), //skip padding
            modelChunkSize: binary.int32(),

            materialIdCount: binary.seek(4).int32(),
            faceCount: binary.int32(),

            boundingSphereXYZ: binary.vector3(binary.float32.bind(binary)),
            boundingSphereRadius: binary.float32(),
            boundingSphereScale: binary.vector3(binary.float32.bind(binary)),

            vertexCount: binary.int32(), //skip bb
            // vertexCount: binary.seek(28).int32(), //skip bb
            vertexElementSize: binary.seek(12).int32(), //skip const
            vertexElementType: binary.seek(44).int32(), //skip const

            faces: [],
            vertices: [],
            normals: [],
            colorPerVertex: [],
            uv1: [],
            uv2: [],
            skinIndices: [],
            skinWeights: []
        };

        binary.seek(32); //constant

        data.skinDataFlag = ((data.vertexElementType >> 8) & 0x10) === 0x10;
        data.materialIds = this.parseMaterialIds(binary, data.materialIdCount);

        for (let i = 0; i < data.faceCount; i++)
            data.faces.push(binary.int16());

        const hasSkinWeights = [0x115E, 0x125E].includes(data.vertexElementType);
        const uvSetCount = data.vertexElementType === 0x252 || data.vertexElementType === 0x125E ? 2 :
            data.vertexElementType === 0x152 || data.vertexElementType === 0x115E ? 1 : 0;

        for (let i = 0; i < data.vertexCount; i++) {

            data.vertices.push(binary.vector3(binary.float32.bind(binary)));

            // Skin Weights
            if (hasSkinWeights) {
                const weights = binary.single(4, binary.float32.bind(binary));
                const bones = binary.single(4, binary.uInt8.bind(binary));

                data.skinIndices.push(new Vector4(bones[3], bones[2], bones[1], bones[0]));
                data.skinWeights.push(new Vector4(weights[3], weights[2], weights[1], weights[0]));
            }

            data.normals.push(binary.vector3(binary.uInt16.bind(binary), 32768.0));
            binary.seek(2); //pad

            // Color
            data.colorPerVertex.push(binary.colorBGRA8888(binary.int8.bind(binary)));

            // UVs
            if (uvSetCount >= 1)
                data.uv1.push([binary.float32(), binary.float32(), 0]);

            if (uvSetCount === 2)
                data.uv2.push([binary.float32(), binary.float32(), 0]);
        }

        return data;
    }

    /**
     *
     * @param {NBinary} binary
     * @param {int} len
     * @return {{
     *     boundingBoxMin: Vector3,
     *     boundingBoxMax: Vector3,
     *     faceCount: int,
     *     materialID: int,
     *     startFaceId: int
     * }[]}
     */
    parseMaterialIds(binary, len ){
        let materials = [];

        for(let i = 0; i < len; i++){
            materials.push({
                boundingBox: {
                    min: binary.vector3(binary.float32.bind(binary)),
                    max: binary.vector3(binary.float32.bind(binary))
                },
                faceCount: binary.int16(),
                materialID: binary.int16(),
                startFaceId: binary.int16()
            });

            binary.seek(14);
        }

        return materials;
    }

    /**
     *
     * @param {NBinary} binary
     * @return {{rootEntryOffset, prevObjectInfoOffset, nextObjectInfoOffset, objectParentBoneOffset, objectOffset}}
     */
    parseObjectInfo(binary ){
        return {
            'nextObjectInfoOffset': binary.int32(),
            'prevObjectInfoOffset': binary.int32(),
            'objectParentBoneOffset': binary.int32(),
            'objectOffset': binary.int32(),
            'rootEntryOffset': binary.int32(),
        };
    }

    /**
     *
     * @param {NBinary} binary
     * @param {int} offset
     * @return {{offset, matrix4: Matrix4, animationDataIndex: boolean, children: boolean, matrix4Parent: (*|Matrix4), sibling: boolean, name: string}}
     */
    parseBone(binary, offset){
        binary.setCurrent(offset);

        const tag = binary.int32();
        const siblingOffset = binary.int32();
        const parentBoneOffset = binary.int32();
        const rootBoneOffset = binary.int32();
        const childrenOffset = binary.int32();
        const animationDataIndexOffset = binary.int32();

        const result = {
            tag,
            offset,
            parentBoneOffset,
            rootBoneOffset,
            name: binary.consume(40, 'nbinary').getString(0),
            matrix4: binary.matrix4(binary.float32.bind(binary)),
            matrix4Parent: binary.matrix4(binary.float32.bind(binary)),
            children: childrenOffset ? this.parseBone(binary, childrenOffset) : false,
            sibling: siblingOffset   ? this.parseBone(binary, siblingOffset)  : false,
            animationDataIndex: animationDataIndexOffset ? this.parseAnimationDataIndex(binary, animationDataIndexOffset) : false
        };


        return result;
    }

    /**
     *
     * @param {NBinary} binary
     * @param {int} offset
     * @return {{rootBoneOffset, zero, animationDataOffset, animationData: *[], boneTransform: *[], boneTransformOffset, numBone, unknown}}
     */
    parseAnimationDataIndex(binary, offset ){
        binary.setCurrent(offset);

        let i;
        let result = {
            'numBone': binary.int32(),
            'rootBoneOffset': binary.seek(4).int32(),
            'animationDataOffset': binary.int32(),
            'boneTransformOffset': binary.int32(),
            'animationData': [],
            'boneTransform': []
        };

        if (result.animationDataOffset !== 0){
            binary.setCurrent(result.animationDataOffset);

            for(i = 0; i < result.numBone ; i++){
                result.animationData.push({
                    'animationBoneId': binary.int16(),
                    'boneType': binary.int16(),
                    'boneOffset': binary.int32()
                });
            }
        }

        /**
         * The game use this matrix to build up the character
         */
        if (result.boneTransformOffset !== 0){
            binary.setCurrent(result.boneTransformOffset);
            for(i = 0; i < result.numBone; i++){
                result.boneTransform.push(
                    binary.matrix4(binary.float32.bind(binary))
                );

            }

        }

        return result;
    }

    /**
     *
     * @param {NBinary} binary
     * @return {{rootBoneOffset, firstObjectInfoOffset, lastObjectInfoOffset, objectInfoIndexOffset}}
     */
    parseEntry(binary){
        return {
            'rootBoneOffset': binary.int32(),
            'objectInfoIndexOffset': binary.seek(16).current(),
            'firstObjectInfoOffset': binary.int32(),
            'lastObjectInfoOffset': binary.int32()
        };
    }

    /**
     *
     * @param {NBinary} binary
     * @param props
     */
    async readClump(binary, props) {
        let parsedEntry = this.parseEntry(binary),
            objects = [],
            offset = parsedEntry.firstObjectInfoOffset;

        while (offset !== parsedEntry.objectInfoIndexOffset) {
            binary.setCurrent(offset);
            let objectInfo = this.parseObjectInfo(binary);

            let object = null;
            if (props.platform === "wii"){
                binary.setCurrent(objectInfo.objectOffset + 108);
                const meshOffset = binary.int32();
                binary.setCurrent(meshOffset + 12);
                const meshFlag = binary.int32();

                if (meshFlag === 1){
                    object = this.parseObject(binary, props, objectInfo.objectOffset);
                }

            }else{
                object = this.parseObject(binary, props, objectInfo.objectOffset);
            }

            if (object !== null){

                const boneTransformMatrices = [];
                if (object.boneTransformOffset){
                    binary.setCurrent(object.boneTransformOffset);
                    let boneCount = binary.int32();
                    let matrixOffset = binary.int32();
                    let zero1 = binary.int32();
                    let zero2 = binary.int32();

                    binary.setCurrent(matrixOffset);
                    for(let i = 0; i < boneCount; i++){
                        const boneTransformMatrix = binary.matrix4(binary.float32.bind(binary));
                        boneTransformMatrices.push(boneTransformMatrix);
                    }
                }

                objects.push({
                    objectInfo,
                    object,
                    boneTransformMatrices,
                    materials: object.materialOffset !== 0
                        ? (binary.setCurrent(object.materialOffset) && this.parseMaterial(binary, object.materialCount))
                        : null
                });
            }

            offset = objectInfo.nextObjectInfoOffset;
        }

        return this.createGenericModelStructure(
            this.parseBone(binary, parsedEntry.rootBoneOffset),
            objects,
            props
        );
    }

    /**
     *
     * @param {{}} parsedBone
     * @param objects
     * @param options
     * @return {{skeleton: Skeleton, objects: *[]}}
     */
    async createGenericModelStructure(parsedBone, objects, options){

        const skeleton = SkeletonHelper.createSkeleton(parsedBone, objects[0].boneTransformMatrices);

        //Set new Bone order and anim flag
        {
            const newBOrder = [];
            const animationBoneInfo = parsedBone?.children?.animationDataIndex?.animationData || null;
            if (animationBoneInfo !== null){
                animationBoneInfo.forEach((animBoneInfo) => {

                    const bone = skeleton.bones.find((b) => b.userData.offset === animBoneInfo.boneOffset);
                    if (bone === undefined) return;

                    bone.userData.boneId = animBoneInfo.animationBoneId;
                    newBOrder.push(bone);

                    if (bone.userData.boneId === 1000)
                        bone.userData.animFlag = true;
                })

                //todo, why ? why do i need to reorder this, should be fixed while building the MDL!!!!!
                // skeleton.bones = newBOrder;
            }
        }


        const pMap = {};
        skeleton.bones.forEach(bone => {
            console.log(bone.parent);
            pMap[bone.userData.name] = bone.parent ? bone.parent.name : null;
        });


console.log("MAPPPP", JSON.stringify(pMap));
        SkeletonHelper.useBoneIdAsName(skeleton.bones);

        //apply bone hierarchy order from ref skeleton
        if (options.applyBoneOrderFrom)
            SkeletonHelper.applyBoneOrderFrom(options.applyBoneOrderFrom, skeleton.bones);

        const skinning = objects[0].object.skinDataFlag || false;
        let objectIndex = 0;

        const group = new Group();


        group.userData.LODIndex = 0;
        for (const parsedObject of objects) {


            let meshBone = skeleton.bones.find((bone) => bone.userData.offset === parsedObject.objectInfo.objectParentBoneOffset)
            meshBone.userData.meshBoneIndex = objectIndex;

            const materials = await ModelHelper.getMaterial(parsedObject.materials, skinning);
            const {faces, faceVertexUvs} = ModelHelper.createFaces(
                parsedObject.object.faces,
                parsedObject.object.normals,
                parsedObject.object.colorPerVertex,
                parsedObject.object.uv1,
                parsedObject.object.uv2,
                ModelHelper.getFaceMaterialBySplit(parsedObject.object.materialIds)
            );

            const mesh = ModelHelper.getGeometry(
                parsedObject.object.vertices,
                materials,
                faces,
                faceVertexUvs,
                parsedObject.object.skinIndices,
                parsedObject.object.skinWeights,
                {
                    matrix: meshBone.matrix
                }
            );


            //tmp!!
            mesh.userData.ogObject = parsedObject;

            if (objectIndex === 0) {
                mesh.add(skeleton.bones[0]);
                mesh.bind(skeleton);
                group.add(mesh);
            }else{
                mesh.bind(skeleton);
                meshBone.add(mesh);
            }

            objectIndex++;
        }

        return group;
    }
}

export default new ModelMdl();