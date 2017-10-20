/*can-key-tree@0.0.3#can-key-tree*/
define([
    'require',
    'exports',
    'module',
    'can-reflect'
], function (require, exports, module) {
    var reflect = require('can-reflect');
    function isBuiltInPrototype(obj) {
        return obj === Object.prototype || Object.prototype.toString.call(obj) !== '[object Object]' && Object.prototype.toString.call(obj).indexOf('[object ') !== -1;
    }
    var KeyTree = function (treeStructure, callbacks) {
        this.callbacks = callbacks || {};
        this.treeStructure = treeStructure;
        var FirstConstructor = treeStructure[0];
        if (reflect.isConstructorLike(FirstConstructor)) {
            this.root = new FirstConstructor();
        } else {
            this.root = FirstConstructor;
        }
    };
    KeyTree.prototype.add = function (keys) {
        if (keys.length > this.treeStructure.length) {
            throw new Error('can-key-tree: Can not add path deeper than tree.');
        }
        var place = this.root;
        var rootWasEmpty = reflect.size(this.root) === 0;
        for (var i = 0; i < keys.length - 1; i++) {
            var key = keys[i];
            var store = reflect.getKeyValue(place, key);
            if (!store) {
                var Constructor = this.treeStructure[i + 1];
                if (isBuiltInPrototype(Constructor.prototype)) {
                    store = new Constructor();
                } else {
                    store = new Constructor(key);
                }
                reflect.setKeyValue(place, key, store);
            }
            place = store;
        }
        if (reflect.isMoreListLikeThanMapLike(place)) {
            reflect.addValues(place, [keys[keys.length - 1]]);
        } else {
            throw new Error('can-key-tree: Map types are not supported yet.');
        }
        if (rootWasEmpty && this.callbacks.onFirst) {
            this.callbacks.onFirst.call(this);
        }
    };
    function getDeep(item, items, depth, maxDepth) {
        if (!item) {
            return;
        }
        if (maxDepth === depth) {
            if (reflect.isMoreListLikeThanMapLike(item)) {
                reflect.addValues(items, reflect.toArray(item));
            } else {
                throw new Error('can-key-tree: Map types are not supported yet.');
            }
        } else {
            reflect.each(item, function (value) {
                getDeep(value, items, depth + 1, maxDepth);
            });
        }
    }
    KeyTree.prototype.get = function (keys) {
        var place = this.getNode(keys);
        if (this.treeStructure.length === keys.length) {
            return place;
        } else {
            var Type = this.treeStructure[this.treeStructure.length - 1];
            var items = new Type();
            getDeep(place, items, keys.length, this.treeStructure.length - 1);
            return items;
        }
    };
    KeyTree.prototype.getNode = function (keys) {
        var place = this.root;
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var store = reflect.getKeyValue(place, key);
            if (!store) {
                return;
            }
            place = store;
        }
        return place;
    };
    function clear(item, depth, maxDepth) {
        if (maxDepth === depth) {
            if (reflect.isMoreListLikeThanMapLike(item)) {
                reflect.removeValues(item, reflect.toArray(item));
            } else {
                throw new Error('can-key-tree: Map types are not supported yet.');
            }
        } else {
            reflect.each(item, function (value, key) {
                clear(value, depth + 1, maxDepth);
                reflect.deleteKeyValue(item, key);
            });
        }
    }
    KeyTree.prototype.delete = function (keys) {
        var place = this.root;
        var roots = [this.root];
        for (var i = 0; i < keys.length - 1; i++) {
            var key = keys[i];
            var store = reflect.getKeyValue(place, key);
            if (store === undefined) {
                return false;
            } else {
                roots.push(store);
            }
            place = store;
        }
        var lastKey = keys[keys.length - 1];
        if (keys.length === this.treeStructure.length) {
            if (reflect.isMoreListLikeThanMapLike(place)) {
                reflect.removeValues(place, [lastKey]);
            } else {
                throw new Error('can-key-tree: Map types are not supported yet.');
            }
        } else if (!keys.length) {
            clear(place, 0, this.treeStructure.length - 1);
        } else {
            var branch = reflect.getKeyValue(place, lastKey);
            if (branch !== undefined) {
                clear(branch, keys.length, this.treeStructure.length - 1);
                reflect.deleteKeyValue(place, lastKey);
            } else {
                return false;
            }
        }
        for (i = roots.length - 2; i >= 0; i--) {
            if (reflect.size(place) === 0) {
                place = roots[i];
                reflect.deleteKeyValue(place, keys[i]);
            } else {
                break;
            }
        }
        if (this.callbacks.onEmpty && reflect.size(this.root) === 0) {
            this.callbacks.onEmpty.call(this);
        }
        return true;
    };
    function getDepth(root, level) {
        if (level === 0) {
            return reflect.size(root);
        } else if (reflect.size(root) === 0) {
            return 0;
        } else {
            var count = 0;
            reflect.each(root, function (value) {
                count += getDepth(value, level - 1);
            });
            return count;
        }
    }
    KeyTree.prototype.size = function () {
        return getDepth(this.root, this.treeStructure.length - 1);
    };
    module.exports = KeyTree;
});