class Helper{

    getRandomColor() {
        var letters = '0123456789ABCDEF';
        var color = '0x';
        for (var i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return eval(color);
    }

    log(tag, msg, type = "log", stopOnError = true){
        console[type](tag, msg);

        if (type === "error")
            throw new Error(msg);

    }

    assert(a, b, msg){

        if(b === undefined){
            if (a === false){
                this.log("Assert", "Assert failed", "error");
                debugger;
                return;
            }
            return;
        }

        if (a !== b){
            // console.error((msg || ('Expect ' + b + ' got ' + a)) );
            // debugger;
        }
    }
}

export default new Helper();