import {
    Bone, BufferAttribute, Float32BufferAttribute,
    Matrix4,
    Skeleton, SkinnedMesh, Vector3
} from "../Vendor/three.module.mjs";

class SkeletonHelper {

    /**
     *
     * @param {{}} boneInfo
     * @param {Matrix4[]} boneTransformMatrices
     * @return {Skeleton}
     */
    createSkeleton(boneInfo, boneTransformMatrices){

        /** @type {Bone[]} */
        const bones = [];
        this.createBones(boneInfo, bones);

        // bones.forEach((bone, index) => {
        //     bone.matrix = boneTransformMatrices[index];
        // })

        return new Skeleton(bones);
    }

    /**
     *
     * @param {{
     *     offset: int,
     *     name: string,
     *     id: int|null,
     *     matrix4: Matrix4|null,
     *     animationDataIndex: *|null,
     *     transform: Matrix4[]|null,
     *     children: *,
     *     sibling: *,
     *
     * }} boneInfo
     * @param {Bone[]} boneList
     */
    createBones( boneInfo, boneList ){
        let bones = [];

        const bone = this.createBone(boneInfo);
        boneList.push(bone);
        bones.push(bone);

        if (boneInfo.children !== false)
            this.createBones(boneInfo.children, boneList)
                .forEach((children) => bone.add(children) );

        if (boneInfo.sibling !== false)
            this.createBones(boneInfo.sibling, boneList)
                .forEach((children) => bones.push(children));

        return bones;
    }

    /**
     * @deprecated
     * @param {Bone[]} bones
     * @param {int} meshBoneOffset
     * @return {Bone|null}
     */
    defineMeshBone( bones, meshBoneOffset ){
        const meshBone = bones.find((bone) => bone.userData.offset === meshBoneOffset)
        if (meshBone)
            meshBone.userData.meshBone = true;

        return meshBone || null;
    }

    /**
     *
     * @param {{
     *     offset: int,
     *     name: string,
     *     boneId: int|null,
     *     matrix4: Matrix4|null,
     *     transform: Matrix4[]|null,
     * }} boneInfo
     */
    createBone( boneInfo ){
        let bone = new Bone();
        bone.name = boneInfo.name;
        bone.userData.name = boneInfo.name;
        bone.userData.tag = boneInfo.tag;

        //todo, should not be set here
        if(boneInfo.offset)
            bone.userData.offset = boneInfo.offset;

        //we copy over the transform data, used for rebuild
        //todo, should not be set here
        // if (boneInfo.transform !== null && bone.userData.animFlag && boneInfo.animationDataIndex)
        //     bone.userData.transform = boneInfo.animationDataIndex.boneTransform;
        //


        if (boneInfo.matrix4) {
            bone.userData.originalMatrix = {
                local: boneInfo.matrix4.clone(),
                world: boneInfo.matrix4Parent.clone()
            };

            bone.applyMatrix4(boneInfo.matrix4);
        }

        return bone;
    }

    /**
     *
     * @param {Bone[]} bones
     */
    useBoneIdAsName(bones){
        bones.forEach((bone) => {
            if (bone.userData.boneId !== -1) {
                bone.name = `bone_${bone.userData.boneId}`;
            }
        });
    }

    /**
     *
     * @param {Bone[]} sourceBones
     * @param {Bone[]} targetBones
     */
    getMissedBones(sourceBones, targetBones){

        const missed = [];
        sourceBones.forEach((sBone, index) => {
            if (index === 0) return;

            const tBone = targetBones.find((b) => b.userData.boneId === sBone.userData.boneId)
            if (tBone === undefined)
                missed.push(sBone);
        })

        return missed;
    }

    applyMissedBones(sSkeleton, tSkeleton){

        let tRoot = tSkeleton.getBoneByName("bone_1000").parent;

        tRoot.name = "0";
        tRoot.userData.name = "0";
        tRoot.userData.boneId = -1;
        const sL0Bone = sSkeleton.bones.find((b) => b.name.indexOf("_L0") !== -1);

        if (sL0Bone)
            this.copyBoneTo(sL0Bone.name, sSkeleton, tSkeleton);

        //todo...
        // const missedBones = this.getMissedBones(sSkeleton.bones, tSkeleton.bones);
        // console.log("MMM", missedBones)
        // missedBones.forEach((bone) => {
        //     this.copyBoneTo(bone.name, sSkeleton, tSkeleton);
        // });
        {

            this.copyBoneTo('weapstrap', sSkeleton, tSkeleton);
            this.copyBoneTo('bone_5', sSkeleton, tSkeleton);
            this.copyBoneTo('bone_3333', sSkeleton, tSkeleton);
            this.copyBoneTo('bone_7777', sSkeleton, tSkeleton);
            this.copyBoneTo('bone_8888', sSkeleton, tSkeleton);
            this.copyBoneTo('LurebagEmpty_(CT)', sSkeleton, tSkeleton);

        }

    }

