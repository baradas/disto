import invariant from 'flux/lib/invariant';
import {Dispatcher} from 'flux';

// @class Dis
// every app should have one central dispatcher
// all messages must go through this dispatcher
// all state changes happen synchronously with every message
export class Dis {
  constructor() {
    this.$ = new Dispatcher();    // we use the OG dispatcher under the hood
    this.tokens = new WeakMap();  // store all the tokens returned by the dipatcher
    ['register', 'unregister', 'dispatch', 'waitFor'] // bind these functions, so you can pass them around
      .forEach(fn => this[fn] = this[fn].bind(this));
  }

  register(initial, reduce = o => o, compare = (a, b) => a === b){
    var state = initial, handlers = [];

    const store = {
      get: () => state,
      subscribe: (opts = {}, immediate = true) => {
        if(typeof opts === 'function'){
          opts = {onNext: opts};
        }
        let onNext = opts.onNext || (x => x);
        handlers.push(onNext);
        // run it once to send initial value
        if(immediate){
          onNext(state);
        }
        return {
          dispose() {
            handlers = handlers.filter(x => x !== onNext);
            onNext = null;
          }
        };
      }
    };

    let reg = ::this.$.register;
    // this is to trip up disto-hot
    // i know, i know :(

    this.tokens.set(store,
      reg(payload => {
        var prevState = state;
        state = reduce(state, payload.action, ...payload.args); // the only line worth anything in this library
        if(state === undefined){
          console.warn('have you forgotten to return state?');
        }
        if(!compare(prevState, state)){
          handlers.forEach(fn => fn(state, prevState));
        }
        prevState = null;
      }));

    return store;
  }

  unregister(store) {
    invariant(store, 'cannot unregister nothing');
    invariant(this.tokens.has(store), 'was not a registered store'); // should this be silent?
    this.$.unregister(this.tokens.get(store));
    this.tokens.delete(store);
    return this;
  }

  // synchronous message dispatch
  dispatch(action, ...args) {
    invariant(action, 'cannot dispatch a blank action');
    this.$.dispatch({ action, args });
    return this;
  }

  // beware, this is synchronous
  waitFor(...stores) {
    invariant(stores.length > 0, 'cannot wait for no stores');
    this.$.waitFor([...stores.map(store => this.tokens.get(store))]);
    return this;
  }
  // todo - .destroy();
}

// ACTIONS
export function act(dispatch, map, prefix){
  let o = {};

  function str(...k){
    return [prefix || '', '~', ...k].filter(x => !!x).join(':');
  }

  Object.keys(map).forEach(key => {
    let fn = map[key] || (() => {});
    o[key] = (...args) => {
      dispatch(o[key], ...args);
      const p = fn(...args);
      if(p instanceof Promise){
        p.then(res => o[key].done(res)).catch(err => o[key].error(err));
      }
      return p;
    };

    o[key].toString = () => str(key);

    o[key].done = (...args) => dispatch(o[key].done, ...args);
    o[key].done.toString = () => str(key, 'done');

    o[key].error = (...args) => dispatch(o[key].error, ...args);
    o[key].error.toString = () => str(key, 'error');

  });
  return o;
}

// outputs an array of actions on the object.
export function debug(acts){
  return Object.keys(acts).map(x => acts[x].toString());
}
