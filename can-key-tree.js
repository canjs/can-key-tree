var reflect = require( "can-reflect" );

function isBuiltInPrototype ( obj ) {
	if ( obj === Object.prototype ) {
		return true;
	}
	var protoString = Object.prototype.toString.call( obj );
	var isNotObjObj = protoString !== '[object Object]';
	var isObjSomething = protoString.indexOf( '[object ' ) !== -1;
	return isNotObjObj && isObjSomething;
}

var KeyTree = function ( treeStructure, callbacks ) {
	this.callbacks = callbacks || {};

	this.treeStructure = treeStructure;
	var FirstConstructor = treeStructure[0];
	if ( reflect.isConstructorLike( FirstConstructor ) ) {
		this.root = new FirstConstructor();
	} else {
		this.root = FirstConstructor;
	}
};

/**
 * @function can-key-tree.prototype.add add
 * @parent can-key-tree.prototype
 *
 * @signature `keyTree.add(keys)`
 *
 * Adds items into the structure and returns the keyTree.
 *
 * ```js
 * var keyTree = new KeyTree( [Object, Object, Array] );
 *
 * function handler1(){}
 * function handler2(){}
 * function handler3(){}
 *
 * keyTree.add(["click", "li", handler1]);
 * keyTree.add(["click", "li", handler2]);
 * keyTree.add(["click", "span", handler3]);
 * ```
 *
 * The `keyTree` data structure will look like:
 * ```js
 * {
 *     "click": {
 *         "li": [handler1, handler2],
 *         "span": [handler3]
 *     }
 * }
 * ```
 *
 * @param {Array} [keys] An array of keys to populate the tree
 * @return {KeyTree} The keyTree
 */
KeyTree.prototype.add = function ( keys ) {
	if ( keys.length > this.treeStructure.length ) {
		throw new Error( "can-key-tree: Can not add path deeper than tree." );
	}

	var place = this.root;
	var rootWasEmpty = reflect.size( this.root ) === 0;
	for ( var i = 0; i < keys.length - 1; i++ ) {
		var key = keys[i];
		var store = reflect.getKeyValue( place, key );
		if ( !store ) {
			var Constructor = this.treeStructure[i + 1];
			if ( isBuiltInPrototype( Constructor.prototype ) ) {
				store = new Constructor();
			} else {
				store = new Constructor( key );
			}

			reflect.setKeyValue( place, key, store );
		}
		place = store;
	}
	if ( reflect.isMoreListLikeThanMapLike( place ) ) {
		reflect.addValues( place, [keys[keys.length - 1]] );
	} else {
		// only containers supported at the end
		throw new Error( "can-key-tree: Map types are not supported yet." );
	}
	if ( rootWasEmpty && this.callbacks.onFirst ) {
		this.callbacks.onFirst.call( this );
	}

	return this;
};

function getDeep ( item, items, depth, maxDepth ) {
	if ( !item ) {
		return;
	}
	if ( maxDepth === depth ) {
		if ( reflect.isMoreListLikeThanMapLike( item ) ) {
			// add each item
			reflect.addValues( items, reflect.toArray( item ) );
		} else {
			// only containers supported at the end
			throw new Error( "can-key-tree: Map types are not supported yet." );
		}
	} else {
		reflect.each( item, function ( value ) {
			getDeep( value, items, depth + 1, maxDepth );
		});
	}
}

/**
 * @function can-key-tree.prototype.get get
 * @parent can-key-tree.prototype
 *
 * @signature `keyTree.get(keys)`
 *
 * Return all the leafs from the keyTree under the specified `keys`.
 *
 * Given this setup:
 *
 * ```js
 * var keyTree = new KeyTree( [Object, Object, Array] );
 *
 * function handler1(){}
 * function handler2(){}
 * function handler3(){}
 *
 * keyTree.add(["click", "li", handler1]);
 * keyTree.add(["click", "li", handler2]);
 * keyTree.add(["click", "span", handler3]);
 * ```
 *
 * To get all the `li` `click` handlers, use `.get`:
 *
 * ```js
 * keyTree.get(["click", "li"]) //-> [handler1, handler2]
 * ```
 *
 * To get all `click` handlers, you can also use `.get`:
 *
 * ```js
 * keyTree.get(["click"]) //-> [handler1, handler2, handler3]
 * ```
 *
 * @param {Array} [keys] An array of keys to specify where to start recursively getting leafs from
 * @return {KeyTree} The keyTree
 */
KeyTree.prototype.get = function ( keys ) {
	var place = this.getNode( keys );

	if ( this.treeStructure.length === keys.length ) {
		return place;
	} else {
		// recurse deep
		var Type = this.treeStructure[this.treeStructure.length - 1];
		var items = new Type();
		getDeep( place, items, keys.length, this.treeStructure.length - 1 );
		return items;
	}
};

