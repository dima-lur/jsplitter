/**
 * @namespace
 * @worker
 */
let console = {
    /**
     *
     * @param {...*} var_args
     * @worker
     */
    log: function (...var_args) { }, // (void)

    /**
     * Returns array of console log lines
     *  
     * @param {boolean=} [with_timestamp=false] To return console lines with timestamps or not
     * @return {Array<string>} 
     * @worker
     * @mainthread
     */
    GetLines: function (with_timestamp) { },

    /**
     * Clears console backlog<br>
     * NOTE: Limitation of foobar2000 versions < 2.0: clears only JSplitter's internal backlog.
     * 
     * @worker
     * @mainthread
     */
    ClearBacklog: function () { },
};

