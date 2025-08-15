import FileHandlerAbstract from "./FileHandler.Abstract.mjs";
import Database from "../Database.mjs";
import Result from "../Result.mjs";
import MimeType from "../MimeType.mjs";

import {
    CubeGeometry,
    Geometry,
    Mesh,
    MeshBasicMaterial,
    Vector2,
    Vector3,
    VertexColors
} from "../../Vendor/three.module.mjs";

class Manhunt2MapBsp extends FileHandlerAbstract{
    tag = "BSP";
    
    /**
     * @type {Mesh}
     */
    sceneRootBoundBox;


    canHandle(binary, filePath){
        try {
            binary.setCurrent(80);
            let materialsOffset = binary.int32();
            binary.setCurrent(materialsOffset + 12);
            binary.setCurrent(binary.int32());

            const str = binary.getString(0, false);

            if (str.indexOf('PMLC') !== -1) return false; //MH2 MDL

            return str.length > 3 && str.length < 50;

        }catch(e){
            return false;
        }
    }


    process(binary, infos) {
        Database.add(
            new Result(MimeType.MAP, this, binary, infos.name, 0, binary.length(), {
                isScene3: infos.path.indexOf('scene3') !== -1
            }, infos.path)
        );
    }

    async decode(binary, options = {}, props = {}) {
        return this.parse(binary, props.isScene3);
    }


    /**
     *
     * @param binary {NBinary}
     * @param NodeOffset {int}
     */
    loadNode(binary, NodeOffset) {
        binary.setCurrent(NodeOffset);

        let CompareCoordIndex = binary.int32();

        if (CompareCoordIndex === -1) {

            binary.seek(4); //padding
            let NumFaces = binary.uInt32();
            let NumVerts = binary.uInt32();

            let MeshBoundingBox = [
                binary.readVector3(4, 'float32', true), //MIN
                binary.readVector3(4, 'float32', true) //MAX
            ];

            let VertsOffset = binary.uInt32();
            binary.int32(); //padding

            let PrelightOffset = binary.uInt32();
            binary.int32(); //padding

            let FacesOffset = binary.int32();

            binary.seek(4); //FacesGroupsOffset
            binary.seek(4); //GeometryOffset
            binary.seek(2); //ParentSectorIndex

            let MeshSize = new Vector3(
                (MeshBoundingBox[1].x - MeshBoundingBox[0].x),
                (MeshBoundingBox[1].y - MeshBoundingBox[0].y),
                (MeshBoundingBox[1].z - MeshBoundingBox[0].z)
            );

            let MeshPosition = new Vector3(
                ((MeshBoundingBox[1].x + MeshBoundingBox[0].x) / 2),
                ((MeshBoundingBox[1].y + MeshBoundingBox[0].y) / 2),
                ((MeshBoundingBox[1].z + MeshBoundingBox[0].z) / 2)
            );

            let ObjectBoundBox = new Mesh(
                new CubeGeometry(
                    MeshSize.x,
                    MeshSize.y,
                    MeshSize.z,
                ),
                new MeshBasicMaterial({
                    wireframe	: true,
                    color: 0xff11ff
                })
            );

            ObjectBoundBox.position.copy(MeshPosition);
            ObjectBoundBox.name = "bbox";

            this.sceneRootBoundBox.children.push(ObjectBoundBox);

            let ColVerts = [];
            let ColPrelight = [];
            let ColFaces = [];
            let materialForFace = [];
            let i;

            if (NumVerts !== 0) {

                binary.setCurrent(VertsOffset);

                for (i = 0; i < NumVerts; i++) {
                    let vec3 = binary.readVector3(4, 'float32', true);
                    ColVerts.push(vec3);
                }

                if (PrelightOffset !== 0) {
                    binary.setCurrent(PrelightOffset);

                    for (i = 0; i < NumVerts; i++) {
                        ColPrelight.push(binary.readColorRGBA());
                    }
                }
            }

            if (NumFaces !== 0) {
                binary.setCurrent(FacesOffset);

                for (i = 0; i < NumFaces; i++) {
                    let face3 = binary.readFace3(2, 'uint16');

                    if (ColPrelight.length !== 0) {
                        face3.vertexColors = [
                            ColPrelight[face3.a],
                            ColPrelight[face3.b],
                            ColPrelight[face3.c]
                        ];
                    }

                    ColFaces.push(face3);
                    materialForFace.push(binary.uInt16());
                }

                let geometry = new Geometry();
                geometry.faces = ColFaces;
                geometry.vertices = ColVerts;

                let ColObject = new Mesh(geometry, new MeshBasicMaterial({
                    vertexColors: VertexColors
                }));

                ColObject.position.y += 1;
                ColObject.position.x += 1;
                ColObject.position.z += 1;

                ColObject.name = "preligh";
                this.sceneRootBoundBox.children.push(ColObject);
            }

        } else {
            let IfTrueOffset = binary.uInt32();
            let IfFalseOffset = binary.uInt32();

            binary.seek(4 * 3); //compare vector3
            this.loadNode(binary, IfTrueOffset);
            this.loadNode(binary, IfFalseOffset);
        }
    }
    
