/*can-key-tree@0.1.1#can-key-tree*/
var reflect = require('can-reflect');
function isBuiltInPrototype(obj) {
    if (obj === Object.prototype) {
        return true;
    }
    var protoString = Object.prototype.toString.call(obj);
    var isNotObjObj = protoString !== '[object Object]';
    var isObjSomething = protoString.indexOf('[object ') !== -1;
    return isNotObjObj && isObjSomething;
}
function getDeepSize(root, level) {
    if (level === 0) {
        return reflect.size(root);
    } else if (reflect.size(root) === 0) {
        return 0;
    } else {
        var count = 0;
        reflect.each(root, function (value) {
            count += getDeepSize(value, level - 1);
        });
        return count;
    }
}
function getDeep(node, items, depth, maxDepth) {
    if (!node) {
        return;
    }
    if (maxDepth === depth) {
        if (reflect.isMoreListLikeThanMapLike(node)) {
            reflect.addValues(items, reflect.toArray(node));
        } else {
            throw new Error('can-key-tree: Map-type leaf containers are not supported yet.');
        }
    } else {
        reflect.each(node, function (value) {
            getDeep(value, items, depth + 1, maxDepth);
        });
    }
}
function clearDeep(node, depth, maxDepth) {
    if (maxDepth === depth) {
        if (reflect.isMoreListLikeThanMapLike(node)) {
            reflect.removeValues(node, reflect.toArray(node));
        } else {
            throw new Error('can-key-tree: Map-type leaf containers are not supported yet.');
        }
    } else {
        reflect.each(node, function (value, key) {
            clearDeep(value, depth + 1, maxDepth);
            reflect.deleteKeyValue(node, key);
        });
    }
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
reflect.assign(KeyTree.prototype, {
    add: function (keys) {
        if (keys.length > this.treeStructure.length) {
            throw new Error('can-key-tree: Can not add path deeper than tree.');
        }
        var place = this.root;
        var rootWasEmpty = reflect.size(this.root) === 0;
        for (var i = 0; i < keys.length - 1; i++) {
            var key = keys[i];
            var childNode = reflect.getKeyValue(place, key);
            if (!childNode) {
                var Constructor = this.treeStructure[i + 1];
                if (isBuiltInPrototype(Constructor.prototype)) {
                    childNode = new Constructor();
                } else {
                    childNode = new Constructor(key);
                }
                reflect.setKeyValue(place, key, childNode);
            }
            place = childNode;
        }
        if (reflect.isMoreListLikeThanMapLike(place)) {
            reflect.addValues(place, [keys[keys.length - 1]]);
        } else {
            throw new Error('can-key-tree: Map types are not supported yet.');
        }
        if (rootWasEmpty && this.callbacks.onFirst) {
            this.callbacks.onFirst.call(this);
        }
        return this;
    },
    getNode: function (keys) {
        var node = this.root;
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            node = reflect.getKeyValue(node, key);
            if (!node) {
                return;
            }
        }
        return node;
    },
    get: function (keys) {
        var node = this.getNode(keys);
        if (this.treeStructure.length === keys.length) {
            return node;
        } else {
            var Type = this.treeStructure[this.treeStructure.length - 1];
            var items = new Type();
            getDeep(node, items, keys.length, this.treeStructure.length - 1);
            return items;
        }
    },
    delete: function (keys) {
        var parentNode = this.root, path = [this.root], lastKey = keys[keys.length - 1];
        for (var i = 0; i < keys.length - 1; i++) {
            var key = keys[i];
            var childNode = reflect.getKeyValue(parentNode, key);
            if (childNode === undefined) {
                return false;
            } else {
                path.push(childNode);
            }
            parentNode = childNode;
        }
        if (!keys.length) {
            clearDeep(parentNode, 0, this.treeStructure.length - 1);
        } else if (keys.length === this.treeStructure.length) {
            if (reflect.isMoreListLikeThanMapLike(parentNode)) {
                reflect.removeValues(parentNode, [lastKey]);
            } else {
                throw new Error('can-key-tree: Map types are not supported yet.');
            }
        } else {
            var nodeToRemove = reflect.getKeyValue(parentNode, lastKey);
            if (nodeToRemove !== undefined) {
                clearDeep(nodeToRemove, keys.length, this.treeStructure.length - 1);
                reflect.deleteKeyValue(parentNode, lastKey);
            } else {
                return false;
            }
        }
        for (i = path.length - 2; i >= 0; i--) {
            if (reflect.size(parentNode) === 0) {
                parentNode = path[i];
                reflect.deleteKeyValue(parentNode, keys[i]);
            } else {
                break;
            }
        }
        if (this.callbacks.onEmpty && reflect.size(this.root) === 0) {
            this.callbacks.onEmpty.call(this);
        }
        return true;
    },
    size: function () {
        return getDeepSize(this.root, this.treeStructure.length - 1);
    }
});
module.exports = KeyTree;