KeyTree.prototype.getNode = function ( keys ) {
	var place = this.root;
	for ( var i = 0; i < keys.length; i++ ) {
		var key = keys[i];
		var store = reflect.getKeyValue( place, key );
		if ( !store ) {
			return;
		}
		place = store;
	}
	return place;
};

function clear ( item, depth, maxDepth ) {
	if ( maxDepth === depth ) {
		if ( reflect.isMoreListLikeThanMapLike( item ) ) {
			// remove each item
			reflect.removeValues( item, reflect.toArray( item ) );
		} else {
			// only containers supported at the end
			throw new Error( "can-key-tree: Map types are not supported yet." );
		}
	} else {
		reflect.each( item, function ( value, key ) {
			clear( value, depth+1, maxDepth );
			reflect.deleteKeyValue( item, key );
		});
	}
}

/**
 * @function can-key-tree.prototype.delete delete
 * @parent can-key-tree.prototype
 *
 * @signature `keyTree.delete(keys)`
 *
 * Delete everything from the keyTree at the specified `keys`.
 *
 * Given this setup:
 *
 * ```js
 * var keyTree = new KeyTree( [Object, Object, Array] );
 *
 * function handler1(){}
 * function handler2(){}
 * function handler3(){}
 *
 * keyTree.add(["click", "li", handler1]);
 * keyTree.add(["click", "li", handler2]);
 * keyTree.add(["click", "span", handler3]);
 * ```
 *
 * To delete a handler, use `.delete`:
 *
 * ```js
 * keyTree.delete(["click", "li", handler1]);
 * ```
 *
 * The `keyTree` data structure will look like:
 *
 * ```js
 * {
 *     "click": {
 *         "li": [handler2],
 *         "span": [handler3]
 *     }
 * }
 * ```
 *
 * To delete the remaining `click` handlers:
 *
 * ```js
 * keyTree.delete(["click"]);
 * ```
 *
 * The `keyTree` data structure will look like:
 *
 * ```js
 * {}
 * ```
 *
 * @param {Array} [keys] An array of keys to specify where to delete
 * @return {boolean} If the node was found and the delete was successful
 */
KeyTree.prototype.delete = function ( keys ) {
	var place = this.root;
	var roots = [this.root];
	// find location of the removal of the last key ...
	for ( var i = 0; i < keys.length - 1; i++ ) {
		var key = keys[i];
		var store = reflect.getKeyValue( place, key );
		if ( store === undefined ) {
			return false;
		} else {
			roots.push( store );
		}
		place = store;
	}

	// `place` is now the object we are removing the last key from
	var lastKey = keys[keys.length - 1];
	// if we are removing a leaf
	if ( keys.length === this.treeStructure.length ) {
		if ( reflect.isMoreListLikeThanMapLike( place ) ) {
			reflect.removeValues( place, [lastKey] );
		} else {
			// only containers supported at the end
			throw new Error( "can-key-tree: Map types are not supported yet." );
		}
	} else if ( !keys.length ) {
		clear( place, 0, this.treeStructure.length - 1 );
	} else {
		// we need to recursively clear the node's values
		var branch = reflect.getKeyValue( place, lastKey );
		if ( branch !== undefined ) {
			clear( branch, keys.length, this.treeStructure.length - 1 );
			reflect.deleteKeyValue( place, lastKey );
		} else {
			return false;
		}
	}

	for ( i = roots.length - 2; i >= 0; i-- ) {
		if ( reflect.size( place ) === 0 ) {
			place = roots[i];
			reflect.deleteKeyValue( place, keys[i] );
		} else {
			break;
		}
	}
	if ( this.callbacks.onEmpty && reflect.size( this.root ) === 0 ) {
		this.callbacks.onEmpty.call( this );
	}
	return true;
};

function getDepth ( root, level ) {
	if ( level === 0 ) {
		return reflect.size( root );
	} else if ( reflect.size( root ) === 0 ) {
		return 0;
	} else {
		var count = 0;
		reflect.each( root, function ( value ) {
			count += getDepth( value, level - 1 );
		});
		return count;
	}
}

/**
 * @function can-key-tree.prototype.size size
 * @parent can-key-tree.prototype
 *
 * @signature `keyTree.size()`
 *
 * Returns the size of the keyTree
 *
 * ```js
 * var keyTree = new KeyTree( [Object, Object, Array] );
 *
 * function handler1 () {}
 * function handler2 () {}
 * keyTree.size(); //-> 0
 *
 * keyTree.add( ["click", "li", handler1] );
 * keyTree.add( ["click", "li", handler2] );
 * keyTree.size(); //-> 2
 * ```
 *
 * @return {Number} The size of the keyTree
 */
KeyTree.prototype.size = function () {
	return getDepth( this.root, this.treeStructure.length - 1 );
};

module.exports = KeyTree;
