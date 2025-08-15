import FileHandlerAbstract from "./FileHandler.Abstract.mjs";
import Database from "../Database.mjs";
import Result from "../Result.mjs";
import MimeType from "../MimeType.mjs";
import {MathUtils} from "../../Vendor/three.module.mjs";

class WaypointsGrf extends FileHandlerAbstract{
    tag = "GRF";

    /**
     * @param binary {NBinary}
     * @returns {boolean}
     */
    canHandle(binary){
        if (binary.remain() <= 0) return false;
        
        binary.setCurrent(0);
        let fourCC = binary.consume(4, 'string');
        if (fourCC === "GNIA") return true;

        binary.setCurrent(8);

        //todo: risky...
        let isZero = binary.int32();
        return isZero === 0;
    }

    process(binary, infos) {
        let game = 'mh';
        let results = [];

        let count = binary.int32();

        //GNIA :  Manhunt 2
        if (count === 1095323207){
            game = 'mh2';
            binary.seek(4); //const
            count = binary.int32();
        }

        let waypointMap = {
            nodes: this.parseArea(binary, count, game),
            routes: this.parseWaypointRoutes(binary),
            areaNames: this.parseAreaNames(binary)
        };

        let nodesById = {};

        waypointMap.nodes.forEach((node) => {
            let result = new Result(MimeType.WAYPOINT_NODES, this, undefined, `node_${MathUtils.generateUUID()}`, 0, 0, {
                data: {
                    node,
                    areaName: waypointMap.areaNames[node.groupIndex]
                }
            }, infos.path);

            Database.add(result);
            
            nodesById[node.id] = result;
            results.push(result);
        });

        waypointMap.routes.forEach((route) => {

            route.nodes = [];
            route.entries.forEach((nodeId) => {
                route.nodes.push(nodesById[nodeId]);
            });

            Database.add(new Result(MimeType.WAYPOINT_ROUTE, this, undefined, route.name, 0, 0, {
                data: route
            }, infos.path));

        });

        return results;
    }

    async decode(binary, options = {}, props = {}) {
        return props;
    }


    /**
     *
     * @param binary
     * @returns {string[]}
     */
    parseAreaNames(binary){
        let results = [];

        let count = binary.int32();
        for(let x = 0; x < count; x++)
            results.push(binary.getString(0, true));

        return results;
    }

    /**
     *
     * @param binary
     * @returns {{order:int, name: string, entries: int[] }[]}
     */
    parseWaypointRoutes(binary){
        let results = [];

        let count = binary.int32();
        for(let i = 0; i < count; i++)
            results.push({
                name:  binary.getString(0, true),
                entries:  this.parseBlock(binary)
            });

        return results;
    }

    /**
     *
     * @param binary
     * @param entryCount
     * @param game {string}
     * @returns {{id: number, name: string, groupIndex: int, position: {x:float,y:float,z:float}, radius: float, nodeName: string, relation: int[], waypoints: []}[]}
     */
    parseArea(binary, entryCount, game){

        let entries = [];

        for(let i = 0; i < entryCount; i++){

            let entry = {
                id: i,
                name: binary.getString(0, true),
                groupIndex: binary.int32(),
                position: (function () {
                    let position = binary.readVector3();

                    if (game === 'mh'){
                        let y = position.y;
                        position.y = position.z;
                        position.z = y * -1;
                    }

                    return position;
                })(),
                radius: binary.float32(),
                nodeName: binary.getString(0, true),
                unknownBlock: this.parseBlock(binary)
            };

            if (game === 'mh2') entry.unkFlags2 = this.parseBlock(binary);

            entry.waypoints = this.parseWayPointBlock(binary);
            entries.push(entry);

            // Zero
            if (game === 'mh2') binary.seek(8);
        }

        return entries;
    }

    /**
     *
     * @param {NBinary} binary
     * @return {*}
     */
    parseBlock(binary){
        return binary.consumeMulti(binary.int32(), 4, 'int32');
    }

    parseWayPointBlock(binary){

        let count = binary.int32();

        let result = [];
        for(let x = 0; x < count; x++){
            result.push({
                linkId: binary.int32(),
                type: binary.int32(),
                relation: this.parseBlock(binary)
            });
        }

        return result;
    }
}

export default new WaypointsGrf();