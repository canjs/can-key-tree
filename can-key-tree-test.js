var QUnit = require( 'steal-qunit' );
var KeyTree = require( './can-key-tree' );
var canReflect = require( 'can-reflect' );

QUnit.module( 'can-key-tree' );

QUnit.test('basics', function () {
	var keyTree = new KeyTree( [Object, Object, Array] );

	function handler1 () {}
	function handler2 () {}

	QUnit.equal( keyTree.size(), 0, "empty" );

	keyTree.add( ["click", "li", handler1] );
	keyTree.add( ["click", "li", handler2] );
	QUnit.equal( keyTree.size(), 2, "2" );

	QUnit.deepEqual( keyTree.get( ["click", "li"] ), [handler1, handler2] );

	keyTree.delete( ["click", "li", handler1] );
	QUnit.equal( keyTree.size(), 1, "1" );

	keyTree.delete( ["click", "li", handler1] );
	QUnit.equal( keyTree.size(), 1, "empty" );

	keyTree.delete( ["click", "li", handler2] );
	QUnit.equal( keyTree.size(), 0, "empty" );
});

QUnit.test('root isnt a constructor', function () {
	var root = {};
	var keyTree = new KeyTree( [root, Object, Array] );

	function handler1 () {}
	function handler2 () {}

	QUnit.equal( keyTree.size(), 0, "empty" );

	keyTree.add( ["click", "li", handler1] );
	keyTree.add( ["click", "li", handler2] );
	QUnit.equal( canReflect.size( root ), 1, "2" );

	QUnit.deepEqual( keyTree.get( ["click", "li"] ), [handler1, handler2] );

	keyTree.delete( ["click", "li", handler1] );
	QUnit.equal( keyTree.size(), 1, "1" );

	keyTree.delete( ["click", "li", handler1] );
	QUnit.equal( keyTree.size(), 1, "empty" );

	keyTree.delete( ["click", "li", handler2] );
	QUnit.equal( keyTree.size(), 0, "empty" );
});

QUnit.test("delete base recursively removes all properties", 2, function () {
	var MyMap = function ( parentKey ) {
		QUnit.equal( parentKey, "element", "got the right parent key" );
		this.data = {};
	};
	canReflect.assignSymbols( MyMap.prototype, {
		"can.setKeyValue": function ( key, value ) {
			this.data[key] = value;
		},
		"can.getKeyValue": function ( key ) {
			return this.data[key];
		},
		"can.deleteKeyValue": function ( key ) {
			QUnit.equal( key, "click", "deleted 2" );
			delete this.data[key];
		},
		"can.getOwnEnumerableKeys": function () {
			return Object.keys( this.data );
		}
	} );

	var myTree = new KeyTree( [Object, MyMap, Object, Array] );

	myTree.add( ["element", "click", "li", "A"] );
	myTree.add( ["element", "click", "li", "B"] );
	myTree.delete( ["element"] );
});

if ( typeof document !== "undefined" && document.body && document.body.matches ) {
	QUnit.test("event delegation example", function () {
		var fixture = document.querySelector( "#qunit-fixture" );
		fixture.innerHTML = "<li><a id='anchor'>click</a></li>";

		var EventHandler = function ( parentKey ) {
			this.element = parentKey;
			this.events = {};
			this.delegated = {};
		};

		canReflect.assignSymbols( EventHandler.prototype, {
			"can.setKeyValue": function ( eventName, handlersBySelector ) {
				this.delegated[eventName] = function ( ev ) {
					canReflect.each( handlersBySelector, function ( handlers, selector ) {
						var cur = ev.target;
						do {
							if ( cur.matches( selector ) ) {
								handlers.forEach(function ( handler ) {
									handler.call( cur, ev );
								});
							}
							cur = cur.parentNode;
						} while ( cur && cur !== ev.currentTarget );
					});
				};
				this.events[eventName] = handlersBySelector;
				this.element.addEventListener( eventName,this.delegated[eventName] );
			},
			"can.getKeyValue": function ( eventName ) {
				return this.events[eventName];
			},
			"can.deleteKeyValue": function ( eventName ) {
				this.element.removeEventListener( eventName,this.delegated[eventName] );
				delete this.delegated[eventName];
				delete this.events[eventName];
			},
			"can.getOwnEnumerableKeys": function () {
				return Object.keys( this.events );
			}
		});

		var eventTree = new KeyTree( [Map, EventHandler, Object, Array] );

		var dispatchNum = 0;
		function dispatch ( el ) {
			var event = document.createEvent( "HTMLEvents" );
			event.initEvent( "click", true, false );
			dispatchNum++;
			document.querySelector( el ).dispatchEvent( event );
		}

		function handler1 () {
			QUnit.equal( dispatchNum, 1, "only dispatched once" );
		}

		eventTree.add( [fixture, "click", "li", handler1] );
		dispatch( "#anchor" );

		eventTree.delete( [fixture, "click", "li", handler1] );
		dispatch( "#anchor" );

		function handler2 () {
			QUnit.equal( dispatchNum, 3, "handler2" );
		}
		function handler3 () {
			QUnit.equal( dispatchNum, 3, "handler3" );
		}

		eventTree.add( [fixture, "click", "li", handler2] );
		eventTree.add( [fixture, "click", "li", handler3] );
		dispatch( "#anchor" );

		eventTree.delete( [fixture] );
		dispatch( "#anchor" );
	});
}

