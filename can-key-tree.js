var reflect = require("can-reflect");

var KeyTree = function(treeStructure){
    this.treeStructure = treeStructure;
    var FirstConstructor = treeStructure[0];
    this.root = new FirstConstructor();
};

KeyTree.prototype.add = function(keys) {
    var place = this.root;
    for(var i = 0; i < keys.length - 1 ; i++) {
        var key = keys[i];
        var store = reflect.getKeyValue(place, key);
        if(!store) {
            store = new this.treeStructure[i+1]();
            reflect.setKeyValue(place, key, store);
        }
        place = store;
    }
    if(reflect.isMoreListLikeThanMapLike(place)) {
        reflect.addValues(place, [keys[keys.length - 1]]);
    } else {
        // only containers supported at the end
        debugger;
    }
};
KeyTree.prototype.get = function(keys) {
    var place = this.root;
    for(var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var store = reflect.getKeyValue(place, key);
        if(!store) {
            return;
        }
        place = store;
    }
    return place;
};
KeyTree.prototype.delete = function(keys){
    var place = this.root;
    var roots = [this.root];
    for(var i = 0; i < keys.length - 1 ; i++) {
        var key = keys[i];
        var store = reflect.getKeyValue(place, key);
        if(!store) {
            return false;
        } else {
            roots.push(store)
        }
        place = store;
    }

    if(reflect.isMoreListLikeThanMapLike(place)) {
        reflect.removeValues(place, [keys[keys.length - 1]]);
    } else {
        // only containers supported at the end
        debugger;
    }
    debugger;
    for(i = roots.length - 2; i >= 0 ; i--) {
        if( reflect.size(place) === 0 ) {
            place = roots[i];
            reflect.deleteKeyValue(place, keys[i]);
        } else {
            return true;
        }
    }
    return true;
};


function getDepth(root, level) {
    if(level === 0) {
        return reflect.size( root );
    } else if( reflect.size( root ) === 0 ) {
        return 0;
    } else {
        var count = 0;
        reflect.each(root, function(value, key){
            count += getDepth(value, level - 1);
        });
        return count;
    }
}

KeyTree.prototype.size = function(){
    return getDepth(this.root, this.treeStructure.length-1);
};
module.exports = KeyTree;
