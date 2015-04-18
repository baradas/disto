"use strict";
require("babelify/polyfill"); // for some es6 goodness

// get some dependencies
// in addition to disto, we're using immutable to hold our store data

const React = require('react'), imm = require('immutable'), ImmutableRenderMixin = require('react-immutable-render-mixin');

// pull out the magic 6
const disto = require('../index'), {
  sto,    // creates stores
  Dis,    // dispatcher class
  act,    // action constant creator
  mix,    // mixin for .observe()
  toObs,  // create observables from a keyed collection of stores
  toOb    // create observable from a store
} = disto;

window.React = React;

// make a new dispatcher
var dis = new Dis(),
  {dispatch, register, waitFor} = dis;

require('whatwg-fetch');

const services = {
  search(query, callback){   
    return fetch(`http://localhost:3000/list/${query}?rows=20`)
    	.then(res => res.json()).then(res => callback(null, res)).catch(callback)
  },
  details(id, callback){
    return fetch(`http://localhost:3000/product/${id}`)
    	.then(res => res.json()).then(res => callback(null, res)).catch(callback)
  }    
}


// actions

// declare the constants
const $ = act(`{ search { done } details { done } select backToList }`);

// now expose a bunch of actions
const $$ = {
  // search for a string
  search(query){
    dispatch($.search, query);
    services.search(query, (...args) => dispatch($.search.done, ...args))
  },
  details(id){
    dispatch($.details, id);
    services.details(id, (...args) => dispatch($.details.done, ...args))
  },
  select(id){ 
    dispatch($.select, id);
    this.details(id);
  },
  backToList(){ 
    dispatch($.backToList) 
  }
}

// stores

const listStore = sto(imm.Map({loading: false, query: '', results: [], selected: false}), 
  (state, action, ...args) => {
    switch(action){
      case $.search: 
        let [query] = args;
        return state.merge({selected: false, loading: true, query:query, error: null});

      case $.search.done: 
        const [err, res] = args;
          return (err || res.error) ? 
            state.merge(imm.fromJS({loading:false, results: [], error: err || res.error})) :
            state.merge(imm.fromJS({loading:false, results: res.data.results.products, error: null}));
       
      case $.select: 
        let [id] = args;
        return state.merge({selected: id});
       
      case $.backToList:
         return state.merge({selected: null});
      
      default: 
        return state;
    }
  }, imm.is);
register(listStore);


const detailsStore = sto(imm.Map({loading: false, query: '', results: [], selected: false}), 
  (state, action, ...args) => {
    switch(action){
      case $.details:
        let [id] = args;
        return state.merge({loading: true, id, details:null, error: null});
      
      case $.details.done:
        const [err, res] = args;
        return (err || res.error) ? 
            state.merge({loading:false, details: [], error: err || res.error}) :
            state.merge(imm.fromJS({loading:false, details: res.data, error: null}));

      default: 
        return state;
    }
  }, imm.is);
register(detailsStore);

const dumbo = sto({},() => {
  dis.waitFor(listStore, detailsStore);
  console.log({
    list: listStore().toJS(),
    details: detailsStore().toJS()
  })
  return {};
})
register(dumbo);


const App = React.createClass({
  mixins:[ImmutableRenderMixin, mix],
  observe(props){
    return {
      list: toOb(listStore), 
      details: toOb(detailsStore)
    };
  },
  render() {
    return <Search {...this.state.data} />
  }
});


const Search = React.createClass({
  mixins: [ImmutableRenderMixin],

  render() {
    var props = this.props,
      {list, details} = props,
      selected = list.get('selected');

    function vis(bool){
      return bool ? {} : {display: 'none'};
    }    
    return (
      <div className="Search">
        <input value={list.get('query')} onChange={(e) => $$.search(e.target.value)}/>
        <Results {...props} style={vis(!selected)}/>
        <Details key={details.get('id')} {...props} style={vis(!!selected)}/>        
      </div>
    );
  }
});

const Results = React.createClass({
  mixins: [ImmutableRenderMixin],
  render: function() {
    return (
      <div className="Results" style={this.props.style}>
        {this.props.list.get('results').map((item, i) => <Result product={item} key={item.get('styleid')}/>)}
      </div>
    );
  }
});

const Result = React.createClass({
  mixins: [ImmutableRenderMixin],
  onClick: function(e){
    $$.select(this.props.product.get('styleid'));
  },
  render: function() {
    return (
      <div className="Result" onClick={this.onClick} style={{width:200, display:'inline-block'}}>
        <span>{this.props.product.get('product')}</span>
        <img key={Date.now()} src={this.props.product.get('search_image')} style={{maxWidth:200}}/>      
      </div>
    );
  }
});

const Details = React.createClass({
  mixins: [ImmutableRenderMixin],
  onBack: function(){
    $$.backToList();
  },
  render: function() {
    var props = this.props, {details} = props;
    return (
      <div className='Details-cnt' style={props.style}>

        <span style={{cursor:'pointer'}} onClick={this.onBack}>back to list page</span> 
        {details.get('loading') ? 
          <span>loading...</span> : 
          <div className="Details">
            <img src={details.getIn(['details', 'styleImages', 'default', 'imageURL'])} style={{maxWidth:200}}/>
            <span>{details.getIn(['details', 'productDisplayName'])}</span>
          </div>}
      </div>   
    );
  }
});

React.render(<App/>, document.getElementById('container'));
