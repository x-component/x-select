'use strict';

/**
 * x-select
 * ========
 *
 * This module can be used to select elements from nested *JSON data* objects with a css like syntax.
 *
 * It is based on [js-select](https://github.com/harthur/js-select) and thereby indreclty also on [JSONSelect](http://jsonselect.org/) and [js-traverse](https://github.com/substack/js-traverse)
 *
 * As an extension to the json selector syntax x-select also supports
 * boolean expressions for sets. The sequential binary boolean logic operators 'and', 'or' and the unary 'not' are supported. Brackets`(` `)` can be used to create nested boolean expressions.  True and False are then represented by sets:
 * an empty set represents false. A non empty set [true] represents true.
 *
 *
 * Note: Per default the selecting of elments is done case insensitve and the following values are skipped from the result set `undefined`, `null`, `false`, `NaN`
 *
 * x-select is particularly usefull to handle deeply nested JSON structures as they are often returned by REST services. (See examples)
 *
 *
 * **usage**
 *
 * select
 * ------
 *
 *     var select = require('x-select');
 *
 *     var result = select( object, selector, options );
 *
 *
 *
 * result.forEach(function(node){...})
 * ------------------------------------
 *
 * You can loop over each found node within the structure
 *
 *     result.forEach(function(node){
 *         // this defines the context for the found element, see js-traverse documentation
 *         // you can use p.e. this.remove(); or this.update(new_value);
 *     });
 *
 *
 * result.nodes()
 * --------------
 * This delivers simply an array of all found nodes
 *
 *
 * result.empty()
 * --------------
 * returns if the result set is empty
 *
 *
 * result.first()
 * -------------
 * Deliverse the first result found
 *
 *
 * options.skip
 * ------------
 *
 * options.skip is an array, which contains values to skip from the result set.
 * select.skip: contains the default array
 * To pass a changed skip array: on can use the default one use the functions `not` and `add` of that array, to modify it as shown
 * here:
 *
 *     select(obj, ' .property ' , {skip: select.skip.not(false) } );
 *     select(obj, ' .property ' , {skip: select.skip.add('x').not(false) } );
 *
 *
 *
 * **Examples:**
 *
 * assume we have the following JSON structure:
 *
 *     var o = {
 *         users: [
 *             { person : { name: 'joe' , age: 20 , active:true, address: { street: 's1' } } },
 *             { person : { name: 'mary', age: 35 , active:false, friends : { person: { name: 'bob' } } },
 *             { person : { name: 'bob' , age: 40 , active:true} }
 *        ]
 *     };
 *
 *
 *     var persons1 = select( o, '.users .person' ).nodes(); // returns 4 nodes {name: ....} also the person: {...} within friends
 *
 *     var persons2 = select( o, '.users > .person' ); // returns 0 nodes
 *
 *     var persons3 = select( o, '.users > object > .person' ); // returns 3 nodes {name: ....} directly within the objects in the array
 *
 *     var person   = select( o, ' .person:has( .age:expr( x < 30 || x >= 40 ) ) ').first(); // get the first person younger then 30 or older then 40
 *     var name     = select( person,'.name).first(); // joe
 *     var name2    = select( select(o, ' .person:has( .age:expr( x < 30 || x >= 40 ) ) ').nodes(), '.name' ).first(); // joe
 *
 *     var names   = select(o, ' .age:expr( x < 30 || x >= 40 ) ~ .name ').nodes(); // [ 'joe', 'bob' ]
 *
 *     var name_has_friend_bob = select(o, ' .person:has( .friends .name:val("bob")) > .name' ).first(); // 'mary'
 *
 *     var there_are_users_with_age_40_or_25  = !select(o,'.age:expr(x=40) or .age:expr(x=25)').empty();  // true
 *     var there_are_users_with_age_40_and_25 = !select(o,'.age:expr(x=40) and .age:expr(x=25)').empty(); // false
 *     var there_are_users_with_age_40_and_20 = !select(o,'.age:expr(x=40) and .age:expr(x=20)').empty(); // true
 *
 *     var active_user_count     = select(o,'.active').nodes().length; // 2, false is skipped per default nodes is [ true, true ]
 *     var has_active_flag_count = select(o,'.active',{skip:select.skip.not(false)}).nodes().length; // 3, nodes is [ true, false, true ]
 *
 *     // joe's age
 *     var age = select( o, ' .name:val("joe") ~ .age' ).first(); // 20
 *
 *     // today is joe's birthday, so increment the age
 *     select( o, ' .name:val("joe") ~ .age' ).forEach(function(age){
 *         this.update(age+1);
 *     });
 *
 *     var new_age = select( o, ' .name:val("joe") ~ .age' ).first(); // 21
 *
 *
 *
 * Notes:
 *
 * If the `object` is a dom tree node, `select()` will call `object.ownerDocument.defaultView.$` and return the result. In this case css selectors supported by
 * the underlying css selector engine are supported.
 *
 */
