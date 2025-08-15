import App from "./App.mjs";
import AppMenu from "./AppMenu.mjs";
import ResourceLoader from "../Layer1/ResourceLoader.mjs";
import NBinary from "../Layer0/NBinary.mjs";
import Database from "../Layer0/Database.mjs";
import WebGl from "../Layer2/WebGl.mjs";
import MimeType from "./../Layer0/MimeType.mjs";
import {
    AnimationMixer,
    Matrix4,
    Skeleton,
    SkeletonHelper as TSkeletonHelper,
    Vector4
} from "../Vendor/three.module.mjs";
import SkeletonHelper from "../Layer2/SkeletonHelper.mjs";
import Helper from "../Helper.mjs";
import ManhuntMatrix from "../Layer1/ManhuntMatrix.mjs";
import Manhunt2MDL from "../Layer0/FileGenerator/Manhunt2.MDL.mjs";
import ModelMdl from "../Layer0/FileHandler/Model.Mdl.mjs";

export default class CaptchaGame extends App{
    name = "CaptchaGame";

    constructor(props) {
        super(props);
        AppMenu.add(this);
    }

    async load() {
        await super.load();

        await ResourceLoader.load([
            '/Resources/Skeleton/manhunt_2_pc_player.tex',
            '/Resources/Skeleton/manhunt_2_pc_player.mdl'
        ]);

        await ResourceLoader.load('/Resources/Animation/manhunt_2_pc.ifp', {
            source: { game: "mh2", platform: "pc" }
        });


        WebGl.orbit();
    }


    async createViewport() {
        const options = await fetch('src/App/CaptchaGame/index.html');

        this.menuContainer.innerHTML = await options.text()
    }

    async createEvents() {



    }

}