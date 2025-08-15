import helper from "../Helper.mjs";

class Database{

    /**
     * @type {Array.<Result>} storage
     */
    storage = [];
    byTypeGameName = {};
    count = 0;

    /**
     * @param result {Result}
     */
    add(result){
        if(result.name === ""){
            helper.log("Database", "Result has no name! Unable to add into database.", "error");
            return;
        }

        this.count++;
        // console.log(result.name, result)
        //
        // let index = `S_${result.type}_${result.level}_${result.gameId}_${result.name.toLowerCase()}`;
        //
        // if (this.byTypeGameName[ index ] === undefined)
        //     this.byTypeGameName[ index ] = [];
        //
        // this.byTypeGameName[ index ].push(result);
        this.storage.push(result);
    }

    /**
     * @param result {Result}
     */
    remove(result){
        this.count--;

        // let index = `S_${result.type}_${result.level}_${result.gameId}_${result.name}`;
        //
        // if (this.byTypeGameName[ index ] === undefined)
        //     helper.log('Database', `Unable to remove ${result.name}, was not found in database ?!`, 'info');
        // else
        //     delete this.byTypeGameName[ index ];

        this.storage.splice( this.storage.indexOf(result), 1);
    }

    /**
     * @param criteria {{}}
     * @returns {Result|null}
     */
    findOneBy( criteria ){
        let results = this.findBy(criteria);
        // if (results.length > 1)
        //     helper.log('Database', `We found more then one result!`, 'info');


        if (results.length === 0)
            return null;
        return results[0];
    }

    /**
     *
     * @param criteria
     * @returns {Array.<Result>}
     */
    findBy( criteria ){

        // if (
        //     (criteria.type !== undefined && criteria.gameId !== undefined && criteria.name !== undefined && criteria.level !== undefined) &&
        //     (criteria.offset === undefined && criteria.file === undefined && criteria.props === undefined)){
        //
        //     let entries = this.byTypeGameName[ `S_${criteria.type}_${criteria.level}_${criteria.gameId}_${criteria.name.toLowerCase()}` ];
        //     if (entries === undefined)
        //         return [];
        //     return entries;
        // }

        // console.warn("Slow Storage search is used for query", criteria);

        let result = [];
        this.storage.forEach(function ( entry ) {

            // if (criteria.hasChanges !== undefined && entry.hasChanges   !== criteria.hasChanges)   return;
            if (criteria.uuid   !== undefined && entry.uuid   !== criteria.uuid)   return;
            if (criteria.level   !== undefined && entry.level   !== criteria.level)   return;
            if (criteria.type   !== undefined && entry.type   !== criteria.type)   return;
            if (criteria.name   !== undefined && entry.name.toLowerCase()   !== criteria.name.toLowerCase())   return;
            if (criteria.offset !== undefined && entry.offset !== criteria.offset) return;
            if (criteria.gameId !== undefined && entry.gameId !== criteria.gameId) return;
            if (criteria.file   !== undefined && entry.file   !== criteria.file)   return;


            if (criteria.props !== undefined){
                if (entry.props === undefined)
                    return;

                for(var i in criteria.props){
                    if (!criteria.props.hasOwnProperty(i))
                        continue;

                    if (entry.props[i] === undefined || entry.props[i] !== criteria.props[i])
                        return;
                }
            }

            result.push(entry);
        });

        return result;
    }
}

export default new Database();