@typedef {Object} can-key-tree.types.keyTreeCallbacks KeyTreeCallbacks
@parent can-key-tree.types

@type {Object} Defines callbacks `onFirst` and/or `onEmpty`.

```js
var keyTreeCallbacks = {
  onFirst: function () {
    // called when the first node is added
  },
  onEmpty: function () {
    // called when all nodes are removed
  }
};
var keyTree = new KeyTree( [Object, Object, Array], keyTreeCallbacks );

function handler1 () {}

keyTree.add( ["click", "li", handler1] );
// onFirst is called with a context (`this`) of the keyTree instance and no arguments

keyTree.delete( [] );
// onEmpty is called with a context (`this`) of the keyTree instance and no arguments
```
