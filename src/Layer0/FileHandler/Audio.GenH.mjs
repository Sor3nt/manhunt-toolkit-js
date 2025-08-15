import NBinary from "../NBinary.mjs";

class AudioGenH {

    /**
     *
     * @param raw {NBinary}
     * @param numChannels {int}
     * @param defFreq {int}
     * @param moresize_dump {NBinary}
     * @param moresize {int}
     * @return {*}
     */
    encodeGenH(raw, numChannels, defFreq, moresize_dump, moresize) {


        const genH = new NBinary();
        genH.writeString('GENH');

        genH.setInt32(numChannels);
        genH.setInt32(2); // interleave
        genH.setInt32(defFreq);

        genH.setInt32(0xfffffff); //loop start
        genH.setInt32(((raw.length() * 14) / 8) / numChannels); //loop end

        genH.setInt32(12); //codec
        genH.setInt32(0x80 + (numChannels * 32)); //start_offset
        genH.setInt32(0x80 + (numChannels * 32)); //header_size
        genH.setInt32(0x80); //coef[0]
        genH.setInt32(0x80 + 32); //coef[1]
        genH.setInt32(1); //dsp_interleave_type
        genH.setInt32(0); //coef_type
        genH.setInt32(0x80); //coef_splitted[0]
        genH.setInt32(0x80 + 32); //coef_splitted[1]

        while (genH.current() < 0x80) {
            genH.writeString("\x00".charCodeAt(0));
        }

        const coeff = moresize_dump;
        let coeffsz = moresize;

        for (let i = 0; i < numChannels; i++) {
            if (coeff.length() && (coeffsz >= 46)) {
                genH.append(coeff.consume(32, 'nbinary'));
                coeff.seek(-32);
                coeff.seek(46);
                coeffsz -= 46;
            } else {
                for (let j = 0; j < 16; j++) {
                    genH.setInt16(0);
                }
            }
        }

        genH.append(raw);

        return genH;
    }

}

export default new AudioGenH();

