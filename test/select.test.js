"use strict";
// call with ./util/node_modules/vows/bin/vows util/test/select.test.js

var
vows     = require('vows'),
assert   = require('assert'),
select   = require('../select'),
x        = require('x-common').extend;

function topic(s,tests){ var _={};x(_[s]={ topic: function(){ return select; }},tests); return _; }

function exp(data,expr,opts,asserts){
	var _={};
	x(
		_['"'+expr+'" on '+JSON.stringify(data)+' with options '+JSON.stringify(opts)]={topic: function(select){ return select(data,expr,opts); } },
		asserts
	);
	return _;
}

function is_not_empty(){ return {'is not empty':function(result){ assert(!result.empty()); } }; }
function is_empty    (){ return {'is empty'    :function(result){ assert( result.empty()); } }; }
function is_equal(nodes){
	var _={};_['is equal '+JSON.stringify(nodes)]=function(result){ assert.deepEqual( result.nodes(), nodes); };
	return _;
}
function count(expected){
	var _={};_['count '+expected]=function(result){ assert.deepEqual( result.nodes().length, expected); };
	return _;
}

var fixture_users = {
	users: [
		{ person : { name: 'joe' , age: 20 , address: { street: 's1' } } },
		{ person : { name: 'mary', age: 35 , friends : { person: { name: 'bob' } } } },
		{ person : { name: 'bob' , age: 40 } },
	]
};

var suite = vows.describe('select');
suite.addBatch(x(
	/*topic('simple expressions',x(
		exp({foo:{a:1}},'.foo',{},x(
			is_not_empty(),
			is_equal([{a:1}])
		))
	)),
	topic('null',x(
		exp({foo:{a:null}},'.a',{skip:[]},x(
			!is_empty()
		))
	)),
	topic('null',x(
		exp({foo:{a:null}},'.a',{},x(
			is_empty()
		))
	)),*/
	topic('{}',x(
		exp({foo:{a:{}}},'.a',{},x(
			is_not_empty(),
			is_equal([{}])
		))
	))/*,
	topic('union ,',x(
		exp({foo:{a:1},b:2},'.a , .b',{},x(
			is_not_empty(),
			is_equal([1,2])
		))
	)),
	topic('difference -',x(
		exp({foo:{a:1},b:1},'.a - .b',{},x(
			is_empty()
		)),
		exp({foo:{a:1},b:2},'.a - .b',{},x(
			is_not_empty(),
			is_equal([1])
		))
	)),
	topic('"',x(
		exp({foo:'bar',bar:{foo:'rab'}},".foo:val('bar')",{},x(
			is_not_empty()
		))
	)),
	topic('and',x(
		exp({foo:{a:1},b:2},'.a and .b',{},x(
			is_not_empty()
		))
	)),
	topic('not',x(
		exp({foo:{a:1},b:2},'not .c and .b',{},x(
			is_not_empty()
		))
	)),
	topic('not ( <empty> and <not empty> ) = not <empty> = <not empty>',x(
		exp({foo:{a:1},b:2},'not ( .c and .b )',{},x(
			is_not_empty()
		))
	)),
	topic('or',x(
		exp({foo:{a:1},b:2},'.c or .b or .a',{},x(
			is_not_empty()
		))
	)),
	topic('or',x(
		exp({foo:{a:1},b:2},'.c and .b or .d',{},x(
			is_empty()
		)),
		exp({foo:{a:1},b:2},'.c or .b and .a',{},x(
			is_not_empty()
		))
	)),
	topic('true and false',x(
		exp({foo:true},'.foo',{},x(
			is_equal([true]),
			is_not_empty()
		)),
		exp({bar:[{foo:false},{foo:false}]},'.foo',{skip:select.skip.not(false)},x(
			is_equal([false,false]),
			is_not_empty()
		)),
		exp({bar:[{foo:false},{foo:false}]},'.foo',{},x( // we do not skip false
			is_equal([]),
			is_empty()
		)),
		exp({bar:[{foo:'x'},{foo:false}]},'.foo',{skip:select.skip.not(false).add('x')},x(
			is_equal([false]),
			is_not_empty()
		))
	)),
	topic('val',x(
		exp({foo:'stringtest'},".foo:val('stringtest')",{},x(
			is_equal(['stringtest'])
		))*/
		/*,
		//this doesn't work because JSONSelect doesn't support it... so what?
		exp({foo:100},".foo:epr(x=100)",{},x(
			is_equal([100])
		)),
		exp({foo:false},".foo:val(false)",{},x(
			is_equal([false])
		))*/
/*	)),
	topic('expressionString', x(
		exp({blafasel:"bla"}, '.blafasel:expr(x="bla")',{},x(
			is_equal(["bla"]),
			is_not_empty()
		))
	)),
	topic('expressionNumber', x(
		exp({blafasel:1089}, '.blafasel:expr(x=1089)',{},x(
			is_equal([1089]),
			is_not_empty()
		))
	)),
	topic('expressionBool', x(
		exp({blafasel:true}, '.blafasel:expr(x=true)', {}, x(
			is_equal([true]),
			is_not_empty()
		))
	)),
	topic('test users fixture .users .person', x(
		exp(fixture_users, '.users .person',{},x(
			count(4)
		))
	)),
	topic('test users fixture .users .person', x(
		exp(fixture_users, '.users > .person',{},x(
			count(0)
		))
	)),
	topic('test users fixture .users > object > .person', x(
		exp(fixture_users, '.users > object > .person',{},x(
			count(3)
		))
	)),
	topic('test users fixture .person:has( .age:expr( x < 30 || x >= 40 ) )', x(
		exp(fixture_users, '.person:has( .age:expr( x < 30 || x >= 40 ) )',{},x(
			count(2)
		))
	))*/
)).exportTo(module,{error:false});
