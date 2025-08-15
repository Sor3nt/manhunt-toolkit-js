import FileHandlerAbstract from "./FileHandler.Abstract.mjs";
import Result from "../Result.mjs";
import {Vector2, Vector3, Vector4} from "../../Vendor/three.module.mjs";

import Database from "../Database.mjs";
import MimeType from "../MimeType.mjs";

class EntityConfigGlg extends FileHandlerAbstract{
    tag = "cGLG";

    /**
     * @param binary {NBinary}
     * @returns {boolean}
     */
    canHandle(binary){
        let text = binary.toString();
        if (text.indexOf('VECPAIR@') !== -1) return false;

        text = text.replace(/#.*/g, '');
        const matches = text.match(/(#FORCE\n)?RECORD\s(.*\s)*?END/mig);

        return matches !== null && matches.length !== 0;
    }

    process(binary, infos) {
        
        let text = binary.toString();
        const matches = text.match(/(#FORCE\n)?RECORD\s(.*\s)*?END/mig);

        matches.forEach((match) => {

            let force = match.indexOf('#FORCE') !== -1;

            match = match.replace(/#.*/g, '').trim();
            match = match.replace(/\r/g, '');
            match = match.substr(7);

            let optionsRaw = match.split("\n");
            const name = optionsRaw[0];

            delete optionsRaw[0];
            delete optionsRaw[optionsRaw.length - 1];

            let options = this.parseRecord(optionsRaw);
            
            Database.add(
                new Result(MimeType.CONFIG_GLG, this, undefined, name, 0, 0, {
                    options,
                    name,
                    force
                }, infos.path)
            );
            
        });
    }

    parseRecord( data ){
        let options = [];
        data.forEach((singleOption) => {

            singleOption = singleOption.trim();

            if (singleOption === "") return;
            if (singleOption.indexOf('#') === 0) return;

            if (singleOption.indexOf(' ') !== -1 || singleOption.indexOf("\t") !== -1){

                singleOption = singleOption.replace(/\t/g, ' ');
                singleOption = singleOption.replace(/\s+/g, ' ');
                const attrValue = singleOption.split(' ');

                let attr = attrValue[0].trim();
                let value = singleOption.substr(attr.length + 1).trim();

                if (['LOD_DATA'].indexOf(attr) !== -1) {
                    let vec4 = [];
                    value.split(',').forEach((val) => {
                        vec4.push(parseInt(val))
                    });

                    value = vec4;
                }

                else if (['HOLSTER_ROTATION', 'STRAP1_ROTATION', 'STRAP2_ROTATION'].indexOf(attr) !== -1){
                    let vec4 = [];
                    value.split(',').forEach(function (val) {
                        vec4.push( parseFloat(val) )
                    });

                    value = new Vector4(vec4[0],vec4[1],vec4[2],vec4[3]);

                }

                else if ([
                    'HOLSTER_TRANSLATION',
                    'STRAP1_TRANSLATION',
                    'STRAP2_TRANSLATION',
                    'FLASH_POS',
                    'OBSTRUCT_POINT',
                    'OBSTRUCT_POINT_ZOOM'
                ].indexOf(attr) !== -1){
                    let vec3 = [];
                    value.split(',').forEach((val) => {
                        vec3.push( parseFloat(val) )
                    });

                    value = new Vector3(vec3[0],vec3[1],vec3[2]);
                }

                else if (['MOVE_THRESHOLDS', 'AIM_LOCKON_ANGLES', 'EXECUTE_STAGE_TIMES', 'EXECUTE_STAGE_TIMES'].indexOf(attr) !== -1){
                    let vec2 = [];
                    value.split(',').forEach((val) => {
                        vec2.push( parseFloat(val) )
                    });

                    value = new Vector2(vec2[0],vec2[1]);
                }

                else if (['ZOOM_LEVELS', 'ZOOM_MAX_ZONES'].indexOf(attr) !== -1){
                    let vec2 = [];
                    value.split(',').forEach((val) => {
                        vec2.push( parseInt(val) )
                    });

                    value = vec2;
                }

                options.push({ 'attr' : attr, 'value' : value });
            }else{
                options.push({ 'attr' : singleOption });
            }
        });

        return options;
    }

    // createResult(name, binary, options, force){
    async decode(binary, options = {}, props = {}) {
        return {

            getValue: function(attr){
                if (attr === "NAME") return props.name;

                let found = false;
                props.options.forEach( (option) => {
                    if (option.attr === attr) 
                        found = typeof option.value === "undefined" ? true : option.value;
                });

                if (found === "") return false;
                return found;
            },
            
            getValues: function(attr, index){
                if (attr === "NAME") return [props.name];

                let found = [];
                props.options.forEach((option) => {
                    if (option.attr === attr) 
                        found.push(option.value);
                });

                if (typeof index !== "undefined") 
                    return found[index];

                return found;
            }
        };
    }
}

export default new EntityConfigGlg();