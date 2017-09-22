var QUnit = require('steal-qunit');
var KeyTree = require('./can-key-tree');

QUnit.module('can-key-tree');

QUnit.test('basics', function(){
    var keyTree = new KeyTree([Object, Object, Array]);

    function handler1(){}
    function handler2(){}

    QUnit.equal( keyTree.size(), 0, "empty" );

    keyTree.add(["click","li", handler1] );
    keyTree.add(["click","li", handler2] );
    QUnit.equal( keyTree.size(), 2, "2" );

    QUnit.deepEqual( keyTree.get(["click","li"]), [handler1, handler2] );

    keyTree.delete(["click","li", handler1]);
    QUnit.equal( keyTree.size(), 1, "1" );
    keyTree.delete(["click","li", handler1]);
    QUnit.equal( keyTree.size(), 1, "empty" );
    keyTree.delete(["click","li", handler2]);
    QUnit.equal( keyTree.size(), 0, "empty" );
});