    /**
     *
     * @param {Skeleton} sSkeleton
     * @param {Skeleton} tSkeleton
     */
    applyMissedBones_(sSkeleton, tSkeleton){

        //hm maybe not the right place here
        tSkeleton.bones[0].userData.isRoot = true;
        sSkeleton.bones[0].userData.isRoot = true;

        const missedBones = this.getMissedBones(sSkeleton.bones, tSkeleton.bones);

        missedBones.forEach((bone) => {
            this.copyBoneTo(bone.name, sSkeleton, tSkeleton);
        });
    }

    /**
     *
     * @param {SkinnedMesh} sMesh
     * @param {SkinnedMesh} tMesh
     */
//     removeUnwantedBones(sMesh, tMesh){
//         const unwantedBones = this.getMissedBones(tMesh.children[0].skeleton.bones, sMesh.children[0].skeleton.bones);
//         unwantedBones.forEach((bone) => {
//             // this.removeBoneFromModel(bone, tMesh.children[0])
//         })
// // console.error(unwantedBones);
// // die;
//     }

    // removeBoneFromModel(bone, skinnedMesh) {
    //     const skeleton = skinnedMesh.skeleton;
    //     const bones = skeleton.bones;
    //     const boneIndex = bones.indexOf(bone);
    //
    //     if (boneIndex === -1) {
    //         console.warn('Der Knochen wurde im Skelett nicht gefunden.');
    //         return;
    //     }
    //
    //     // Entferne den Knochen aus dem Skelett
    //     bones.splice(boneIndex, 1);
    //     skeleton.boneInverses.splice(boneIndex, 1);
    //
    //     // Aktualisiere die skinIndex- und skinWeight-Attribute
    //     const geometry = skinnedMesh.geometry;
    //     const skinIndices = geometry.attributes.skinIndex;
    //     const skinWeights = geometry.attributes.skinWeight;
    //
    //     for (let i = 0; i < skinIndices.count; i++) {
    //         let indices = [
    //             skinIndices.getX(i),
    //             skinIndices.getY(i),
    //             skinIndices.getZ(i),
    //             skinIndices.getW(i)
    //         ];
    //         let weights = [
    //             skinWeights.getX(i),
    //             skinWeights.getY(i),
    //             skinWeights.getZ(i),
    //             skinWeights.getW(i)
    //         ];
    //
    //         // Entferne den Knochen aus den Indizes und Gewichten
    //         let newIndices = [];
    //         let newWeights = [];
    //
    //         for (let j = 0; j < 4; j++) {
    //             if (indices[j] === boneIndex) {
    //                 // Überspringe den Eintrag für den entfernten Knochen
    //                 continue;
    //             } else {
    //                 // Passe den Index an, falls nötig
    //                 let adjustedIndex = indices[j] > boneIndex ? indices[j] - 1 : indices[j];
    //                 newIndices.push(adjustedIndex);
    //                 newWeights.push(weights[j]);
    //             }
    //         }
    //
    //         // Fülle die Arrays auf, um 4 Elemente zu haben
    //         while (newIndices.length < 4) {
    //             newIndices.push(0);
    //             newWeights.push(0);
    //         }
    //
    //         // Normalisiere die Gewichte, falls die Summe nicht 1 ist
    //         const weightSum = newWeights.reduce((sum, weight) => sum + weight, 0);
    //         if (weightSum > 0) {
    //             newWeights = newWeights.map(weight => weight / weightSum);
    //         }
    //
    //         // Aktualisiere die Attribute
    //         skinIndices.setXYZW(i, newIndices[0], newIndices[1], newIndices[2], newIndices[3]);
    //         skinWeights.setXYZW(i, newWeights[0], newWeights[1], newWeights[2], newWeights[3]);
    //     }
    //
    //     skinIndices.needsUpdate = true;
    //     skinWeights.needsUpdate = true;
    //
    //     // Entferne den Knochen aus der Szene, falls erforderlich
    //     if (bone.parent) {
    //         bone.parent.remove(bone);
    //     }
    //
    //     // Aktualisiere das Skelett des SkinnedMesh
    //     skinnedMesh.skeleton = new Skeleton(bones);
    //     skinnedMesh.bind(skinnedMesh.skeleton);
    // }


