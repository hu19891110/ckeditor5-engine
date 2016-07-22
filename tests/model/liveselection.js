/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* bender-tags: model */

import Document from '/ckeditor5/engine/model/document.js';
import Element from '/ckeditor5/engine/model/element.js';
import Text from '/ckeditor5/engine/model/text.js';
import Range from '/ckeditor5/engine/model/range.js';
import Position from '/ckeditor5/engine/model/position.js';
import LiveRange from '/ckeditor5/engine/model/liverange.js';
import LiveSelection from '/ckeditor5/engine/model/liveselection.js';
import InsertOperation from '/ckeditor5/engine/model/operation/insertoperation.js';
import MoveOperation from '/ckeditor5/engine/model/operation/moveoperation.js';
import count from '/ckeditor5/utils/count.js';
import testUtils from '/tests/ckeditor5/_utils/utils.js';
import { wrapInDelta } from '/tests/engine/model/_utils/utils.js';

testUtils.createSinonSandbox();

describe( 'LiveSelection', () => {
	let attrFooBar;

	before( () => {
		attrFooBar = { foo: 'bar' };
	} );

	let doc, root, selection, liveRange, range;

	beforeEach( () => {
		doc = new Document();
		root = doc.createRoot();
		root.appendChildren( [
			new Element( 'p' ),
			new Element( 'p' ),
			new Element( 'p', [], new Text( 'foobar' ) ),
			new Element( 'p' ),
			new Element( 'p' ),
			new Element( 'p' ),
			new Element( 'p', [], new Text( 'foobar' ) )
		] );
		selection = doc.selection;
		doc.schema.registerItem( 'p', '$block' );

		liveRange = new LiveRange( new Position( root, [ 0 ] ), new Position( root, [ 1 ] ) );
		range = new Range( new Position( root, [ 2 ] ), new Position( root, [ 2, 2 ] ) );
	} );

	afterEach( () => {
		doc.destroy();
		liveRange.detach();
	} );

	describe( 'default range', () => {
		it( 'should go to the first editable element', () => {
			const ranges = Array.from( selection.getRanges() );

			expect( ranges.length ).to.equal( 1 );
			expect( selection.anchor.isEqual( new Position( root, [ 0, 0 ] ) ) ).to.be.true;
			expect( selection.focus.isEqual( new Position( root, [ 0, 0 ] ) ) ).to.be.true;
			expect( selection ).to.have.property( 'isBackward', false );
		} );

		it( 'should be set to the beginning of the doc if there is no editable element', () => {
			doc = new Document();
			root = doc.createRoot();
			root.insertChildren( 0, new Text( 'foobar' ) );
			selection = doc.selection;

			const ranges = Array.from( selection.getRanges() );

			expect( ranges.length ).to.equal( 1 );
			expect( selection.anchor.isEqual( new Position( root, [ 0 ] ) ) ).to.be.true;
			expect( selection.focus.isEqual( new Position( root, [ 0 ] ) ) ).to.be.true;
			expect( selection ).to.have.property( 'isBackward', false );
			expect( count( selection.getAttributes() ) ).to.equal( 0 );
		} );

		it( 'should skip element when you can not put selection', () => {
			doc = new Document();
			root = doc.createRoot();
			root.insertChildren( 0, [
				new Element( 'img' ),
				new Element( 'p', [], new Text( 'foobar' ) )
			] );
			doc.schema.registerItem( 'img' );
			doc.schema.registerItem( 'p', '$block' );
			selection = doc.selection;

			const ranges = Array.from( selection.getRanges() );

			expect( ranges.length ).to.equal( 1 );
			expect( selection.anchor.isEqual( new Position( root, [ 1, 0 ] ) ) ).to.be.true;
			expect( selection.focus.isEqual( new Position( root, [ 1, 0 ] ) ) ).to.be.true;
			expect( selection ).to.have.property( 'isBackward', false );
			expect( count( selection.getAttributes() ) ).to.equal( 0 );
		} );
	} );

	describe( 'isCollapsed', () => {
		it( 'should return true for default range', () => {
			expect( selection.isCollapsed ).to.be.true;
		} );
	} );

	describe( 'rangeCount', () => {
		it( 'should return proper range count', () => {
			expect( selection.rangeCount ).to.equal( 1 );

			selection.addRange( new Range( new Position( root, [ 0 ] ), new Position( root, [ 0 ] ) ) );

			expect( selection.rangeCount ).to.equal( 1 );

			selection.addRange( new Range( new Position( root, [ 2 ] ), new Position( root, [ 2 ] ) ) );

			expect( selection.rangeCount ).to.equal( 2 );
		} );
	} );

	describe( 'addRange', () => {
		it( 'should convert added Range to LiveRange', () => {
			selection.addRange( range );

			const ranges = selection._ranges;

			expect( ranges[ 0 ] ).to.be.instanceof( LiveRange );
		} );
	} );

	describe( 'collapse', () => {
		it( 'detaches all existing ranges', () => {
			selection.addRange( range );
			selection.addRange( liveRange );

			const spy = testUtils.sinon.spy( LiveRange.prototype, 'detach' );
			selection.collapse( root );

			expect( spy.calledTwice ).to.be.true;
		} );
	} );

	describe( 'destroy', () => {
		it( 'should unbind all events', () => {
			selection.addRange( liveRange );
			selection.addRange( range );

			const ranges = selection._ranges;

			sinon.spy( ranges[ 0 ], 'detach' );
			sinon.spy( ranges[ 1 ], 'detach' );

			selection.destroy();

			expect( ranges[ 0 ].detach.called ).to.be.true;
			expect( ranges[ 1 ].detach.called ).to.be.true;

			ranges[ 0 ].detach.restore();
			ranges[ 1 ].detach.restore();
		} );
	} );

	describe( 'setFocus', () => {
		it( 'modifies default range', () => {
			const startPos = selection.getFirstPosition();
			const endPos = Position.createAt( root, 'end' );

			selection.setFocus( endPos );

			expect( selection.anchor.compareWith( startPos ) ).to.equal( 'same' );
			expect( selection.focus.compareWith( endPos ) ).to.equal( 'same' );
		} );

		it( 'detaches the range it replaces', () => {
			const startPos = Position.createAt( root, 1 );
			const endPos = Position.createAt( root, 2 );
			const newEndPos = Position.createAt( root, 4 );
			const spy = testUtils.sinon.spy( LiveRange.prototype, 'detach' );

			selection.addRange( new Range( startPos, endPos ) );

			selection.setFocus( newEndPos );

			expect( spy.calledOnce ).to.be.true;
		} );
	} );

	describe( 'removeAllRanges', () => {
		let spy, ranges;

		beforeEach( () => {
			selection.addRange( liveRange );
			selection.addRange( range );

			spy = sinon.spy();
			selection.on( 'change:range', spy );

			ranges = selection._ranges;

			sinon.spy( ranges[ 0 ], 'detach' );
			sinon.spy( ranges[ 1 ], 'detach' );

			selection.removeAllRanges();
		} );

		afterEach( () => {
			ranges[ 0 ].detach.restore();
			ranges[ 1 ].detach.restore();
		} );

		it( 'should remove all stored ranges (and reset to default range)', () => {
			expect( Array.from( selection.getRanges() ).length ).to.equal( 1 );
			expect( selection.anchor.isEqual( new Position( root, [ 0, 0 ] ) ) ).to.be.true;
			expect( selection.focus.isEqual( new Position( root, [ 0, 0 ] ) ) ).to.be.true;
		} );

		it( 'should detach ranges', () => {
			expect( ranges[ 0 ].detach.called ).to.be.true;
			expect( ranges[ 1 ].detach.called ).to.be.true;
		} );
	} );

	describe( 'setRanges', () => {
		let newRanges, spy, oldRanges;

		before( () => {
			newRanges = [
				new Range( new Position( root, [ 4 ] ), new Position( root, [ 5 ] ) ),
				new Range( new Position( root, [ 5, 0 ] ), new Position( root, [ 6, 0 ] ) )
			];
		} );

		beforeEach( () => {
			selection.addRange( liveRange );
			selection.addRange( range );

			spy = sinon.spy();
			selection.on( 'change:range', spy );

			oldRanges = selection._ranges;

			sinon.spy( oldRanges[ 0 ], 'detach' );
			sinon.spy( oldRanges[ 1 ], 'detach' );
		} );

		afterEach( () => {
			oldRanges[ 0 ].detach.restore();
			oldRanges[ 1 ].detach.restore();
		} );

		it( 'should detach removed ranges', () => {
			selection.setRanges( newRanges );
			expect( oldRanges[ 0 ].detach.called ).to.be.true;
			expect( oldRanges[ 1 ].detach.called ).to.be.true;
		} );
	} );

	describe( 'getFirstRange', () => {
		it( 'should return default range if no ranges were added', () => {
			const firstRange = selection.getFirstRange();

			expect( firstRange.start.isEqual( new Position( root, [ 0, 0 ] ) ) );
			expect( firstRange.end.isEqual( new Position( root, [ 0, 0 ] ) ) );
		} );
	} );

	describe( 'getFirstPosition', () => {
		it( 'should return start position of default range if no ranges were added', () => {
			const firstPosition = selection.getFirstPosition();

			expect( firstPosition.isEqual( new Position( root, [ 0, 0 ] ) ) );
		} );
	} );

	describe( 'createFromSelection', () => {
		it( 'should return a LiveSelection instance', () => {
			selection.addRange( range, true );

			expect( LiveSelection.createFromSelection( selection ) ).to.be.instanceof( LiveSelection );
		} );
	} );

	// LiveSelection uses LiveRanges so here are only simple test to see if integration is
	// working well, without getting into complicated corner cases.
	describe( 'after applying an operation should get updated and not fire update event', () => {
		let spy;

		beforeEach( () => {
			root.insertChildren( 0, [
				new Element( 'ul', [], new Text( 'abcdef' ) ),
				new Element( 'p', [], new Text( 'foobar' ) ),
				new Text( 'xyz' )
			] );

			selection.addRange( new Range( new Position( root, [ 0, 2 ] ), new Position( root, [ 1, 4 ] ) ) );

			spy = sinon.spy();
			selection.on( 'change:range', spy );
		} );

		describe( 'InsertOperation', () => {
			it( 'before selection', () => {
				doc.applyOperation( wrapInDelta(
					new InsertOperation(
						new Position( root, [ 0, 1 ] ),
						'xyz',
						doc.version
					)
				) );

				let range = selection._ranges[ 0 ];

				expect( range.start.path ).to.deep.equal( [ 0, 5 ] );
				expect( range.end.path ).to.deep.equal( [ 1, 4 ] );
				expect( spy.called ).to.be.false;
			} );

			it( 'inside selection', () => {
				doc.applyOperation( wrapInDelta(
					new InsertOperation(
						new Position( root, [ 1, 0 ] ),
						'xyz',
						doc.version
					)
				) );

				let range = selection._ranges[ 0 ];

				expect( range.start.path ).to.deep.equal( [ 0, 2 ] );
				expect( range.end.path ).to.deep.equal( [ 1, 7 ] );
				expect( spy.called ).to.be.false;
			} );
		} );

		describe( 'MoveOperation', () => {
			it( 'move range from before a selection', () => {
				doc.applyOperation( wrapInDelta(
					new MoveOperation(
						new Position( root, [ 0, 0 ] ),
						2,
						new Position( root, [ 2 ] ),
						doc.version
					)
				) );

				let range = selection._ranges[ 0 ];

				expect( range.start.path ).to.deep.equal( [ 0, 0 ] );
				expect( range.end.path ).to.deep.equal( [ 1, 4 ] );
				expect( spy.called ).to.be.false;
			} );

			it( 'moved into before a selection', () => {
				doc.applyOperation( wrapInDelta(
					new MoveOperation(
						new Position( root, [ 2 ] ),
						2,
						new Position( root, [ 0, 0 ] ),
						doc.version
					)
				) );

				let range = selection._ranges[ 0 ];

				expect( range.start.path ).to.deep.equal( [ 0, 4 ] );
				expect( range.end.path ).to.deep.equal( [ 1, 4 ] );
				expect( spy.called ).to.be.false;
			} );

			it( 'move range from inside of selection', () => {
				doc.applyOperation( wrapInDelta(
					new MoveOperation(
						new Position( root, [ 1, 0 ] ),
						2,
						new Position( root, [ 2 ] ),
						doc.version
					)
				) );

				let range = selection._ranges[ 0 ];

				expect( range.start.path ).to.deep.equal( [ 0, 2 ] );
				expect( range.end.path ).to.deep.equal( [ 1, 2 ] );
				expect( spy.called ).to.be.false;
			} );

			it( 'moved range intersects with selection', () => {
				doc.applyOperation( wrapInDelta(
					new MoveOperation(
						new Position( root, [ 1, 3 ] ),
						2,
						new Position( root, [ 4 ] ),
						doc.version
					)
				) );

				let range = selection._ranges[ 0 ];

				expect( range.start.path ).to.deep.equal( [ 0, 2 ] );
				expect( range.end.path ).to.deep.equal( [ 1, 3 ] );
				expect( spy.called ).to.be.false;
			} );

			it( 'split inside selection (do not break selection)', () => {
				doc.applyOperation( wrapInDelta(
					new InsertOperation(
						new Position( root, [ 2 ] ),
						new Element( 'p' ),
						doc.version
					)
				) );

				doc.applyOperation( wrapInDelta(
					new MoveOperation(
						new Position( root, [ 1, 2 ] ),
						4,
						new Position( root, [ 2, 0 ] ),
						doc.version
					)
				) );

				let range = selection._ranges[ 0 ];

				expect( range.start.path ).to.deep.equal( [ 0, 2 ] );
				expect( range.end.path ).to.deep.equal( [ 2, 2 ] );
				expect( spy.called ).to.be.false;
			} );
		} );
	} );

	describe( 'attributes interface', () => {
		let fullP, emptyP, rangeInFullP, rangeInEmptyP;

		beforeEach( () => {
			root.insertChildren( 0, [
				new Element( 'p', [], new Text( 'foobar' ) ),
				new Element( 'p', [], [] )
			] );

			fullP = root.getChild( 0 );
			emptyP = root.getChild( 1 );

			rangeInFullP = new Range( new Position( root, [ 0, 4 ] ), new Position( root, [ 0, 4 ] ) );
			rangeInEmptyP = new Range( new Position( root, [ 1, 0 ] ), new Position( root, [ 1, 0 ] ) );
		} );

		describe( 'setAttribute', () => {
			it( 'should store attribute if the selection is in empty node', () => {
				selection.setRanges( [ rangeInEmptyP ] );
				selection.setAttribute( 'foo', 'bar' );

				expect( selection.getAttribute( 'foo' ) ).to.equal( 'bar' );

				expect( emptyP.getAttribute( LiveSelection._getStoreAttributeKey( 'foo' ) ) ).to.equal( 'bar' );
			} );
		} );

		describe( 'setAttributesTo', () => {
			it( 'should remove all stored attributes and store the given ones if the selection is in empty node', () => {
				selection.setRanges( [ rangeInEmptyP ] );
				selection.setAttribute( 'abc', 'xyz' );
				selection.setAttributesTo( { foo: 'bar' } );

				expect( selection.getAttribute( 'foo' ) ).to.equal( 'bar' );
				expect( selection.getAttribute( 'abc' ) ).to.be.undefined;

				expect( emptyP.getAttribute( LiveSelection._getStoreAttributeKey( 'foo' ) ) ).to.equal( 'bar' );
				expect( emptyP.hasAttribute( LiveSelection._getStoreAttributeKey( 'abc' ) ) ).to.be.false;
			} );
		} );

		describe( 'removeAttribute', () => {
			it( 'should remove attribute set on the text fragment', () => {
				selection.setRanges( [ rangeInFullP ] );
				selection.setAttribute( 'foo', 'bar' );
				selection.removeAttribute( 'foo' );

				expect( selection.getAttribute( 'foo' ) ).to.be.undefined;

				expect( fullP.hasAttribute( LiveSelection._getStoreAttributeKey( 'foo' ) ) ).to.be.false;
			} );

			it( 'should remove stored attribute if the selection is in empty node', () => {
				selection.setRanges( [ rangeInEmptyP ] );
				selection.setAttribute( 'foo', 'bar' );
				selection.removeAttribute( 'foo' );

				expect( selection.getAttribute( 'foo' ) ).to.be.undefined;

				expect( emptyP.hasAttribute( LiveSelection._getStoreAttributeKey( 'foo' ) ) ).to.be.false;
			} );
		} );

		describe( 'clearAttributes', () => {
			it( 'should remove all stored attributes if the selection is in empty node', () => {
				selection.setRanges( [ rangeInEmptyP ] );
				selection.setAttribute( 'foo', 'bar' );
				selection.setAttribute( 'abc', 'xyz' );

				selection.clearAttributes();

				expect( selection.getAttribute( 'foo' ) ).to.be.undefined;
				expect( selection.getAttribute( 'abc' ) ).to.be.undefined;

				expect( emptyP.hasAttribute( LiveSelection._getStoreAttributeKey( 'foo' ) ) ).to.be.false;
				expect( emptyP.hasAttribute( LiveSelection._getStoreAttributeKey( 'abc' ) ) ).to.be.false;
			} );
		} );
	} );

	describe( '_updateAttributes', () => {
		beforeEach( () => {
			root.insertChildren( 0, [
				new Element( 'p', { p: true } ),
				new Text( 'a', { a: true } ),
				new Element( 'p', { p: true } ),
				new Text( 'b', { b: true } ),
				new Text( 'c', { c: true } ),
				new Element( 'p', [], [
					new Text( 'd', { d: true } )
				] ),
				new Element( 'p', { p: true } ),
				new Text( 'e', { e: true } )
			] );
		} );

		it( 'if selection is a range, should find first character in it and copy it\'s attributes', () => {
			selection.setRanges( [ new Range( new Position( root, [ 2 ] ), new Position( root, [ 5 ] ) ) ] );

			expect( Array.from( selection.getAttributes() ) ).to.deep.equal( [ [ 'b', true ] ] );

			// Step into elements when looking for first character:
			selection.setRanges( [ new Range( new Position( root, [ 5 ] ), new Position( root, [ 7 ] ) ) ] );

			expect( Array.from( selection.getAttributes() ) ).to.deep.equal( [ [ 'd', true ] ] );
		} );

		it( 'if selection is collapsed it should seek a character to copy that character\'s attributes', () => {
			// Take styles from character before selection.
			selection.setRanges( [ new Range( new Position( root, [ 2 ] ), new Position( root, [ 2 ] ) ) ] );
			expect( Array.from( selection.getAttributes() ) ).to.deep.equal( [ [ 'a', true ] ] );

			// If there are none,
			// Take styles from character after selection.
			selection.setRanges( [ new Range( new Position( root, [ 3 ] ), new Position( root, [ 3 ] ) ) ] );
			expect( Array.from( selection.getAttributes() ) ).to.deep.equal( [ [ 'b', true ] ] );

			// If there are none,
			// Look from the selection position to the beginning of node looking for character to take attributes from.
			selection.setRanges( [ new Range( new Position( root, [ 6 ] ), new Position( root, [ 6 ] ) ) ] );
			expect( Array.from( selection.getAttributes() ) ).to.deep.equal( [ [ 'c', true ] ] );

			// If there are none,
			// Look from the selection position to the end of node looking for character to take attributes from.
			selection.setRanges( [ new Range( new Position( root, [ 0 ] ), new Position( root, [ 0 ] ) ) ] );
			expect( Array.from( selection.getAttributes() ) ).to.deep.equal( [ [ 'a', true ] ] );

			// If there are no characters to copy attributes from, use stored attributes.
			selection.setRanges( [ new Range( new Position( root, [ 0, 0 ] ), new Position( root, [ 0, 0 ] ) ) ] );
			expect( Array.from( selection.getAttributes() ) ).to.deep.equal( [] );
		} );

		it( 'should fire change:attribute event', () => {
			let spy = sinon.spy();
			selection.on( 'change:attribute', spy );

			selection.setRanges( [ new Range( new Position( root, [ 2 ] ), new Position( root, [ 5 ] ) ) ] );

			expect( spy.called ).to.be.true;
		} );
	} );

	describe( '_getStoredAttributes', () => {
		it( 'should return no values if there are no ranges in selection', () => {
			let values = Array.from( selection._getStoredAttributes() );

			expect( values ).to.deep.equal( [] );
		} );
	} );
} );
