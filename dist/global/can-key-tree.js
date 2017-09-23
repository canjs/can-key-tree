/*[global-shim-start]*/
(function(exports, global, doEval) {
	// jshint ignore:line
	var origDefine = global.define;

	var get = function(name) {
		var parts = name.split("."),
			cur = global,
			i;
		for (i = 0; i < parts.length; i++) {
			if (!cur) {
				break;
			}
			cur = cur[parts[i]];
		}
		return cur;
	};
	var set = function(name, val) {
		var parts = name.split("."),
			cur = global,
			i,
			part,
			next;
		for (i = 0; i < parts.length - 1; i++) {
			part = parts[i];
			next = cur[part];
			if (!next) {
				next = cur[part] = {};
			}
			cur = next;
		}
		part = parts[parts.length - 1];
		cur[part] = val;
	};
	var useDefault = function(mod) {
		if (!mod || !mod.__esModule) return false;
		var esProps = { __esModule: true, default: true };
		for (var p in mod) {
			if (!esProps[p]) return false;
		}
		return true;
	};

	var hasCjsDependencies = function(deps) {
		return (
			deps[0] === "require" && deps[1] === "exports" && deps[2] === "module"
		);
	};

	var modules =
		(global.define && global.define.modules) ||
		(global._define && global._define.modules) ||
		{};
	var ourDefine = (global.define = function(moduleName, deps, callback) {
		var module;
		if (typeof deps === "function") {
			callback = deps;
			deps = [];
		}
		var args = [],
			i;
		for (i = 0; i < deps.length; i++) {
			args.push(
				exports[deps[i]]
					? get(exports[deps[i]])
					: modules[deps[i]] || get(deps[i])
			);
		}
		// CJS has no dependencies but 3 callback arguments
		if (hasCjsDependencies(deps) || (!deps.length && callback.length)) {
			module = { exports: {} };
			args[0] = function(name) {
				return exports[name] ? get(exports[name]) : modules[name];
			};
			args[1] = module.exports;
			args[2] = module;
		} else if (!args[0] && deps[0] === "exports") {
			// Babel uses the exports and module object.
			module = { exports: {} };
			args[0] = module.exports;
			if (deps[1] === "module") {
				args[1] = module;
			}
		} else if (!args[0] && deps[0] === "module") {
			args[0] = { id: moduleName };
		}

		global.define = origDefine;
		var result = callback ? callback.apply(null, args) : undefined;
		global.define = ourDefine;

		// Favor CJS module.exports over the return value
		result = module && module.exports ? module.exports : result;
		modules[moduleName] = result;

		// Set global exports
		var globalExport = exports[moduleName];
		if (globalExport && !get(globalExport)) {
			if (useDefault(result)) {
				result = result["default"];
			}
			set(globalExport, result);
		}
	});
	global.define.orig = origDefine;
	global.define.modules = modules;
	global.define.amd = true;
	ourDefine("@loader", [], function() {
		// shim for @@global-helpers
		var noop = function() {};
		return {
			get: function() {
				return { prepareGlobal: noop, retrieveGlobal: noop };
			},
			global: global,
			__exec: function(__load) {
				doEval(__load.source, global);
			}
		};
	});
})(
	{},
	typeof self == "object" && self.Object == Object ? self : window,
	function(__$source__, __$global__) {
		// jshint ignore:line
		eval("(function() { " + __$source__ + " \n }).call(__$global__);");
	}
);

/*can-key-tree@0.0.0#can-key-tree*/
define('can-key-tree', [
    'require',
    'exports',
    'module',
    'can-reflect'
], function (require, exports, module) {
    var reflect = require('can-reflect');
    function isBuiltInPrototype(obj) {
        return obj === Object.prototype || Object.prototype.toString.call(obj) !== '[object Object]' && Object.prototype.toString.call(obj).indexOf('[object ') !== -1;
    }
    var KeyTree = function (treeStructure) {
        this.treeStructure = treeStructure;
        var FirstConstructor = treeStructure[0];
        if (reflect.isConstructorLike(FirstConstructor)) {
            this.root = new FirstConstructor();
        } else {
            this.root = FirstConstructor;
        }
    };
    KeyTree.prototype.add = function (keys) {
        var place = this.root;
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
    };
    KeyTree.prototype.get = function (keys) {
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
            if (!store) {
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
        } else {
            clear(reflect.getKeyValue(place, lastKey), keys.length, this.treeStructure.length - 1);
            reflect.deleteKeyValue(place, lastKey);
        }
        for (i = roots.length - 2; i >= 0; i--) {
            if (reflect.size(place) === 0) {
                place = roots[i];
                reflect.deleteKeyValue(place, keys[i]);
            } else {
                return true;
            }
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
/*[global-shim-end]*/
(function(global) { // jshint ignore:line
	global._define = global.define;
	global.define = global.define.orig;
}
)(typeof self == "object" && self.Object == Object ? self : window);