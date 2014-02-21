[![Build Status](https://travis-ci.org/x-component/x-select.png?v0.0.1)](https://travis-ci.org/x-component/x-select)
=======================================================================================================



x-select
========

This module can be used to select elements from nested *JSON data* objects with a css like syntax.

It is based on [js-select](https://github.com/harthur/js-select) and thereby indreclty also on [JSONSelect](http://jsonselect.org/) and [js-traverse](https://github.com/substack/js-traverse)

As an extension to the json selector syntax x-select also supports
boolean expressions for sets. The sequential binary boolean logic operators 'and', 'or' and the unary 'not' are supported. Brackets`(` `)` can be used to create nested boolean expressions.  True and False are then represented by sets:
an empty set represents false. A non empty set [true] represents true.


Note: Per default the selecting of elments is done case insensitve and the following values are skipped from the result set `undefined`, `null`, `false`, `NaN`

x-select is particularly usefull to handle deeply nested JSON structures as they are often returned by REST Services, and may evolve over time. (See examples)


**usage**

select
------

    var select = require('x-select');

    var result = select( object, selector, options );



result.forEach(function(node){...})
------------------------------------

You can loop over each found node within the structure

    result.forEach(function(node){
        // this defines the context for the found element, see js-traverse documentation
        // you can use p.e. this.remove(); or this.update(new_value);
    });


result.nodes()
--------------
This delivers simply an array of all found nodes


result.empty()
--------------
returns if the result set is empty


result.first()
-------------
Deliverse the first result found


options.skip
------------

options.skip is an array, which contains values to skip from the result set.
select.skip: contains the default array
To pass a changed skip array: on can use the default one use the functions `not` and `add` of that array, to modify it as shown
here:

    select(obj, ' .property ' , {skip: select.skip.not(false) } );
    select(obj, ' .property ' , {skip: select.skip.add('x').not(false) } );



**Examples:**

assume we have the following JSON structure:

    var o = {
        users: [
            { person : { name: 'joe' , age: 20 , active:true, address: { street: 's1' } } },
            { person : { name: 'mary', age: 35 , active:false, friends : { person: { name: 'bob' } } },
            { person : { name: 'bob' , age: 40 , active:true} }
       ]
    };


    var persons1 = select( o, '.users .person' ).nodes(); // returns 4 nodes {name: ....} also the person: {...} within friends

    var persons2 = select( o, '.users > .person' ); // returns 0 nodes

    var persons3 = select( o, '.users > object > .person' ); // returns 3 nodes {name: ....} directly within the objects in the array

    var person   = select( o, ' .person:has( .age:expr( x < 30 || x >= 40 ) ) ').first(); // get the first person younger then 30 or older then 40
    var name     = select( person,'.name).first(); // joe
    var name2    = select( select(o, ' .person:has( .age:expr( x < 30 || x >= 40 ) ) ').nodes(), '.name' ).first(); // joe

    var names   = select(o, ' .age:expr( x < 30 || x >= 40 ) ~ .name ').nodes(); // [ 'joe', 'bob' ]

    var name_has_friend_bob = select(o, ' .person:has( .friends .name:val("bob")) > .name' ).first(); // 'mary'

    var there_are_users_with_age_40_or_25  = !select(o,'.age:expr(x=40) or .age:expr(x=25)').empty();  // true
    var there_are_users_with_age_40_and_25 = !select(o,'.age:expr(x=40) and .age:expr(x=25)').empty(); // false
    var there_are_users_with_age_40_and_20 = !select(o,'.age:expr(x=40) and .age:expr(x=20)').empty(); // true

    var active_user_count     = select(o,'.active').nodes().length; // 2, false is skipped per default nodes is [ true, true ]
    var has_active_flag_count = select(o,'.active',{skip:select.skip.not(false)}).nodes().length; // 3, nodes is [ true, false, true ]

    // joe's age
    var age = select( o, ' .name:val("joe") ~ .age' ).first(); // 20

    // today is joe's birthday, so increment the age
    select( o, ' .name:val("joe") ~ .age' ).forEach(function(age){
        this.update(age+1);
    });

    var new_age = select( o, ' .name:val("joe") ~ .age' ).first(); // 21



Notes:

If the `object` is a dom tree node, `select()` will call `object.ownerDocument.defaultView.$` and return the result. In this case css selectors supported by
the underlying css selector engine are supported.