    /**
     * Kopiert einen Bone aus dem sourceSkeleton in das targetSkeleton und passt dabei,
     * falls ein SkinnedMesh als Child vorliegt, die Skin-Indizes (über die Bone-IDs) an.
     *
     * @param {string} name - Name des zu kopierenden Bones
     * @param {Skeleton} sourceSkeleton - Quell-Skeleton (Referenz)
     * @param {Skeleton} targetSkeleton - Ziel-Skeleton, in das der Bone kopiert wird
     * @param {string} [newName=null] - Optional: Neuer Name für den kopierten Bone
     * @returns {Bone|null} - Der kopierte Bone oder null, wenn etwas schief läuft
     */
    copyBoneTo(name, sourceSkeleton, targetSkeleton, newName = null) {
        // Hole den Bone aus dem Quell-Skeleton
        const sBone = sourceSkeleton.getBoneByName(name);
        if (sBone === undefined) {
            console.log(`Unable to clone Bone ${name}. The Bone was not found in the source skeleton.`);
            return null;
        }

        // Vermeide Duplikate: Falls ein Bone mit passendem Namen oder _L0 bereits im Ziel vorhanden ist, abbrechen
        if (name.indexOf("_L0") !== -1 && targetSkeleton.bones.find((b) => b.userData.name.indexOf("_L0") !== -1) !== undefined) {
            return null;
        } else if (targetSkeleton.bones.find((b) => b.userData.name === name) !== undefined) {
            return null;
        }

        // Bestimme den Parent im Ziel-Skeleton
        let tParent;
        if (sBone.parent.userData.isRoot) {
            tParent = targetSkeleton.bones[0];
        } else {
            tParent = targetSkeleton.bones.find(b => b.userData.boneId === sBone.parent.userData.boneId);
        }
        if (tParent === undefined) {
            console.log(`Unable to clone Bone ${name}. The parent Bone was not found in the target skeleton.`);
            return null;
        }

        // Klone den Bone
        const tBone = sBone.clone();

        let tMesh = null;
        // Falls der Bone einen SkinnedMesh als Child hat, diesen ebenfalls klonen und die Skin-Attribute anpassen
        if (sBone.children.length && sBone.children[0] instanceof SkinnedMesh) {
            tMesh = sBone.children[0].clone();
            // Klone die Geometrie, damit Änderungen nicht das Original beeinflussen
            tMesh.geometry = tMesh.geometry.clone();

            // Aktualisiere die Skin-Indizes, sodass sie den Bone-IDs im targetSkeleton entsprechen
            const geometry = tMesh.geometry;
            if (geometry.attributes.skinIndex) {
                const skinIndexArray = geometry.attributes.skinIndex.array;
                for (let i = 0; i < skinIndexArray.length; i++) {
                    const oldIndex = skinIndexArray[i];
                    // Hole den entsprechenden Bone aus dem sourceSkeleton (sicherstellen, dass der Index gültig ist)
                    const sourceBone = sourceSkeleton.bones[oldIndex];
                    if (sourceBone) {
                        // Suche im targetSkeleton den Bone mit der gleichen Bone-ID
                        const targetIndex = targetSkeleton.bones.findIndex(b => b.userData.boneId === sourceBone.userData.boneId);
                        skinIndexArray[i] = (targetIndex !== -1) ? targetIndex : 0;
                    } else {
                        skinIndexArray[i] = 0;
                    }
                }
                geometry.attributes.skinIndex.needsUpdate = true;
            }
            // Setze auch den needsUpdate-Flag für die Skin-Weights, falls vorhanden
            if (geometry.attributes.skinWeight) {
                geometry.attributes.skinWeight.needsUpdate = true;
            }
            // Hänge den geklonten SkinnedMesh als Child an den geklonten Bone
            tBone.children = [tMesh];
        } else {
            tBone.userData.meshBoneIndex = undefined;
        }

        // Optional: Ändere den Namen, falls newName übergeben wurde
        if (newName) {
            tBone.name = tBone.userData.name = newName;
        }

        // Füge den geklonten Bone in die Hierarchie des Ziel-Skeletons ein
        tParent.add(tBone);

        // Durchlaufe den neu hinzugefügten Bone (inklusive seiner Kinder) und füge alle Bones zum targetSkeleton.bones-Array hinzu
        tBone.traverse(function(child) {
            if (child instanceof Bone) {
                targetSkeleton.bones.push(child);
            }
        });

        // Falls ein SkinnedMesh geklont wurde, binde ihn an das targetSkeleton
        if (tMesh) {
            tMesh.bind(targetSkeleton);
        }

        return tBone;
    }


