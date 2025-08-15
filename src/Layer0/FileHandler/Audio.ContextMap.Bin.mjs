import FileHandlerAbstract from "./FileHandler.Abstract.mjs";
import Result from "../Result.mjs";
import Database from "../Database.mjs";
import MimeType from "../MimeType.mjs";
import helper from "../../Helper.mjs";

class AudioContextMapBin extends FileHandlerAbstract{
    tag = "CTX";


    canHandle(binary){
        try{
            const bankName = binary.consume(32, 'nbinary').getString(0);
            return bankName.indexOf('_') !== -1 && binary.consume(4, 'int32', -4) === 0;
        }catch(e){
            return false;
        }
    }


    process(binary, infos) {
        binary.setCurrent(0);
        const bankName = binary.consume(32, 'nbinary').getString(0);

        Database.add(
            new Result(MimeType.AUDIO_BANK, this, binary, bankName, 32, binary.length() - 32, {}, infos.path)
        );
    }

    async decode(binary, options = {}, props = {}) {

        let result = [];
        let lastAudioCount = 0;
        
        for(let bankIndex = 0; bankIndex < 58; bankIndex++){
            let count = binary.int32();
            if (count === lastAudioCount)
                continue;

            const eventName = this.getNameByBankIndex(bankIndex);

            for(let x = lastAudioCount; x < count; x++){
                result.push({
                    index: x,
                    name: eventName,
                });
            }

            lastAudioCount = count;
        }

        return result;
    }

    //TODO: hm revalidate the names, can not remember from where i have this order...
    //should be from sub_7AFF40 but it does not match...
    getNameByBankIndex(bankIndex) {

        switch (bankIndex){
            case 1:
                return 'negative_search';
            case 2:
                return 'definite_sighting';

            case 5:
                return 'run_to_investigate';
            case 6:
                return 'walk_to_investigate';
            case 7:
                return 'stop_and_listen';
            case 8:
                return 'curiosity_no_result';
            case 9:
                return 'taunt_search';
            case 10:
                return 'positive_taunt_search';
            case 11:
                return 'negative_taunt_search';

            case 13:
                return 'taunt_chase';
            case 14:
                return 'taunt_short';
            case 15:
                return 'taunt_safe_zone';
            case 16:
                return 'taunt_boundary';
            case 17:
                return 'taunt_player_dead';
            case 18:
                return 'join_attack';
            case 19:
                return 'wait_enemy_alone';
            case 20:
                return 'wait_enemy_multiple';
            case 21:
                return 'sneak_investigate';
            case 22:
                return 'wait_in_cover';
            case 23:
                return 'surprise';
            case 24:
                return 'greetings';
            case 25:
                return 'player_';

            case 26:
                return 'claim_territory';
            case 27:
                return 'generic_ind';
            case 28:
                return 'whistli';

            case 29:
                return 'chat_statements';
            case 30:
                return 'chat_search';
            case 31:
                return 'chat_investigate';

            case 33:
                return 'shout_for_assistance';
            case 34:
                return 'pain_light';
            case 35:
                return 'pain_medium';
            case 36:
                return 'pain_high';
            case 37:
                return 'pain_long';
            case 38:
                return 'death_generic';

            case 40:
                return 'death_execution';
            case 41:
                return 'combat_grunt';
            case 42:
                return 'negative_chase_result';
            case 43:
                return 'begging_pleading';
            case 44:
                return 'dead_body_seen';

            case 47:
                return 'failed_search';
            case 48:
                return 'crawlspace_';
            case 49:
                return 'jump_reaction';
            case 50:
                return 'crawl_reaction';
            case 51:
                return 'chat_question';
            case 52:
                return 'chat_position';
            case 53:
                return 'chat_negative';
            case 54:
                return 'flare_death';
            case 55:
                return 'gascan_death';
        }

        helper.log(this.tag, `Unknown BANK index ${bankIndex} provided.`, 'info');

        return 'unknown_' + bankIndex;
    }
}

export default new AudioContextMapBin();

