disto
---

- strictly follows the original [flux](http://facebook.github.io/flux) architecture
- a simple api, with no new concepts
- stores and action creators are just functions
- stores have no setters or ajax / async calls
- shorthand notation for action creators, with async function / promise support
- [live editing experience](https://github.com/threepointone/disto-hot-loader) across action creators / stores / views
- [timetravel utilities](https://github.com/threepointone/disto-example/blob/master/_rest/record.js)
- includes mixin to polyfill [sideloading data on components](https://github.com/facebook/react/issues/3398)
- react-native compatible, because apparently that's a thing now
- i love you

`npm install disto --save`

```js
// the dispatcher uses the fb dispatcher under the hood
// the api is tweaked for our stores / actions

var {Dis, act} = require('disto');  // Dispatcher class, action creator helper

var dispatcher = new Dis();

dispatcher.register(initialState, fn, compare)

dispatcher.unregister(store)

dispatcher.dispatch(action, ...args)

dispatcher.waitFor(...stores)


// Action creators can be however you choose.
// This is how I write them.

// The action creator helper takes a dispatch function and a map of key/values,
// and generates a collection of functions that, when each are called,
// dispatches a unique action along with passed arguments
// further calling any optional function passed in the map

// indeed, we use the action creator *itself* as the 'actionType'
// to much convenience

// what this means, is that you'll likely
// never have to dispatch a raw action by yourself

// also, since these are unique objects (with readable string representations),
// you also don't have to worry about global namepace clashes

var $ = act(dispatcher.dispatch, {
  init: '',   // use a blank string for default function
  a: '',
  b: function(){
    console.log('possible fire an ajax request here');
  },
  c: function(){
    // you can alias to another creator like so
    $.b();
  },
  d: function(){
    // creators can also call an optional .done() action
    // this is useful for ajax / other async operations
    setTimeout(function(){
      $.d.done('any', 'args', 'you', 'like');
    }, 500);
  }
  e: function(){
    // you can also return a Promise from an action creator,
    // and when it resolves, .done() will automatically
    // get called with (err, res), àla node
    Promise(function(resolve, reject){
      resolve('success!');
    });
  },
  f: async function(q){
    // finally, you can use es7 async functions
    // and .done() will get called when it finishes
    await fetch(`/search/${q}`);
  }
}, 'baconium' /* optional prefix to dev strings */);

// $.a is now a function

$.a(1, 2, 3);

// dispatches [$.a, 1, 2, 3] to all stores

console.log($.a.toString())

// baconium:~:a

$.b();

// dispatches [$.b], and then logs "possibly fire..."

$.c();

// dispatches [$.c], then [$.b], and then logs "possibly fire..."

$.d();

// dispatches [$.d], later [$.d.done, 'any', 'args', 'you', 'like']

$.e();

// dispatches [$.e], then [$.e.done, null, 'success!']

$.f();

// dispatches [$.f], then [$.f.done, null, response]

// these actions are consumed by stores,
// which hold all the 'state'

// Stores are represented as initial state + a function
// that get called on every [actions, ...args] message
// that passes through the "system".

let store = dispatcher.register({
  q: '',
  res: [],     // initial state
  err: null
}, function(state, action, ...args) {
  switch(action){
    case $.query:
      let [q] = args;
      return {
        ...state, q
      };

    case $.query.done:
      let [err, res] = args;
      return {
        ...state, err, res
      };

    default:
      return state;
  }
});

store.get()   // returns current value

// stores are also lightweight 'observables',

var {dispose} = store.subscribe(fn)

// we use this to hook on to react components via the .observe() polyfill

var mix = require('disto/mix');

var Component = React.createClass({
  mixins: [mix],
  observe: function(props){
    return {a: store1, b: store2};
  },
  render: function(){
    var data = this.state.data;
    return <div>
      current value of store 1 : {data.a}
      current value of store 2 : {data.b}
    </div>;
  }
});

```

tests
---
`npm test`