    /**
     *
     * @param {string} name
     * @param {Skeleton} sourceSkeleton
     * @param {Skeleton} targetSkeleton
     * @param {string} newName
     */
    copyBoneTo_(name, sourceSkeleton, targetSkeleton, newName = null) {
        const sBone = sourceSkeleton.getBoneByName(name);
        if (sBone === undefined){
            console.log(`Unable to clone Bone ${name}. The Bone was not found in the source skeleton `);
            return null;
        }

        if (name.indexOf("_L0") !== -1 && targetSkeleton.bones.find((b) => b.userData.name.indexOf("_L0") !== -1) !== undefined){
            return null;

        }else if (targetSkeleton.bones.find((b) => b.userData.name === name) !== undefined)
            return null;

        let tParent;
        if (sBone.parent.userData.isRoot){
            tParent = targetSkeleton.bones[0];

        }else{
            tParent = targetSkeleton.bones.find(b => b.userData.boneId === sBone.parent.userData.boneId);
        }

        if (tParent === undefined){
            console.log(`Unable to clone Bone ${name}. The parent Bone was not found in the target skeleton`);
            return null;
        }

        const tBone = sBone.clone();

        let tMesh = null;
        if (sBone.children.length && sBone.children[0] instanceof SkinnedMesh) {
            tMesh = sBone.children[0].clone();
            tBone.children = [tMesh];
            tMesh.geometry = tMesh.geometry.clone();
            const skinIndexArray = tMesh.geometry.attributes.skinIndex.array;
            skinIndexArray.forEach((val, i) => {
                skinIndexArray[i] = targetSkeleton.bones.findIndex(b => b.userData.boneId === sourceSkeleton.bones[val].userData.boneId);
            });
        }else{
            tBone.userData.meshBoneIndex = undefined;
        }

        if (newName)
            tBone.name = tBone.userData.name = newName;

        tParent.add(tBone);

        // targetSkeleton.bones.push(tBone);
        //
        tBone.traverse( function(child) {
            if (child instanceof Bone) {
                targetSkeleton.bones.push(child);
            }
        });

        tMesh && tMesh.bind(targetSkeleton)
    }


    // updateSkinIndex

    /**
     * Copy bone hierarchy
     *
     * @param {Bone[]} sourceBones
     * @param {Bone[]} targetBones
     */
    applyBoneOrderFrom__(sourceBones, targetBones){
        sourceBones.forEach((sBone, index) => {

            if (sBone.userData.boneId === 1000) return;
            // if (sBone.userData.boneId === -1) return;

            const tBone = targetBones.find((b) => b.userData.boneId === sBone.userData.boneId) || null;
            if (tBone === null) return;

            if (sBone.parent?.type === "Bone" ){
                if (sBone.parent.userData.boneId !== tBone.parent?.userData?.boneId){
                    const realParentBone = targetBones.find((b) => b.userData.boneId === sBone.parent.userData.boneId) || null;
                    if (realParentBone !== null && realParentBone !== tBone) {
                        realParentBone.attach(tBone);

                    }
                }
            }
        });
    }

    findBoneByName(name, targetBones){

        let targetBone = null;
        //regular bone
        if (name.indexOf('bone_') !== -1){
            targetBone = targetBones.find( targetBone => targetBone.name === name);
        }

        //Danny_Broken_Cutscene_L0
        else if (name.indexOf('_L0') !== -1){
            targetBone = targetBones.find( targetBone => targetBone.name.indexOf('_L0') !== -1);
        }

        else if (name === "LurebagEmpty_(CT)" || name === "weapstrap"){
            targetBone = targetBones.find( targetBone => targetBone.name === name);
        }

        //TODO
        else if (name === "Danny_Broken_Cutscene" ){
            targetBone = targetBones.find( targetBone => targetBone.name === "Danny_Ingame-DAsy");
        }

        else{
            console.log("unknown case", typeof name);
            die;
        }

        return targetBone ?? null;
    }

    applyBoneOrderFrom(sourceBones, targetBones){

        // 1094

        var bone = targetBones.find(bone => bone.name === 'bone_1094')
        var boneParent = targetBones.find(bone => bone.name === 'bone_1045')
        boneParent.attach(bone);

        bone = targetBones.find(bone => bone.name === 'bone_1003')
        boneParent = targetBones.find(bone => bone.name === 'bone_1096')
        boneParent.attach(bone);

        bone = targetBones.find(bone => bone.name === 'bone_3333')
        boneParent = targetBones.find(bone => bone.name === 'bone_1096')
        boneParent.attach(bone);

        bone = targetBones.find(bone => bone.name === 'bone_1039')
        boneParent = targetBones.find(bone => bone.name === 'bone_1003')
        boneParent.attach(bone);

        bone = targetBones.find(bone => bone.name === 'bone_1023')
        boneParent = targetBones.find(bone => bone.name === 'bone_1045')
        boneParent.attach(bone);

        bone = targetBones.find(bone => bone.name === 'bone_1077')
        boneParent = targetBones.find(bone => bone.name === 'bone_1045')
        boneParent.attach(bone);
        //
        // bone = targetBones.find(bone => bone.name === 'bone_4444')
        // boneParent = targetBones.find(bone => bone.name === 'bone_1000')
        // boneParent.attach(bone);
        //
        // bone = targetBones.find(bone => bone.name === 'bone_5555')
        // boneParent = targetBones.find(bone => bone.name === 'bone_1000')
        // boneParent.attach(bone);
        //
        // bone = targetBones.find(bone => bone.name === 'bone_6666')
        // boneParent = targetBones.find(bone => bone.name === 'bone_1000')
        // boneParent.attach(bone);


        return;




        function mapBones(bone, list, parentBone = null) {
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
                result.children = mapBones(childBones[0], list, bone);

                let previousSibling = result.children;
                for (let i = 1; i < childBones.length; i++) {
                    const siblingBone = childBones[i];
                    previousSibling.sibling = mapBones(siblingBone, list, bone);
                    previousSibling = previousSibling.sibling;
                }
            }

            return result;
        }

