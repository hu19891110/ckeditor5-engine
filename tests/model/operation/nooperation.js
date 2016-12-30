/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import Document from 'ckeditor5-engine/src/model/document';
import NoOperation from 'ckeditor5-engine/src/model/operation/nooperation';
import { jsonParseStringify, wrapInDelta } from 'ckeditor5-engine/tests/model/_utils/utils';

describe( 'NoOperation', () => {
	let noop, doc, root;

	beforeEach( () => {
		noop = new NoOperation( 0 );
		doc = new Document();
		root = doc.createRoot();
	} );

	it( 'should not throw an error when applied', () => {
		expect( () => doc.applyOperation( wrapInDelta( noop ) ) ).to.not.throw( Error );
	} );

	it( 'should create a NoOperation as a reverse', () => {
		const reverse = noop.getReversed();

		expect( reverse ).to.be.an.instanceof( NoOperation );
		expect( reverse.baseVersion ).to.equal( 1 );
	} );

	it( 'should create a do-nothing operation having same parameters when cloned', () => {
		const clone = noop.clone();

		expect( clone ).to.be.an.instanceof( NoOperation );
		expect( clone.baseVersion ).to.equal( 0 );
	} );

	describe( 'toJSON', () => {
		it( 'should create proper json object', () => {
			const serialized = jsonParseStringify( noop );

			expect( serialized ).to.deep.equal( {
				__className: 'engine.model.operation.NoOperation',
				baseVersion: 0
			} );
		} );
	} );

	describe( 'fromJSON', () => {
		it( 'should create proper NoOperation from json object', () => {
			const serialized = jsonParseStringify( noop );
			const deserialized = NoOperation.fromJSON( serialized, doc );

			expect( deserialized ).to.deep.equal( noop );
		} );
	} );
} );
