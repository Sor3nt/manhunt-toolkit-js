import assert from "assert";
import Database from "../../src/Layer0/Database.mjs";
import MimeType from "../../src/Layer0/MimeType.mjs";
import FileLoaderHelper from "./file.loader.helper.mjs";
import WaypointsGrf from "../../src/Layer0/FileHandler/Waypoints.Grf.mjs";

describe('AI Waypoints', () => {

    describe('Testing parsing', async () => {

        FileLoaderHelper.load('./Unittest/Resources/mapai_pc.grf', WaypointsGrf, {});

        const nodes = Database.findBy({ type: MimeType.WAYPOINT_NODES, file: "mapai_pc.grf" });
        if (nodes === null) assert.fail('Node result was not found');

        const routes = Database.findBy({ type: MimeType.WAYPOINT_ROUTE, file: "mapai_pc.grf" });
        if (routes === null) assert.fail('Route result was not found');

        it('there are nodes present', () => {
            const hasNodes = nodes.length > 0;
            assert.equal(hasNodes, true);
        });

        it('there are routes present', () => {
            const hasRoutes = routes.length > 0;
            assert.equal(hasRoutes, true);
        });

    });

});
