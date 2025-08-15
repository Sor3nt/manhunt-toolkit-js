import {
    Box3,
    BufferGeometry,
    DoubleSide,
    Face3,
    Geometry, Matrix4, Mesh,
    MeshBasicMaterial, Quaternion,
    SkinnedMesh,
    Vector2, Vector3
} from "../Vendor/three.module.mjs";
import Database from "../Layer0/Database.mjs";
import MimeType from "../Layer0/MimeType.mjs";
import {AnimationRetargeting} from "../Vendor/Retargeting.mjs";

class ModelHelper {

    /**
     *
     * @param {Face3} face
     * @param {float[]} normals
     */
    setVertexNormalByFace(face, normals){
        face.vertexNormals = [
            normals[face.a],
            normals[face.b],
            normals[face.c]
        ];
    }

    /**
     *
     * @param {Face3} face
     * @param {Color[]} colors
     */
    setVertexColorByFace(face, colors){
        // try{
            face.vertexColors[0] = colors[face.a].clone();
            face.vertexColors[1] = colors[face.b].clone();
            face.vertexColors[2] = colors[face.c].clone();
        //
        // }catch(e){
        //     console.log(colors, face.a);die;
        // }
    }

    /**
     *
     * @param {int[][]} uv
     * @param {Face3} face
     */
    getUv(uv, face){
        return [
            new Vector2(uv[face.a][0], uv[face.a][1]),
            new Vector2(uv[face.b][0], uv[face.b][1]),
            new Vector2(uv[face.c][0], uv[face.c][1]),
        ];
    }

    /**
     *
     * @param {int[]} faceIndex
     * @param {float[]} normals
     * @param {Color[]} color
     * @param {int[][]} uv1
     * @param {int[][]}uv2
     * @param {int[]} materialIds
     * @return {{faceVertexUvs: *[][], faces: *[]}}
     */
    createFaces(
        faceIndex,
        normals,
        color,
        uv1 = [],
        uv2= [],
        materialIds
    ){
        const faceVertexUvs = [[],[]];
        const faces = [];

        for(let x = 0; x < faceIndex.length; x++){
            let face = new Face3( faceIndex[x],  faceIndex[x + 1], faceIndex[x + 2] );
            face.materialIndex = materialIds[x];

            this.setVertexNormalByFace(face, normals);
            this.setVertexColorByFace(face, color);
            if(uv1.length > 0)
                faceVertexUvs[0].push(this.getUv(uv1, face));

            if(uv2.length > 0)
                faceVertexUvs[1].push(this.getUv(uv2, face));

            faces.push(face);
            x += 2;
        }
        return {faces, faceVertexUvs};
    }

    /**
     *
     * @param {{
     *     materialID: int,
     *     startFaceId: int,
     *     faceCount: int,
     * }[]} infos
     *
     * @return {int[]}
     */
    getFaceMaterialBySplit(infos){
        const faceMaterialId = [];

        infos.forEach((info) => {
            for(let i = info.startFaceId; i <= info.startFaceId + info.faceCount; i++){
                faceMaterialId[i] = info.materialID;
            }
        });

        return faceMaterialId;
    }

    /**
     *
     * @param {{
     *     color: Color|null,
     *     opacity: int|null,
     *     name: string
     * }[]} infos
     * @param {boolean} skinning
     */
    async getMaterial( infos, skinning ) {

        const result = [];

        for (const info of infos) {
            const localTexture = Database.findOneBy({
                type: MimeType.TEXTURE,
                name: info.name
            });

            const textureInfo = {
                name: info.name,
                // wireframe: true,
                skinning,
                side: DoubleSide
            };

            if (info.color)
                textureInfo.color = info.color;

            if (info.opacity) {
                textureInfo.opacity = info.opacity;
                textureInfo.transparent = true;
            }

            if (localTexture !== null)
                textureInfo.map = await localTexture.decode();

            result.push(new MeshBasicMaterial(textureInfo))
        }

        return result;
    }


    /**
     *
     * @param {Vector3[]} vertices
     * @param {MeshBasicMaterial[]} materials
     * @param {Face3[]} faces
     * @param {Vector2[][], Vector2[][]} faceVertexUvs
     * @param {Vector4[]} skinIndices
     * @param {Vector4[]} skinWeights
     * @param {Skeleton|null} skeleton
     * @param {{matrix:Matrix4}} infos
     * @return {SkinnedMesh}
     */
    getGeometry(
        vertices,
        materials,
        faces,
        faceVertexUvs,
        skinIndices = null,
        skinWeights = null,
        infos = {}
    ){

        let geometry = new Geometry();
        geometry.faceVertexUvs = faceVertexUvs;
        geometry.faces = faces;

        // vertices.forEach((vertex) => {
        //     if (infos.matrix) {
        //         const x = vertex.x, y = vertex.y, z = vertex.z;
        //         const e = infos.matrix.elements;
        //
        //         vertex.x = e[ 0 ] * x + e[ 1 ] * y + e[ 2 ] * z + e[ 3 ];
        //         vertex.y = e[ 4 ] * x + e[ 5 ] * y + e[ 6 ] * z + e[ 7 ];
        //         vertex.z = e[ 8 ] * x + e[ 9 ] * y + e[ 10 ] * z + e[ 11 ];
        //     }
        //
        //     geometry.vertices.push(vertex);
        // });

        vertices.forEach((vertex) => {

            const vec3 = vertex.clone();
            if (infos.matrix)
                vec3.applyMatrix4(infos.matrix);

            geometry.vertices.push(vec3);
        });

        if (skinIndices !== null && skinIndices.length){
            geometry.skinIndices = skinIndices;
            geometry.skinWeights = skinWeights;
        }

        let bufferGeometry = new BufferGeometry();
        bufferGeometry.fromGeometry( geometry );

        return new SkinnedMesh(bufferGeometry, materials);
    }


    getScaleFactor(modelA, modelB){
        const box2 = new Box3().setFromObject(modelA);
        const box1 = new Box3().setFromObject(modelB);

        const size1 = new Vector3();
        const size2 = new Vector3();

        return box2.getSize(size2).length() / box1.getSize(size1).length();
    }

}

export default new ModelHelper();