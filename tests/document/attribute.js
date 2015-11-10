/**
 * @license Copyright (c) 2003-2015, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* bender-tags: document */

'use strict';

var modules = bender.amd.require( 'document/attribute' );

describe( 'Attribute', function() {
	var Attribute;

	before( function() {
		Attribute = modules[ 'document/attribute' ];
	} );

	beforeEach( function() {
		Attribute._register = {};
	} );

	describe( 'constructor', function() {
		it( 'should create attribute', function() {
			var attr = new Attribute( 'foo', 'bar' );

			expect( attr ).to.have.property( 'key' ).that.equals( 'foo' );
			expect( attr ).to.have.property( 'value' ).that.equals( 'bar' );
		} );

		it( 'should create equal instance even if object has different order', function() {
			var attr1 = new Attribute( 'foo', { a: 1, b: 2 } );
			var attr2 = new Attribute( 'foo', { b: 2, a: 1 } );

			expect( attr1.isEqual( attr2 ) ).to.be.true;
		} );

		it( 'should return the same object for registered objects', function() {
			Attribute.register( 'register', true );

			var attr1 = new Attribute( 'register', true );
			var attr2 = new Attribute( 'register', true );

			expect( attr1 ).to.equal( attr2 );
			expect( attr1.isEqual( attr2 ) ).to.be.true;
		} );

		it( 'should return different objects for different values', function() {
			Attribute.register( 'register', true );

			var attr1 = new Attribute( 'register', true );
			var attr2 = new Attribute( 'register', false );

			expect( attr1 ).to.not.be.equals( attr2 );
			expect( attr1.isEqual( attr2 ) ).to.not.be.true;
		} );

		it( 'should return different objects for not registered objects', function() {
			Attribute.register( 'register', true );

			var attr1 = new Attribute( 'register', false );
			var attr2 = new Attribute( 'register', false );

			expect( attr1 ).to.not.be.equals( attr2 );
			expect( attr1.isEqual( attr2 ) ).to.be.true;
		} );
	} );

	describe( 'register', function() {
		it( 'Attribute.register should return registered attribute', function() {
			var attr1 = new Attribute( 'register', true );
			var attr2 = Attribute.register( 'register', true );
			var attr3 = Attribute.register( 'register', true );
			var attr4 = new Attribute( 'register', true );

			expect( attr1 ).to.not.be.equals( attr2 );
			expect( attr2 ).to.equal( attr3 );
			expect( attr3 ).to.equal( attr4 );
		} );
	} );
} );