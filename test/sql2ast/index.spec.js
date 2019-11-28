'use strict';

describe('sql2ast', () => {
    require('./cte');
    require('./column');
    require('./from');
    require('./join');
    require('./where');
    require('./orderby');
    require('./limit');
    require('./groupby');
    require('./having');

    require('./expr');
    require('./literal');
    require('./placeholder');
    require('./row-value-constructor');
    require('./select');
    require('./mysql');
});