    /**
     *
     * @param binary {NBinary}
     * @param SectorOffset {int}
     */
    loadSector(binary, SectorOffset) {
        binary.setCurrent(SectorOffset);

        binary.seek(4); //SectorIdent
        let NextSectorOffset = binary.uInt32();
        let SectorRenderTreeOffset = binary.uInt32();
        let SectorIndex = binary.uInt16();
        let NumAdjacentSectors = binary.uInt16();
        let AdjacentSectorsIndicesOffset = binary.uInt32();
        let AdjacentSectorsPortalsOffset = binary.uInt32();

        let AdjacentIDs = [];
        let i;
        if (NumAdjacentSectors !== 0) {
            binary.setCurrent(binary.current() + AdjacentSectorsIndicesOffset);

            for (i = 0; i < NumAdjacentSectors; i++) {
                AdjacentIDs[i] = binary.uInt8();
            }

            binary.setCurrent(AdjacentSectorsPortalsOffset);

            for (i = 0; i < NumAdjacentSectors; i++) {

                let PortalVerts = [];
                let PortalFaces = [];

                for (let v = 0; v < 4; v++) {

                    let vertex = binary.readVector3(4, 'float32', true, 2, 'int16');
                    PortalVerts.push(vertex);
                }

                PortalFaces.push([1, 2, 3]);
                PortalFaces.push([1, 3, 4]);

                let geometry = new Geometry();
                geometry.faces = PortalFaces;
                geometry.vertices = PortalVerts;

                let material = new MeshBasicMaterial({
                    wireframe	: true,
                    color: 0xff11ff
                });

                let mesh = new Mesh(geometry, material);
                mesh.name = "Portal " + SectorIndex + " to " + AdjacentIDs[i];
            }
        }

        this.loadNode(binary, SectorRenderTreeOffset);

        if (NextSectorOffset !== 0) this.loadSector(binary, NextSectorOffset);

    }

