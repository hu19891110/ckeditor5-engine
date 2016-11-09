/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* bender-tags: model */

import Document from 'ckeditor5/engine/model/document.js';
import Element from 'ckeditor5/engine/model/element.js';
import Text from 'ckeditor5/engine/model/text.js';
import Position from 'ckeditor5/engine/model/position.js';
import Range from 'ckeditor5/engine/model/range.js';
import AttributeOperation from 'ckeditor5/engine/model/operation/attributeoperation.js';
import InsertOperation from 'ckeditor5/engine/model/operation/insertoperation.js';
import MoveOperation from 'ckeditor5/engine/model/operation/moveoperation.js';
import RemoveOperation from 'ckeditor5/engine/model/operation/removeoperation.js';
import { wrapInDelta } from 'tests/engine/model/_utils/utils.js';

describe( 'Document change event', () => {
	let doc, root, graveyard, types, changes;

	beforeEach( () => {
		doc = new Document();
		root = doc.createRoot();
		graveyard = doc.graveyard;

		types = [];
		changes = [];

		doc.on( 'change', ( evt, type, change ) => {
			types.push( type );
			changes.push( change );
		} );
	} );

	it( 'should be fired when text is inserted', () => {
		doc.applyOperation( wrapInDelta( new InsertOperation( new Position( root, [ 0 ] ), 'foo', doc.version ) ) );

		expect( changes ).to.have.length( 1 );
		expect( types[ 0 ] ).to.equal( 'insert' );
		expect( changes[ 0 ].range ).to.deep.equal( Range.createFromParentsAndOffsets( root, 0, root, 3 ) );
	} );

	it( 'should be fired when element is inserted', () => {
		const element = new Element( 'p' );
		doc.applyOperation( wrapInDelta( new InsertOperation( new Position( root, [ 0 ] ), element, doc.version ) ) );

		expect( changes ).to.have.length( 1 );
		expect( types[ 0 ] ).to.equal( 'insert' );
		expect( changes[ 0 ].range ).to.deep.equal( Range.createFromParentsAndOffsets( root, 0, root, 1 ) );
	} );

	it( 'should be fired when nodes are inserted', () => {
		const element = new Element( 'p' );
		doc.applyOperation( wrapInDelta( new InsertOperation( new Position( root, [ 0 ] ), [ element, 'foo' ], doc.version ) ) );

		expect( changes ).to.have.length( 1 );
		expect( types[ 0 ] ).to.equal( 'insert' );
		expect( changes[ 0 ].range ).to.deep.equal( Range.createFromParentsAndOffsets( root, 0, root, 4 ) );
	} );

	it( 'should be fired when nodes are moved', () => {
		const p1 = new Element( 'p' );
		p1.insertChildren( 0, [ new Element( 'p' ), new Text( 'foo' ) ] );

		const p2 = new Element( 'p' );

		root.insertChildren( 0, [ p1, p2 ] );

		doc.applyOperation( wrapInDelta(
			new MoveOperation(
				new Position( root, [ 0, 0 ] ),
				3,
				new Position( root, [ 1, 0 ] ),
				doc.version
			)
		) );

		expect( changes ).to.have.length( 1 );
		expect( types[ 0 ] ).to.equal( 'move' );
		expect( changes[ 0 ].range ).to.deep.equal( Range.createFromParentsAndOffsets( p2, 0, p2, 3 ) );
		expect( changes[ 0 ].sourcePosition ).to.deep.equal( Position.createFromParentAndOffset( p1, 0 ) );
	} );

	it( 'should be fired when multiple nodes are removed and reinserted', () => {
		root.insertChildren( 0, new Text( 'foo' ) );

		const removeOperation = new RemoveOperation( new Position( root, [ 0 ] ), 3, doc.version );
		doc.applyOperation( wrapInDelta( removeOperation ) );

		const reinsertOperation = removeOperation.getReversed();
		doc.applyOperation( wrapInDelta( reinsertOperation ) );

		expect( changes ).to.have.length( 2 );

		const holderElement = graveyard.getChild( 0 );

		expect( types[ 0 ] ).to.equal( 'remove' );
		expect( changes[ 0 ].range ).to.deep.equal( Range.createFromParentsAndOffsets( holderElement, 0, holderElement, 3 ) );
		expect( changes[ 0 ].sourcePosition ).to.deep.equal( Position.createFromParentAndOffset( root, 0 ) );

		expect( types[ 1 ] ).to.equal( 'reinsert' );
		expect( changes[ 1 ].range ).to.deep.equal( Range.createFromParentsAndOffsets( root, 0, root, 3 ) );
		expect( changes[ 1 ].sourcePosition ).to.deep.equal( Position.createFromParentAndOffset( holderElement, 0 ) );
	} );

	it( 'should be fired when attribute is inserted', () => {
		root.insertChildren( 0, new Text( 'foo' ) );

		doc.applyOperation( wrapInDelta(
			new AttributeOperation(
				Range.createFromParentsAndOffsets( root, 0, root, 3 ),
				'key',
				null,
				'new',
				doc.version
			)
		) );

		expect( changes ).to.have.length( 1 );
		expect( types[ 0 ] ).to.equal( 'addAttribute' );
		expect( changes[ 0 ].range ).to.deep.equal( Range.createFromParentsAndOffsets( root, 0, root, 3 ) );
		expect( changes[ 0 ].key ).to.equal( 'key' );
		expect( changes[ 0 ].oldValue ).to.be.null;
		expect( changes[ 0 ].newValue ).to.equal( 'new' );
	} );

	it( 'should be fired when attribute is removed', () => {
		const elem = new Element( 'p', { key: 'old' } );
		root.insertChildren( 0, elem );

		doc.applyOperation( wrapInDelta(
			new AttributeOperation(
				Range.createFromParentsAndOffsets( root, 0, elem, 0 ),
				'key',
				'old',
				null,
				doc.version
			)
		) );

		expect( changes ).to.have.length( 1 );
		expect( types[ 0 ] ).to.equal( 'removeAttribute' );
		expect( changes[ 0 ].range ).to.deep.equal( Range.createFromParentsAndOffsets( root, 0, elem, 0 ) );
		expect( changes[ 0 ].key ).to.equal( 'key' );
		expect( changes[ 0 ].oldValue ).to.equal( 'old' );
		expect( changes[ 0 ].newValue ).to.be.null;
	}  );

	it( 'should be fired when attribute changes', () => {
		const elem = new Element( 'p', { key: 'old' } );
		root.insertChildren( 0, elem );

		doc.applyOperation( wrapInDelta(
			new AttributeOperation(
				Range.createFromParentsAndOffsets( root, 0, elem, 0 ),
				'key',
				'old',
				'new',
				doc.version
			)
		) );

		expect( changes ).to.have.length( 1 );
		expect( types[ 0 ] ).to.equal( 'changeAttribute' );
		expect( changes[ 0 ].range ).to.deep.equal( Range.createFromParentsAndOffsets( root, 0, elem, 0 ) );
		expect( changes[ 0 ].key ).to.equal( 'key' );
		expect( changes[ 0 ].oldValue ).to.equal( 'old' );
		expect( changes[ 0 ].newValue ).to.equal( 'new' );
	}  );
} );
