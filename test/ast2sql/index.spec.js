'use strict';

describe('ast2sql', () => {
    require('./cte');
    require('./column');
    require('./from');
    require('./join');
    require('./where');
    require('./order');
    require('./limit');
    require('./groupby');
    require('./having');

    require('./expr');
    require('./literal');
    require('./select');
    require('./mysql');
});
