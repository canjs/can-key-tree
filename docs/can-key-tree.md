@module {function} can-key-tree
@parent can-js-utilities
@collection can-infrastructure
@group can-key-tree.types 0 types
@group can-key-tree.prototype 1 prototype

@description Add and remove tree items

@signature `new KeyTree(treeStructure [, callbacks])`

The following creates a tree structure 3 levels deep:


```js
var keyTree = new KeyTree([Object,Object,Array], {onFirst, onEmpty});
```

Once you've created a `keyTree`, you can `.add`, `.delete` and `.get` values from it.

@param {Array<function>} [treeStructure] An array of types. An instance of each type will be used as the nodes of the tree. 
@param {can-key-tree.types.keyTreeCallbacks} [callbacks] Optional. An object containing callbacks `onFirst` and/or `onEmpty`.
@return {can-key-tree} An instance of `KeyTree`.