var
	select = require('js-select'),
	log    = require('x-log'),
	equals = require('x-common').equals,
	extend = require('x-common').extend;

/*!
 * select for JSON or DOM nodes:
 * if obj is a dom node use the xui $ selector find result set as an array of dom elements, based on querySelectorAll();
 * options root : use this as context if :root is given
 * options self : include the obj itself in the search scope
 */
var _select = function(obj,s,options){
	options = options || {};
	
	var root = options.root;
	
	root = root || obj;
	
	// TODO handle this correctly with parsed selectors
	if(~s.indexOf(':root')) obj = root;
	
	if( !obj ) return [];
	
	if( !obj.nodeType ) return select(options.self?{object:obj}:obj, s, extend({caseInsensitive:true},options) );
	
	var
		doc    = obj.ownerDocument || obj,
		win    = doc.defaultView,
		$      = win ? win.$ : null,
		result;
	
	if( !$ ) return select(options.self?{object:obj}:obj, s, extend({caseInsensitive:true},options) );
	
	s=s.replace(':root','');
	
	// stupid resource intense to remove subtree from document here
	// but the sizzle engine of domino for querySelectorAll does stupid things otherwise:
	// it is not w3c conform as it doesn't limit itself on the real subtree
	// and if there is no parent it takes the node itself as part of the
	// context...
	if(obj.nodeType == 1 && obj.parentNode ){ // element with parent
		var
			placeholder = obj.ownerDocument.createElement('span'),
			context     = !options.self ? obj.ownerDocument.createElement('div') : null,
			parent      = obj.parentNode ;
		
		placeholder.setAttribute('data-tmp','select-placeholder'); // this is just a marker to identify the origin of element if something goes wrong
		if( context ) context.setAttribute('data-tmp','select-context'); // this is just a marker to identify the origin of element if something goes wrong
		
		parent.insertBefore(placeholder,obj);
		parent.removeChild(obj);
		if( context ) context.appendChild(obj);
		
		result = $(s,obj); //elementSelect(s,obj);
		
		parent.insertBefore(obj,placeholder);
		parent.removeChild(placeholder);
		placeholder=null;
		context=null;
	} else {
		result = $(s,obj); //elementSelect(s,obj);
	}
	
	result.forEach = result.each;
	
	return result;
};