        let sourceList = [];
        mapBones(sourceBones[0], sourceList);
        sourceList = sourceList.map( entry => entry.bone)

        let mappedBones = [];

        sourceList.forEach((sourceBone) => {
            let targetBone = this.findBoneByName(sourceBone.name, targetBones);

            if (targetBone === null){
                console.log("target not found ", sourceBone.name)

            }

            else if (sourceBone.parent !== null && sourceBone.parent.type === "Bone"){
                let targetParentBone = this.findBoneByName(sourceBone.parent.name, targetBones);
                if (targetParentBone){

                    console.log('move', targetBone.name, 'old parent', targetBone.parent.name, 'new parent', targetParentBone.name )
                    targetParentBone.attach(targetBone);
                    mappedBones.push(targetBone)
                }else{
                    console.log("parent target not found ", sourceBone.parent.name)
                }

            }

        });


        targetBones.forEach(( targetBone) => {
            if (mappedBones.indexOf(targetBone) !== -1)
                return;

            if (targetBone.parent !== null){
                targetBone.parent.attach(targetBone)
            }
        })



        //
        // sourceBones.forEach((sourceBone) => {
        //     let targetBone = this.findBoneByName(sourceBone.name, targetBones);
        //
        //     if (targetBone === null){
        //         console.log("target not found ", sourceBone.name)
        //
        //     }
        //
        //     else if (sourceBone.parent !== null && sourceBone.parent.type === "Bone"){
        //         let targetParentBone = this.findBoneByName(sourceBone.parent.name, targetBones);
        //         if (targetParentBone){
        //             console.log(targetParentBone.name, "=>", targetBone.name)
        //             targetParentBone.attach(targetBone);
        //         }else{
        //             console.log("parent target not found ", sourceBone.parent.name)
        //         }
        //
        //     // }else{
        //     //     console.log("hmm parent is null", sourceBone, )
        //     }
        //
        //
        //
        //
        // });
    }


    applyBoneOrderFrom_(sourceBones, targetBones, targetSkinnedMesh) {
        // Neues Array für die neu sortierten Bones
        const newTargetBones = [];
        // Mapping: alter Index (im originalen targetBones-Array) -> neuer Index (im newTargetBones-Array)
        const boneMapping = {};

        // Gehe über die sourceBones und reordne targetBones entsprechend
        sourceBones.forEach(sBone => {
            // Überspringe Bones, die z. B. als "Dummy" gekennzeichnet sind (boneId === 1000)
            if (sBone.userData.boneId === 1000) return;

            // Finde im targetBones den Bone mit derselben boneId
            const tBone = targetBones.find(b => b.userData.boneId === sBone.userData.boneId) || null;
            if (tBone === null) return;

            // Überprüfe, ob die Parent-Beziehung angepasst werden muss:
            if (sBone.parent?.type === "Bone") {
                // Falls der Parent des sBone nicht mit dem aktuellen Parent des tBone übereinstimmt,
                // suche den richtigen Parent im targetBones-Array und hänge tBone an diesen an.
                if (sBone.parent.userData.boneId !== tBone.parent?.userData?.boneId) {
                    const realParentBone = targetBones.find(b => b.userData.boneId === sBone.parent.userData.boneId) || null;
                    if (realParentBone !== null && realParentBone !== tBone) {
                        realParentBone.attach(tBone);
                    }
                }
            }
            // Füge den gefundenen Bone in die neue Reihenfolge ein, sofern er noch nicht vorhanden ist.
            if (!newTargetBones.includes(tBone)) {
                newTargetBones.push(tBone);
            }
        });

        // Erstelle das Mapping: Für jeden Bone im originalen targetBones-Array wird
        // sein neuer Index (sofern vorhanden) in newTargetBones festgelegt.
        targetBones.forEach((tBone, oldIndex) => {
            const newIndex = newTargetBones.indexOf(tBone);
            boneMapping[oldIndex] = (newIndex !== -1) ? newIndex : -1;
        });

        // --- Aktualisieren der skinIndices und skinWeights in der Geometrie ---
        const geometry = targetSkinnedMesh.geometry;
        const skinIndexAttr = geometry.attributes.skinIndex;
        const skinWeightAttr = geometry.attributes.skinWeight;
        const skinIndices = skinIndexAttr.array;
        const skinWeights = skinWeightAttr.array;
        const vectorSize = skinIndexAttr.itemSize; // typischerweise 4

        for (let i = 0; i < skinIndices.length; i += vectorSize) {
            let totalWeight = 0;
            for (let j = 0; j < vectorSize; j++) {
                const oldBoneIndex = skinIndices[i + j];
                const newBoneIndex = boneMapping[oldBoneIndex];
                if (newBoneIndex === undefined || newBoneIndex === -1) {
                    // Ist der Bone nicht in der neuen Reihenfolge enthalten, entferne den Einfluss:
                    skinIndices[i + j] = 0; // Standardindex (z. B. für einen Default-Bone)
                    skinWeights[i + j] = 0;
                } else {
                    skinIndices[i + j] = newBoneIndex;
                    totalWeight += skinWeights[i + j];
                }
            }
            // Normalisiere die Gewichte, sofern ein Einfluss vorhanden ist
            if (totalWeight > 0) {
                for (let j = 0; j < vectorSize; j++) {
                    skinWeights[i + j] /= totalWeight;
                }
            }
        }
        skinIndexAttr.needsUpdate = true;
        skinWeightAttr.needsUpdate = true;

        // --- Erstelle ein neues Skeleton basierend auf der neuen Bone-Reihenfolge ---
        const oldSkeleton = targetSkinnedMesh.skeleton;
        const newBoneInverses = newTargetBones.map(bone => {
            const oldIndex = oldSkeleton.bones.indexOf(bone);
            return (oldIndex !== -1) ? oldSkeleton.boneInverses[oldIndex] : new Matrix4();
        });
        const newSkeleton = new Skeleton(newTargetBones, newBoneInverses);
        targetSkinnedMesh.bind(newSkeleton, targetSkinnedMesh.matrixWorld);
    }





    applyHeadBones(sourceBones, targetBones){
        let sourceHeadBone = sourceBones.find((b) => b.userData.boneId === 1001);
        let targetHeadBone = targetBones.find((b) => b.userData.boneId === 1001);

        sourceHeadBone.children.forEach((child) => {
            targetHeadBone.attach(child.clone());
        });
    }

    /**
     *
     * @param {Skeleton} skeleton
     * @param {string|undefined} text
     * @return {string}
     */
    logSkeletonHierarchy(skeleton, text = "") {
        const rootBones = skeleton.bones.filter((bone) => {
            return !(bone.parent instanceof Bone);
        });

        rootBones.forEach((rootBone) => {
            logBoneHierarchy(rootBone, '');
        });

        function logBoneHierarchy(bone, prefix) {
            text += prefix + bone.name + ',' + bone.userData.name  + "\n";

            bone.children.forEach((child) => {
                if (child instanceof Bone) {
                    logBoneHierarchy(child, prefix + ',');
                }
            });
        }

        return text;
    }

    /**
     *
     * @param {Bone[]} sBones
     * @param {Bone[]} tBones
     */
    nameBonesBasedOnLocalPosition(sBones, tBones) {
//
//
//         /**
//          *
//          * @param {Bone} boneA
//          * @param {Bone} boneB
//          */
//         function getDistance(boneA, boneB){
//
//             boneA.updateWorldMatrix(true, false);
//             boneB.updateWorldMatrix(true, false);
//
//             const position1 = new Vector3();
//             const position2 = new Vector3();
//
//             boneA.getWorldPosition(position1);
//             boneB.getWorldPosition(position2);
//
//             let x = position1.x > position2.x ? position1.x - position2.x : position2.x - position1.x
//             let y = position1.y > position2.y ? position1.y - position2.y : position2.y - position1.y
//
//             return x + y;
//             //
//             // return Math.abs(boneA.position.x - boneB.position.x ) + Math.abs(boneA.position.y - boneB.position.y )
//             //
//             // boneA.updateWorldMatrix(true, false);
//             // boneB.updateWorldMatrix(true, false);
//             //
//             // const position1 = new Vector3();
//             // const position2 = new Vector3();
//             //
//             // boneA.getWorldPosition(position1);
//             // boneB.getWorldPosition(position2);
//             //
//             // return position1.distanceTo(position2);
//         }
//
//         tBones.forEach((tBone) => {
//
//             let distance = Infinity;
//             let closestBone = null;
//             sBones.forEach((sBone) => {
//                 const sToT = getDistance(tBone, sBone);
//                 if (sToT < distance){
//                     distance = sToT;
//                     closestBone = sBone;
//                 }
//
//             });
//
//             tBone.name = closestBone.name;
//             tBone.userData.name = closestBone.userData.name;
//             tBone.userData.boneId = closestBone.userData.boneId;
//
//
//             // console.log(closestBone.name)
//
//         })
//         return;
// die;
//


        const rootBoneA = sBones[0];
        const rootBoneB = tBones[0];

        // Erstelle eine Liste der Bones in skeletonA mit ihren lokalen Positionen
        const bonesA = sBones.map(boneA => {
            const positionA = this.getBonePositionRelativeToRoot(boneA, rootBoneA);
            return { bone: boneA, position: positionA };
        });


        const assignedNames = new Set();

        tBones.forEach(boneB => {
            const positionB = this.getBonePositionRelativeToRoot(boneB, rootBoneB);

            let closestBone = null;
            let minDistance = Infinity;

            bonesA.forEach(({ bone, position }) => {
                if (assignedNames.has(bone.userData.name)) return;

                if (
                    bone.userData.name === "LurebagEmpty_(CT)" ||
                    bone.userData.name === "weapstrap" ||
                    bone.userData.name === "Back_Weapon_Slot" ||
                    bone.userData.name === "STRAP2" ||
                    bone.userData.name === "STRAP1"
                ) return;


                const distance = position.distanceTo(positionB);

                if (distance < minDistance) {
                    minDistance = distance;
                    closestBone = bone;
                }
            });

            // if (minDistance > 0.2)
            //     closestBone = undefined;


            if (closestBone) {

                // if (closestBone.userData.boneId === 1002){
                //     console.warn(closestBone, boneB);
                //     die;
                // }

                //
                // if (
                //     boneB.name === "bone_29"
                //     &&
                //     closestBone.name === "bone_1045"
                //
                // ){
                //     die;
                // }

                // SkeletonHelper.setBoneColorByBoneName('bone_1045', refModel.children[0], new Color(0xff0000))


                boneB.name = closestBone.name;
                boneB.userData.name = closestBone.userData.name;
                boneB.userData.boneId = closestBone.userData.boneId;
                assignedNames.add(closestBone.userData.name);
            } else {
                boneB.name = 'Unnamed';
            }
        });
    }

    getBonePositionRelativeToRoot(bone, rootBone) {
        const position = new Vector3();
        bone.updateMatrixWorld(true);
        rootBone.updateMatrixWorld(true);

        const boneMatrix = bone.matrixWorld.clone();
        const rootMatrixInverse = new Matrix4().getInverse(rootBone.matrixWorld);

        boneMatrix.premultiply(rootMatrixInverse);
        position.setFromMatrixPosition(boneMatrix);

        // position.z = 0;

        return position;
    }

    /**
     *
     * @param {string} boneName
     * @param {SkinnedMesh} skinnedMesh
     * @param {Color} boneColor
     */
    setBoneColorByBoneName(boneName, skinnedMesh, boneColor) {

        const skeleton = skinnedMesh.skeleton;
        const bones = skeleton.bones;

        const boneIndex = bones.findIndex(bone => bone.name === boneName);
        if (boneIndex === -1) {
            console.warn(`Knochen mit dem Namen "${boneName}" nicht gefunden.`);
            return;
        }

        const geometry = skinnedMesh.parent.userData.skeletionHelper.geometry;
        const position = geometry.getAttribute('position');
        const count = position.count;

        let colorAttribute = geometry.getAttribute('color');
        if (!colorAttribute) {
            const colorArray = new Float32Array(count * 3); // RGB für jeden Vertex
            colorAttribute = new BufferAttribute(colorArray, 3);
            geometry.setAttribute('color', colorAttribute);
        }

        const colorArray = colorAttribute.array;

        const vertexStart = boneIndex * 2;
        const vertexEnd = vertexStart + 1;

        // Überprüfen, ob die Indizes innerhalb der Grenzen liegen
        if (vertexEnd >= count) {
            console.warn(`Vertex-Indizes außerhalb der Grenzen für Knochen "${boneName}".`);
            return;
        }


        // Setzen der Farbe für die Start-Vertex
        colorArray[vertexStart * 3] = boneColor.r;
        colorArray[vertexStart * 3 + 1] = boneColor.g;
        colorArray[vertexStart * 3 + 2] = boneColor.b;

        // Setzen der Farbe für die End-Vertex
        colorArray[vertexEnd * 3] = boneColor.r;
        colorArray[vertexEnd * 3 + 1] = boneColor.g;
        colorArray[vertexEnd * 3 + 2] = boneColor.b;

        // Aktualisieren des Farb-Attributs
        colorAttribute.needsUpdate = true;
    }

    colorVerticesByBone(mesh, boneIndex) {
        const geometry = mesh.geometry;
        if (!geometry.isBufferGeometry) {
            console.error('Die Geometrie muss vom Typ BufferGeometry sein.');
            return;
        }

        // Stellen Sie sicher, dass die Geometrie die notwendigen Attribute besitzt
        const skinIndices = geometry.attributes.skinIndex;
        const skinWeights = geometry.attributes.skinWeight;

        if (!skinIndices || !skinWeights) {
            console.error('Die Geometrie verfügt nicht über skinIndex- und skinWeight-Attribute.');
            return;
        }

        // Fügen Sie ein Farb-Attribut hinzu, falls nicht vorhanden
        if (!geometry.attributes.color) {
            const colorAttr = new Float32BufferAttribute(geometry.attributes.position.count * 3, 3);
            geometry.setAttribute('color', colorAttr);
        }

        const colors = geometry.attributes.color;
        const position = geometry.attributes.position;

        // Iterieren Sie über alle Vertices
        for (let i = 0; i < position.count; i++) {
            let influenced = false;
            // Jeder Vertex kann bis zu 4 Knochen beeinflusst werden
            for (let j = 0; j < 4; j++) {
                const index = skinIndices.getX(i * 4 + j);
                const weight = skinWeights.getX(i * 4 + j);

                if (index === boneIndex && weight > 0) {
                    influenced = true;
                    break;
                }
            }

            if (influenced) {
                // Setze die Farbe auf Rot
                colors.setXYZ(i, 1, 0, 0);
            } else {
                // Setze die Farbe auf Weiß (oder eine andere Farbe)
                colors.setXYZ(i, 1, 1, 1);
            }
        }

        // Aktualisieren Sie das Farb-Attribut
        colors.needsUpdate = true;

        // Stellen Sie sicher, dass das Material Vertex-Farben verwendet
        if (Array.isArray(mesh.material)) {
            mesh.material.forEach(material => {
                material.vertexColors = true;
            });
        } else {
            mesh.material.vertexColors = true;
        }
    }

    changeBoneWeightsByBoneName(boneName, skinnedMesh, newWeight = 1.0) {
        const skeleton = skinnedMesh.skeleton;
        const boneIndex = skeleton.bones.findIndex(bone => bone.name === boneName);

        if (boneIndex === -1) {
            console.error(`Knochen mit dem Namen "${boneName}" nicht gefunden.`);
            return;
        }

        const geometry = skinnedMesh.geometry;

        if (!geometry.isBufferGeometry) {
            console.error("Die Geometrie muss vom Typ BufferGeometry sein.");
            return;
        }

        const skinIndices = geometry.attributes.skinIndex;
        const skinWeights = geometry.attributes.skinWeight;

        if (!skinIndices || !skinWeights) {
            console.error("Die Geometrie verfügt nicht über skinIndex- und skinWeight-Attribute.");
            return;
        }

        // Aktualisiere die Gewichte für die betroffenen Vertices
        for (let i = 0; i < skinIndices.count; i++) {
            // Jeder Vertex kann bis zu 4 Knochen beeinflusst werden
            for (let j = 0; j < 4; j++) {
                const index = skinIndices.getX(i * 4 + j);

                if (index === boneIndex) {
                    skinWeights.setX(i * 4 + j, newWeight); // Setzt das Gewicht des Knochens
                }
            }
        }

        // Aktualisiere das skinWeight-Attribut
        skinWeights.needsUpdate = true;
    }

    getBoneWeightsForBone(boneName, skinnedMesh) {
        const skeleton = skinnedMesh.skeleton;
        const boneIndex = skeleton.bones.findIndex(bone => bone.name === boneName);

        if (boneIndex === -1) {
            console.error(`Knochen mit dem Namen "${boneName}" nicht gefunden.`);
            return [];
        }

        const geometry = skinnedMesh.geometry;

        if (!geometry.isBufferGeometry) {
            console.error("Die Geometrie muss vom Typ BufferGeometry sein.");
            return [];
        }

        const skinIndices = geometry.attributes.skinIndex;
        const skinWeights = geometry.attributes.skinWeight;

        if (!skinIndices || !skinWeights) {
            console.error("Die Geometrie verfügt nicht über skinIndex- und skinWeight-Attribute.");
            return [];
        }

        const influencedVertices = [];

        for (let i = 0; i < skinIndices.count; i++) {
            const indices = [
                skinIndices.getX(i),
                skinIndices.getY(i),
                skinIndices.getZ(i),
                skinIndices.getW(i)
            ];

            const weightsArray = [
                skinWeights.getX(i),
                skinWeights.getY(i),
                skinWeights.getZ(i),
                skinWeights.getW(i)
            ];

            for (let j = 0; j < 4; j++) {
                const index = indices[j];
                const weight = weightsArray[j];

                if (index === boneIndex && weight > 0) {
                    influencedVertices.push({ vertexIndex: i, weight: weight });
                    break; // Falls Sie pro Vertex nur einmal hinzufügen möchten
                }
            }
        }

        return influencedVertices;
    }




}

export default new SkeletonHelper();