    /**
     * 
     * @param binary {NBinary}
     * @param isScene3 {boolean}
     * @returns {Mesh}
     */
    parse(binary, isScene3){
        binary.setCurrent(48); //skip header

        let sceneBBox = [
            binary.readVector3(4, 'float32', true), //MIN
            binary.readVector3(4, 'float32', true) //MAX
        ];

        let materialsOffset = binary.int32();
        let materialCount = binary.int32();
        let SectorListOffset = false;

        if (isScene3) {

            let sceneBBoxSize = new Vector3(
                (sceneBBox[1].x - sceneBBox[0].x),
                (sceneBBox[1].y - sceneBBox[0].y),
                (sceneBBox[1].z - sceneBBox[0].z)
            );

            let sceneBBoxPosition = new Vector3(
                ((sceneBBox[1].x + sceneBBox[0].x) / 2),
                ((sceneBBox[1].y + sceneBBox[0].y) / 2),
                ((sceneBBox[1].z + sceneBBox[0].z) / 2)
            );

            this.sceneRootBoundBox = new Mesh(
                new CubeGeometry(
                    sceneBBoxSize.x,
                    sceneBBoxSize.y,
                    sceneBBoxSize.z,
                ),
                new MeshBasicMaterial({
                    wireframe	: true
                })
            );
            this.sceneRootBoundBox.position.copy(sceneBBoxPosition);
            this.sceneRootBoundBox.name = 'scene3';

            SectorListOffset = binary.int32();
            this.loadSector(binary, SectorListOffset);

            return this.sceneRootBoundBox;
        }

        let material = [];
        for (let i = 0; i < materialCount; i++) {
            binary.setCurrent(materialsOffset + 12 * i);
            binary.setCurrent(binary.int32());

            material.push(binary.getString(0, false));
        }

        binary.setCurrent(16);
        let mainfat_offset = binary.int32();
        let mainfat_cnt = binary.int32();

        binary.setCurrent(88);

        let fat_cntr = 0;
        let geom_cntr = 0;
        let meshRoot = new Mesh();
        while (fat_cntr !== mainfat_cnt) {

            let geometry = new Geometry();

            binary.setCurrent(mainfat_offset + 4 * fat_cntr); //FAT_OFFSET
            binary.setCurrent(binary.int32()); //FAT_entry

            let Geom_offset = binary.int32();
            binary.setCurrent(Geom_offset);
            let GeomIdent = binary.int32();

            if (GeomIdent === 0x0045D454) {
                let normals = [];

                let materialForFace = [];
                // let materialBoundingForFace = [];

                geom_cntr += 1;

                binary.seek(4); //model_size
                binary.seek(4); //unknown (zero)

                let materials_count = binary.int32(); //numMatrialID
                let fce_count = binary.int32(); //numFaceIndex

                binary.seek(4 * 3); //boundingSphere
                binary.seek(4 ); //boundingSphereRadius
                binary.seek(4 * 3); //boundingSphereScale

                let vert_count = binary.int32(); //numVertex
                let verts_offset = Geom_offset + 148 + materials_count * 44 + fce_count * 2;
                let facesOffset = Geom_offset + 148 + materials_count * 44;

                for (let i = 0; i < materials_count; i++) {

                    binary.setCurrent(Geom_offset + 148 + i * 44);

                    binary.seek( 6 * 4); //mat_boundingBox 2x 3xfloat
                    //
                    // let mat_boundingBox = [
                    //     binary.readVector3(),
                    //     binary.readVector3()
                    // ];

                    let cur_mat_faces = binary.uInt16();
                    let cur_texture = binary.uInt16();
                    let cur_faces_skip = binary.uInt16();

                    cur_mat_faces = cur_mat_faces / 3;
                    cur_faces_skip = cur_faces_skip / 3;

                    for (let k = cur_faces_skip; k < (cur_faces_skip + cur_mat_faces); k++) {
                        materialForFace[k] = cur_texture;
                        // materialBoundingForFace[k] = [BoundingBoxMin, BoundingBoxMax];
                    }
                }

                binary.setCurrent(facesOffset);
                geometry.faces = binary.readFaces3(fce_count / 3, materialForFace);

                let uvArray = [];
                let cpvArray = [];
                binary.setCurrent(verts_offset);
                for (let i = 0; i < vert_count; i++) {

                    geometry.vertices.push(binary.readVector3());
                    normals.push(
                        binary
                            .readVector3(2, 'int16', true)
                            .divide(new Vector3(32768.0, 32768.0, 32768.0))
                    );
                    cpvArray.push(binary.readColorBGRADiv255());


                    uvArray.push([
                        binary.consume(4, 'float32'),
                        binary.consume(4, 'float32')
                    ]);

                    binary.setCurrent(binary.current() + 8);
                }

                let uvForFaces = [];
                geometry.faces.forEach(function (face, faceIndex) {

                    face.vertexNormals = [
                        normals[face.a],
                        normals[face.b],
                        normals[face.c]
                    ];

                    face.vertexColors = [
                        cpvArray[face.a],
                        cpvArray[face.b],
                        cpvArray[face.c]
                    ];

                    uvForFaces[faceIndex] = [
                        new Vector2(
                            uvArray[face.a][0],
                            uvArray[face.a][1]
                        ),
                        new Vector2(
                            uvArray[face.b][0],
                            uvArray[face.b][1]
                        ),
                        new Vector2(
                            uvArray[face.c][0],
                            uvArray[face.c][1]
                        )
                    ];
                });

                geometry.faceVertexUvs = [uvForFaces];
                geometry.uvsNeedUpdate = true;


                // geometry.computeBoundingSphere();
                // geometry.computeFaceNormals();
                // geometry.computeVertexNormals();

                let mesh = new Mesh(geometry, material);
                mesh.alphaTest = 0.5;
                mesh.colorsNeedUpdate = true;


                meshRoot.children.push(mesh);
            }

            fat_cntr += 1;
        }

        meshRoot.rotation.y = 270 * (Math.PI / 180); // convert vertical fov to radians

        return meshRoot;
    }
}

export default new Manhunt2MapBsp();