class ResolveHashes {

    cache = {}

    async executionAudio( crc32 ){
        if (this.cache.executionAudio === undefined)
            this.cache.executionAudio = (await import('../../Execution.Dir.Table.mjs')).default;

        return this.cache.executionAudio[crc32] || crc32;
    }

    async instOption( crc32 ){
        if (this.cache.inst === undefined)
            this.cache.inst = (await import('../../Inst.Table.mjs')).default;

        return this.cache.inst[crc32] || crc32;
    }

}

export default new ResolveHashes();

