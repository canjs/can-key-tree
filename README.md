# can-key-tree

[![Build Status](https://travis-ci.org/canjs/can-key-tree.svg?branch=master)](https://travis-ci.org/canjs/can-key-tree)

`can-key-tree` can be used to store items in a tree-like structure where the nodes of
the tree can be any type that works with [can-reflect](https://canjs.com/doc/can-reflect.html).

## Use

Import the `KeyTree` constructor from `can-key-tree`:

```js
import KeyTree from  "can-key-tree";
```

Create an instance of `KeyTree` with an array of types.  An instance of each type
will be used as the nodes of the tree. The following creates a tree structure
3 levels deep:


```js
const keyTree = new KeyTree( [ Object, Object, Array ], { onFirst, onEmpty } );
```

Once you've created a `keyTree`, you can `.add`, `.delete` and `.get` values from
it.

#### `.add(keys)`

The following adds three `handlers`:

```js
function handler1() {}
function handler2() {}
function handler3() {}

keyTree.add( [ "click", "li", handler1 ] );
keyTree.add( [ "click", "li", handler2 ] );
keyTree.add( [ "click", "span", handler3 ] );
```

The `keyTree` data structure will look like:

```js
{
	"click": {
		"li": [ handler1, handler2 ],
		"span": [ handler3 ]
	}
}
```

#### `.get(keys)`

To get all the `li` `click` handlers, use `.get`:

```js
keyTree.get( [ "click", "li" ] ); //-> [handler1, handler2]
```

To get all `click` handlers, you can also use `.get`:


```js
keyTree.get( [ "click" ] ); //-> [handler1, handler2, handler3]
```

#### `.delete(keys)`

To delete a handler, use `.delete`:

```js
keyTree.delete( [ "click", "li", handler1 ] );
```

The `keyTree` data structure will look like:

```js
{
	"click": {
		"li": [ handler2 ],
		"span": [ handler3 ]
	}
}
```

To delete the remaining `click` handlers:

```js
keyTree.delete( [ "click" ] );
```

The `keyTree` data structure will look like:

```js
{}
```

## Advanced Use

Often, when a node is created, there needs to be some initial setup, and when a
node is empty, some teardown.

This can be achieved by creating custom types.  For example, perhaps we want to
build an event delegation system where we can delegate from an element like:

```js
eventTree.add( [ document.body, "click", "li", handler ] );
```

And remove that handler like:

```js
eventTree.delete( [ document.body, "click", "li", handler ] );
```


We can do that as follows:

```js
// Create an event handler type.
const Delegator = function( parentKey ) {

	// Custom constructors get called with their parentKey.
	// In this case, the `parentKey` is the element we will
	// delegate from.
	this.element = parentKey;

	// the nested data `{click: [handlers...], dblclick: [handlers...]}`
	this.events = {};

	// the callbacks added for each handler.
	this.delegated = {};
};
canReflect.assignSymbols( Delegator.prototype, {

	// when a new event happens, setup event delegation.
	"can.setKeyValue": function( eventName, handlersBySelector ) {

		this.delegated[ eventName ] = function( ev ) {
			canReflect.each( handlersBySelector, function( handlers, selector ) {
				let cur = ev.target;
				do {
					if ( cur.matches( selector ) ) {
						handlers.forEach( function( handler ) {
							handler.call( cur, ev );
						} );
					}
					cur = cur.parentNode;
				} while ( cur && cur !== ev.currentTarget );
			} );
		};
		this.events[ eventName ] = handlersBySelector;
		this.element.addEventListener( eventName, this.delegated[ eventName ] );
	},
	"can.getKeyValue": function( eventName ) {
		return this.events[ eventName ];
	},

	// when an event gets removed, teardown event delegation and clean up.
	"can.deleteKeyValue": function( eventName ) {
		this.element.removeEventListener( eventName, this.delegated[ eventName ] );
		delete this.delegated[ eventName ];
		delete this.events[ eventName ];
	},

	// we need to know how many items at this node
	"can.getOwnEnumerableKeys": function() {
		return Object.keys( this.events );
	}
} );

// create an event tree that stores:
// - "element being delegated" ->
//   - A "delegator" instance for an event ->
//     - The "selectors" we are delegating ->
//       - The handlers to call
const eventTree = new KeyTree( [ Map, Delegator, Object, Array ] );


// to listen to an event:
function handler() {
	console.log( "an li clicked" );
}

eventTree.add( [ document.body, "click", "li", handler ] );

// to stop listening:
eventTree.delete( [ document.body, "click", "li", handler ] );

// to stop listening to all clicks on the body:
eventTree.delete( [ document.body, "click" ] );

// to stop listening to all events on the body:
eventTree.delete( [ document.body ] );
```