var M;
module.exports = extend(M=function F(obj, s/*!selectors string*/,options) {
	try {
		var exp=F.parse(s);
		return (exp.string ? F.select(obj,exp.string,options) : ( F.eval(obj,exp,options)) ? F.not_empty : F.empty );
	}catch( e ){
		log.errorl && log.error('expression parsing error',{selector:s,error:e});
	}
	return F.empty;
},{
	select:extend(function F(obj, s/*!selectors string*/,options) {// get result then patch forEach and add empty
		
		options = extend({skip:F.skip},options || {});
		
		// we support intersection (-) in addition to union (,) , NOTE we do not support brackets for union / difference
		s=(' '+s+' ').split(' - ');
		
		var root = options.root;
		root = root || obj;
		
		var result = _select(obj,s[0],options);
		extend(result,{
			forEach:(function(forEach){ return function(cb){
				forEach.call(this,function(e){
					// is contained in any subsequent set to diff. from all, then it does not belong to the final set.
					for(var i=s.length, equal=false; i-->1 && !equal; ) _select(obj,s[i],root).forEach( function(se){ equal=equal||equals(e,se); } );
					if(!equal && !~options.skip.indexOf(e) ) cb.call(this,e);
				});
			}; })(result.forEach),
			
			nodes:function(first){ // first true means, just the first node in an array, no node found then array is empty
				var nodes = [];
				this.forEach(function(e){
					nodes.push(e);
					if(first && this && this.block ) this.block();
				});
				return first && nodes.length ? [nodes[0]] : nodes;
			},
			
			empty:function(){
				return 0 === this.nodes(true).length;
			},
			
			first:function(){
				var nodes = this.nodes(true);
				return nodes.length ? nodes[0] : void 0;
			}
		});
		return result;
	},{
		// these values are skipped in for each and therefore influence first and empty
		// p.e. a select with just a null as result is then regarded as empty.
		skip:[void 0, null, NaN, false ]
	}),
	
	empty:{
		nodes   :function(){ return [];     },
		forEach :function(){                },
		empty   :function(){ return true;   },
		first   :function(){ return void 0; }
	},
	
	not_empty:{
		nodes   :function()  { return [true];  },
		forEach :function(cb){ cb && cb(true); },
		empty   :function()  { return false;   },
		first   :function()  { return true;    }
	},
	
	token:function(input/*!{next:string}*/){ // object wit property to next string to tokenize
		var s=input.next,m,t;
		
		     if(m=/^\s*not\s+/.exec(s)) t='not';
		else if(m=/^\s*and\s+/.exec(s)) t='and';
		else if(m=/^\s*or\s+/.exec(s))  t='or';
		else if(m=/^\s*\(\s*/.exec(s))  t='(';
		else if(m=/^\s*\)\s*/.exec(s))  t=')';
		else if(m=/^\s*"/.exec(s))      t='"';
		else if(m=/^\s*'/.exec(s))      t="'";
		else if(m=/^\s*[^\s^'^"^\(^\)]+\s*/.exec(s))  t={string:m[0]}; // some JSONSelect content
		
		input.next = m ? s.substring(m[0].length) : s;
		return t;
	},
	
	
	// EXP      = '(' EXP ')' | STRING | AND_EXP | AND_EXP ' or ' AND_EXP | '(' AND_EXP 'or ' AND_EXP ')'
	// AND_EXP  = NOT_EXP | NOT_EXP ' and ' NOT_EXP | '(' NOT_EXP 'and ' NOT_EXP ')'
	// NOT_EXP  = EXP | 'not ' EXP | '(' 'not ' EXP ')'
	
	parse:function(s){ // result is a parse tree
		
		function unexpected(t,s,m){ return new Error('unexpected '+t+' '+s.next+(m?', '+m:'')); };
		function   expected(t,s,m){ return new Error('expected '+t+' in '+s.next+(m?', '+m:'')); };
		function    missing(t,s,m){ return new Error('expected expression before'+t+' '+s.next+(m?', '+m:'')); };
		
		s={next:s};
		
		var stack=[],t,top;
		
		stack.push({type:'EXP'});
		
		while(t=M.token(s)){
			
			top=stack.length>0?stack[stack.length-1]:null;
			
			// quoted string handling
			if( '"'==t || "'"==t ){
				var str='';// quoted string
				do {
					var i=s.next.indexOf(t);
					if(-1===i) throw expected(t,s.next);
					var c=s.next.substring(0,i);s.next=s.next.substring(i+1);
					str += c;
					if( c.length>0 && c.charAt(c.length-1)=='\\' ){ // escaped token
					  str += t;
					}
				} while( str.charAt(str.length-1)==t ); // escaped tokens
				
				// if quotes where ' ',  switch them to "", so escape " in the string
				if( "'"==t ){ str=str.replace(/\"/g,"\\\""); t='"';}
				
				t={string:'"'+str+'"'};
			}
			
			if(t && top && ('EXP'==top.type||'AND_EXP'==top.type||'AND'==top.type||'OR'==top.type)){
				if(!top.finished){
					     if('('  ==t){ stack.pop();stack.push(t,top); }  // EXP = ( EXP ) BEGIN
					else if('or' ==t) throw missing(t,s);
					else if('and'==t) throw missing(t,s);
					else if('not'==t){ stack.pop();stack.push(t,top); } // EXP = not EXP 
					else if(t.string){ extend(top,t);top.finished=true; } // EXP = STRING await next strings
					else if(')'  ==t) throw missing(t,s);
				} else {
					     if('('  ==t){ if(void 0 === top.string) throw unexpected(t,s); stack.push(t,{type:'EXP',string:'',finished:true}); } // STRING ( STRING ) BEGIN
					else if('or' ==t){ reduce(); stack.push(t,{type:'AND_EXP'}); } // EXP or AND_EXP
					else if('and'==t){ reduce(); stack.push(t,{type:'EXP'}); } // EXP and EXP
					else if('not'==t) throw unexpected(t,s);
					else if(t.string){ if(void 0 === top.string) throw unexpected(t,s); else top.string+=t.string; }
					else if(')'  ==t){ reduce(); stack.push(t); reduce(); }
				}
			}
			else {
				if(t) throw unexpected(t,s,JSON.stringify(stack));
			}
		}
		
		function reduce(final){
			var top_1,top_2,top_3,reduced;
			do{
				//debugger;
				
				reduced=false;
				top  =stack.length>0?stack[stack.length-1]:null;
				top_1=stack.length>1?stack[stack.length-2]:null;
				top_2=stack.length>2?stack[stack.length-3]:null;
				top_3=stack.length>3?stack[stack.length-4]:null;
				
				if(top.finished){
					
					// reduce not EXP to NOT, and not NOT(EXP) to EXP
					if('not'==top_1 && top.type ){ // not EXP -> NOT_EXP
						stack.pop();stack.pop();
						if('NOT'==top.type) stack.push(top.exp);
						else stack.push({type:'NOT',exp:top,finished:true});
						reduced=true;
					}
					// reduce EXP and EXP to AND
					else if('and'==top_1 && top_2 && top_2.type /*!EXP,NOT,AND,OR*/){
						stack.pop();stack.pop();stack.pop();
						stack.push({type:'AND',lhs:top_2,rhs:top,finished:true});
						reduced=true;
					}
					// reduce EXP or EXP to OR
					else if('or'==top_1 && top_2 && top_2.type && ('AND_EXP'!==top.type || final) /*!EXP,NOT,AND,OR*/){
						stack.pop();stack.pop();stack.pop();
						stack.push({type:'OR',lhs:top_2,rhs:top,finished:true});
						reduced=true;
					}
				}
				else if( ')'==top ){
					// reduce STRING ( STRING ) to STRING , in this case the brackets belong to JSONSelect
					if( (void 0 !== top_1.string) && '('==top_2 && top_3 && (void 0 !== top_3.string) ){
						stack.pop();stack.pop();stack.pop();stack.pop();
						// BRACKETS belonged to JSONSelect expression
						// NOTE: the space ' ' *behind* the ')' is significant as selector separator!
						top_3.string+='( '+top_1.string+' ) '; 
						stack.push(top_3);
						reduced=true;
					}
					// reduce ( EXP ) to EXP, and  NOT-STRING ( STRING ) to NOT_STRING EXP
					else if( '('==top_2 && ( !top_3 || (void 0 === top_3.string) ) ){
						stack.pop();stack.pop();stack.pop();
						stack.push(top_1);
						reduced=true;
					}
				}
			}while(reduced);
		}
		
		reduce(true);
		
		if(!top.finished || stack.length>1){
			throw new Error('incomplete expression '+JSON.stringify(stack));
		}
		return stack[0];
	},
	
	eval:function F(obj,exp,options){
		     if(exp.string) return (!M.select(obj,exp.string,options).empty());
		else if('AND' ==exp.type) return ( F(obj,exp.lhs,options) && F(obj,exp.rhs,options));
		else if('OR'  ==exp.type) return ( F(obj,exp.lhs,options) || F(obj,exp.rhs,options));
		else if('NOT' ==exp.type) return (!F(obj,exp.exp,options));
		else return false;
	}
});
// create short cut and add a chaining not and add function to the array
M.skip = M.select.skip ;
(function F(array){
	return extend(array,{
		not:function(v){
			return F(this.filter(function(e){ return v!==e; }));
		},
		add:function(v){
			var result = [].concat(this);
			result.push(v);
			return F(result);
		}
	});
})(M.skip);