QUnit.test(".getNode and .get", function () {
	var keyTree = new KeyTree( [Object, Object, Array] );

	function handler1 () {}
	function handler2 () {}

	keyTree.add( ["click", "li", handler1] );
	keyTree.add( ["click", "li", handler2] );
	keyTree.add( ["click", "span", handler2] );

	var nodeShouldBe = {
		li: [handler1, handler2],
		span: [handler2]
	};

	QUnit.deepEqual( keyTree.getNode( ["click"] ), nodeShouldBe, ".getNode works" );

	QUnit.deepEqual( keyTree.get( ["click"] ), [handler1, handler2, handler2], ".get works" );
});

QUnit.test("lifecycle callbacks", function () {
	var calls = 0;
	var keyTree = new KeyTree( [Object, Object, Array], {
		onFirst: function () {
			QUnit.equal( calls, 1, "called when the first node is added" );
		},
		onEmpty: function () {
			QUnit.equal( calls, 3, "called when all nodes are removed" );
		}
	});

	function handler1 () {}
	function handler2 () {}

	calls++;
	keyTree.add( ["click", "li", handler1] );

	calls++;
	keyTree.add( ["click", "li", handler2] );

	calls++;
	keyTree.delete( [] );
});

QUnit.test("handle missing keys", function () {
	var keyTree = new KeyTree( [Object, Array] );

	QUnit.notOk( keyTree.delete( ["abc"] ) );
	QUnit.ok( true, "no error" );
});

QUnit.test("add too deep (#3)", function () {
	var keyTree = new KeyTree( [Object, Array] );

	try {
		keyTree.add( [1, 2, 3, 4, 5] );
	} catch ( e ) {
		QUnit.equal( e.message, "can-key-tree: Can not add path deeper than tree." );
	}
});

QUnit.test("empty deep", function () {
	var keyTree = new KeyTree( [Object, Object, Object, Array] );
	QUnit.deepEqual( keyTree.get( "foo" ), [] );
});

QUnit.test("delete can get path of nodes deleted", function(){
	var keyTree = new KeyTree([Object, Object,Array]);
	var keys = [
		["first","mutate", "abc"],
		["first",'notify',"def"]
	];

	keyTree.add(keys[0]);
	keyTree.add(keys[1]);
	var KEYS = [];
	keyTree.delete([], function(event,queue, name){
		KEYS.push([event, queue, name]);
	});
	QUnit.deepEqual(KEYS, keys, "got nodes that were deleted([])");


	keyTree.add(keys[0]);
	keyTree.add(keys[1]);
	KEYS = [];
	keyTree.delete(["first"], function(event,queue, name){
		KEYS.push([event, queue, name]);
	});
	QUnit.deepEqual(KEYS, keys, "got nodes that were deleted([key])");


	keyTree.add(keys[0]);
	keyTree.add(keys[1]);
	KEYS = [];
	keyTree.delete(["first","mutate","abc"], function(event,queue, name){
		KEYS.push([event, queue, name]);
	});
	QUnit.deepEqual(KEYS, [keys[0]], "got nodes that were deleted([key])");
});


QUnit.test('isEmpty', function () {
	var keyTree = new KeyTree( [Object, Object, Array] );

	function handler1 () {}
	function handler2 () {}

	QUnit.equal( keyTree.isEmpty(), true, "empty" );

	keyTree.add( ["click", "li", handler1] );
	keyTree.add( ["click", "li", handler2] );
	QUnit.equal( keyTree.isEmpty(), false, "2" );

	QUnit.deepEqual( keyTree.get( ["click", "li"] ), [handler1, handler2] );

	keyTree.delete( ["click", "li", handler1] );
	QUnit.equal( keyTree.isEmpty(), false, "1" );

	keyTree.delete( ["click", "li", handler1] );
	QUnit.equal( keyTree.isEmpty(), false, "empty" );

	keyTree.delete( ["click", "li", handler2] );
	QUnit.equal( keyTree.isEmpty(), true, "empty" );
});
