/**
 * @license Copyright (c) 2003-2015, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* bender-tags: treeview */

'use strict';

import ViewText from '/ckeditor5/engine/treeview/text.js';
import ViewElement from '/ckeditor5/engine/treeview/element.js';
import DomConverter from '/ckeditor5/engine/treeview/domconverter.js';
import ViewDocumentFragment from '/ckeditor5/engine/treeview/documentfragment.js';
import { INLINE_FILLER, INLINE_FILLER_LENGTH, BR_FILLER, NBSP_FILLER, isBlockFiller } from '/ckeditor5/engine/treeview/filler.js';

import { parse, stringify } from '/tests/engine/_utils/view.js';

import count from '/ckeditor5/utils/count.js';
import createElement from '/ckeditor5/utils/dom/createelement.js';

describe( 'DomConverter', () => {
	let converter;

	before( () => {
		converter = new DomConverter();
	} );

	describe( 'constructor', () => {
		it( 'should create converter with BR block filler by default', () => {
			converter = new DomConverter();
			expect( converter.blockFiller ).to.equal( BR_FILLER );
		} );

		it( 'should create converter with defined block filler', () => {
			converter = new DomConverter( { blockFiller: NBSP_FILLER } );
			expect( converter.blockFiller ).to.equal( NBSP_FILLER );
		} );
	} );

	describe( 'bindElements', () => {
		it( 'should bind elements', () => {
			const domElement = document.createElement( 'p' );
			const viewElement = new ViewElement( 'p' );

			converter.bindElements( domElement, viewElement );

			expect( converter.getCorrespondingView( domElement ) ).to.equal( viewElement );
			expect( converter.getCorrespondingDom( viewElement ) ).to.equal( domElement );
		} );
	} );

	describe( 'bindDocumentFragments', () => {
		it( 'should bind document fragments', () => {
			const domFragment = document.createDocumentFragment();
			const viewFragment = new ViewDocumentFragment();

			converter.bindDocumentFragments( domFragment, viewFragment );

			expect( converter.getCorrespondingView( domFragment ) ).to.equal( viewFragment );
			expect( converter.getCorrespondingDom( viewFragment ) ).to.equal( domFragment );
		} );
	} );

	describe( 'viewToDom', () => {
		it( 'should create tree of DOM elements from view elements', () => {
			const viewImg = new ViewElement( 'img' );
			const viewText = new ViewText( 'foo' );
			const viewP = new ViewElement( 'p' );

			viewP.setAttribute( 'class', 'foo' );

			viewP.appendChildren( viewImg );
			viewP.appendChildren( viewText );

			const domImg = document.createElement( 'img' );

			converter.bindElements( domImg, viewImg );

			const domP = converter.viewToDom( viewP, document );

			expect( domP ).to.be.an.instanceof( HTMLElement );
			expect( domP.tagName ).to.equal( 'P' );

			expect( domP.getAttribute( 'class' ) ).to.equal( 'foo' );
			expect( domP.attributes.length ).to.equal( 1 );

			expect( domP.childNodes.length ).to.equal( 2 );
			expect( domP.childNodes[ 0 ].tagName ).to.equal( 'IMG' );
			expect( domP.childNodes[ 1 ].data ).to.equal( 'foo' );

			expect( converter.getCorrespondingView( domP ) ).not.to.equal( viewP );
			expect( converter.getCorrespondingView( domP.childNodes[ 0 ] ) ).to.equal( viewImg );
		} );

		it( 'should create tree of DOM elements from view elements and bind elements', () => {
			const viewImg = new ViewElement( 'img' );
			const viewText = new ViewText( 'foo' );
			const viewP = new ViewElement( 'p' );

			viewP.setAttribute( 'class', 'foo' );

			viewP.appendChildren( viewImg );
			viewP.appendChildren( viewText );

			const domP = converter.viewToDom( viewP, document, { bind: true } );

			expect( domP ).to.be.an.instanceof( HTMLElement );
			expect( domP.tagName ).to.equal( 'P' );

			expect( domP.getAttribute( 'class' ) ).to.equal( 'foo' );
			expect( domP.attributes.length ).to.equal( 1 );

			expect( domP.childNodes.length ).to.equal( 2 );
			expect( domP.childNodes[ 0 ].tagName ).to.equal( 'IMG' );
			expect( domP.childNodes[ 1 ].data ).to.equal( 'foo' );

			expect( converter.getCorrespondingView( domP ) ).to.equal( viewP );
			expect( converter.getCorrespondingView( domP.childNodes[ 0 ] ) ).to.equal( viewP.getChild( 0 ) );
		} );

		it( 'should create tree of DOM elements from view element without children', () => {
			const viewImg = new ViewElement( 'img' );
			const viewText = new ViewText( 'foo' );
			const viewP = new ViewElement( 'p' );

			viewP.setAttribute( 'class', 'foo' );

			viewP.appendChildren( viewImg );
			viewP.appendChildren( viewText );

			const domImg = document.createElement( 'img' );

			converter.bindElements( domImg, viewImg );

			const domP = converter.viewToDom( viewP, document, { withChildren: false } );

			expect( domP ).to.be.an.instanceof( HTMLElement );
			expect( domP.tagName ).to.equal( 'P' );

			expect( domP.getAttribute( 'class' ) ).to.equal( 'foo' );
			expect( domP.attributes.length ).to.equal( 1 );

			expect( domP.childNodes.length ).to.equal( 0 );
			expect( converter.getCorrespondingView( domP ) ).not.to.equal( viewP );
		} );

		it( 'should create DOM document fragment from view document fragment and bind elements', () => {
			const viewImg = new ViewElement( 'img' );
			const viewText = new ViewText( 'foo' );
			const viewFragment = new ViewDocumentFragment();

			viewFragment.appendChildren( viewImg );
			viewFragment.appendChildren( viewText );

			const domFragment = converter.viewToDom( viewFragment, document, { bind: true } );

			expect( domFragment ).to.be.an.instanceof( DocumentFragment );
			expect( domFragment.childNodes.length ).to.equal( 2 );
			expect( domFragment.childNodes[ 0 ].tagName ).to.equal( 'IMG' );
			expect( domFragment.childNodes[ 1 ].data ).to.equal( 'foo' );

			expect( converter.getCorrespondingView( domFragment ) ).to.equal( viewFragment );
			expect( converter.getCorrespondingView( domFragment.childNodes[ 0 ] ) ).to.equal( viewFragment.getChild( 0 ) );
		} );

		it( 'should create DOM document fragment from view document without children', () => {
			const viewImg = new ViewElement( 'img' );
			const viewText = new ViewText( 'foo' );
			const viewFragment = new ViewDocumentFragment();

			viewFragment.appendChildren( viewImg );
			viewFragment.appendChildren( viewText );

			const domImg = document.createElement( 'img' );

			converter.bindElements( domImg, viewImg );

			const domFragment = converter.viewToDom( viewFragment, document, { withChildren: false } );

			expect( domFragment ).to.be.an.instanceof( DocumentFragment );

			expect( domFragment.childNodes.length ).to.equal( 0 );
			expect( converter.getCorrespondingView( domFragment ) ).not.to.equal( viewFragment );
		} );

		it( 'should return already bind document fragment', () => {
			const domFragment = document.createDocumentFragment();
			const viewFragment = new ViewDocumentFragment();

			converter.bindDocumentFragments( domFragment, viewFragment );

			const domFragment2 = converter.viewToDom( viewFragment );

			expect( domFragment2 ).to.equal( domFragment );
		} );
	} );

	describe( 'viewChildrenToDom', () => {
		it( 'should convert children', () => {
			const viewP = parse( '<container:p>foo<attribute:b>bar</attribute:b></container:p>' );

			const domChildren = Array.from( converter.viewChildrenToDom( viewP, document ) );

			expect( domChildren.length ).to.equal( 2 );
			expect( domChildren[ 0 ].data ).to.equal( 'foo' );
			expect( domChildren[ 1 ].tagName.toLowerCase() ).to.equal( 'b' );
			expect( domChildren[ 1 ].childNodes.length ).to.equal( 1 );
		} );

		it( 'should add filler', () => {
			const viewP = parse( '<container:p></container:p>' );

			const domChildren = Array.from( converter.viewChildrenToDom( viewP, document ) );

			expect( domChildren.length ).to.equal( 1 );
			expect( isBlockFiller( domChildren[ 0 ], converter.blockFiller ) ).to.be.true;
		} );

		it( 'should add filler according to fillerPositionOffset', () => {
			const viewP = parse( '<container:p>foo</container:p>' );
			viewP.getBlockFillerOffset = () => 0;

			const domChildren = Array.from( converter.viewChildrenToDom( viewP, document ) );

			expect( domChildren.length ).to.equal( 2 );
			expect( isBlockFiller( domChildren[ 0 ], converter.blockFiller ) ).to.be.true;
			expect( domChildren[ 1 ].data ).to.equal( 'foo' );
		} );

		it( 'should pass options', () => {
			const viewP = parse( '<container:p>foo<attribute:b>bar</attribute:b></container:p>' );

			const domChildren = Array.from( converter.viewChildrenToDom( viewP, document, { withChildren: false } ) );

			expect( domChildren.length ).to.equal( 2 );
			expect( domChildren[ 0 ].data ).to.equal( 'foo' );
			expect( domChildren[ 1 ].tagName.toLowerCase() ).to.equal( 'b' );
			expect( domChildren[ 1 ].childNodes.length ).to.equal( 0 );
		} );
	} );

	describe( 'viewPositionToDom', () => {
		it( 'should convert the position in the text', () => {
			const domFoo = document.createTextNode( 'foo' );
			const domP = createElement( document, 'p', null, domFoo );
			const { view: viewP, selection } = parse( '<container:p>fo{}o</container:p>' );

			converter.bindElements( domP, viewP );

			const viewPosition = selection.getFirstPosition();
			const domPosition = converter.viewPositionToDom( viewPosition );

			expect( domPosition.offset ).to.equal( 2 );
			expect( domPosition.parent ).to.equal( domFoo );
		} );

		it( 'should convert the position in the empty element', () => {
			const domP = createElement( document, 'p' );
			const { view: viewP, selection } = parse( '<container:p>[]</container:p>' );

			converter.bindElements( domP, viewP );

			const viewPosition = selection.getFirstPosition();
			const domPosition = converter.viewPositionToDom( viewPosition );

			expect( domPosition.offset ).to.equal( 0 );
			expect( domPosition.parent ).to.equal( domP );
		} );

		it( 'should convert the position in the non-empty element', () => {
			const domB = createElement( document, 'b', null, 'foo' );
			const domP = createElement( document, 'p', null, domB );
			const { view: viewP, selection } = parse( '<container:p><attribute:b>foo</attribute:b>[]</container:p>' );

			converter.bindElements( domP, viewP );
			converter.bindElements( domB, viewP.getChild( 0 ) );

			const viewPosition = selection.getFirstPosition();
			const domPosition = converter.viewPositionToDom( viewPosition );

			expect( domPosition.offset ).to.equal( 1 );
			expect( domPosition.parent ).to.equal( domP );
		} );

		it( 'should convert the position after text', () => {
			const domP = createElement( document, 'p', null, 'foo' );
			const { view: viewP, selection } = parse( '<container:p>foo[]</container:p>' );

			converter.bindElements( domP, viewP );

			const viewPosition = selection.getFirstPosition();
			const domPosition = converter.viewPositionToDom( viewPosition );

			expect( domPosition.offset ).to.equal( 1 );
			expect( domPosition.parent ).to.equal( domP );
		} );

		it( 'should convert the position before text', () => {
			const domP = createElement( document, 'p', null, 'foo' );
			const { view: viewP, selection } = parse( '<container:p>[]foo</container:p>' );

			converter.bindElements( domP, viewP );

			const viewPosition = selection.getFirstPosition();
			const domPosition = converter.viewPositionToDom( viewPosition );

			expect( domPosition.offset ).to.equal( 0 );
			expect( domPosition.parent ).to.equal( domP );
		} );

		it( 'should update offset if DOM text node starts with inline filler', () => {
			const domFoo = document.createTextNode( INLINE_FILLER + 'foo' );
			const domP = createElement( document, 'p', null, domFoo );
			const { view: viewP, selection } = parse( '<container:p>fo{}o</container:p>' );

			converter.bindElements( domP, viewP );

			const viewPosition = selection.getFirstPosition();
			const domPosition = converter.viewPositionToDom( viewPosition );

			expect( domPosition.offset ).to.equal( INLINE_FILLER_LENGTH + 2 );
			expect( domPosition.parent ).to.equal( domFoo );
		} );

		it( 'should move the position to the text node if the position is where inline filler is', () => {
			const domFiller = document.createTextNode( INLINE_FILLER );
			const domP = createElement( document, 'p', null, domFiller );
			const { view: viewP, selection } = parse( '<container:p>[]</container:p>' );

			converter.bindElements( domP, viewP );

			const viewPosition = selection.getFirstPosition();
			const domPosition = converter.viewPositionToDom( viewPosition );

			expect( domPosition.offset ).to.equal( INLINE_FILLER_LENGTH );
			expect( domPosition.parent ).to.equal( domFiller );
		} );
	} );

	describe( 'viewRangeToDom', () => {
		it( 'should convert view range to DOM range', () => {
			const domFoo = document.createTextNode( 'foo' );
			const domP = createElement( document, 'p', null, domFoo );
			const { view: viewP, selection } = parse( '<container:p>fo{o]</container:p>' );

			converter.bindElements( domP, viewP );

			const viewRange = selection.getFirstRange();
			const domRange = converter.viewRangeToDom( viewRange );

			expect( domRange ).to.be.instanceof( Range );
			expect( domRange.startContainer ).to.equal( domFoo );
			expect( domRange.startOffset ).to.equal( 2 );
			expect( domRange.endContainer ).to.equal( domP );
			expect( domRange.endOffset ).to.equal( 1 );
		} );
	} );

	describe( 'domToView', () => {
		it( 'should create tree of view elements from DOM elements', () => {
			const domImg = createElement( document, 'img' );
			const domText = document.createTextNode( 'foo' );
			const domP = createElement( document, 'p', { 'class': 'foo' }, [ domImg, domText ] );

			const viewImg = new ViewElement( 'img' );

			converter.bindElements( domImg, viewImg );

			const viewP = converter.domToView( domP );

			expect( viewP ).to.be.an.instanceof( ViewElement );
			expect( viewP.name ).to.equal( 'p' );

			expect( viewP.getAttribute( 'class' ) ).to.equal( 'foo' );
			expect( count( viewP.getAttributeKeys() ) ).to.equal( 1 );

			expect( viewP.getChildCount() ).to.equal( 2 );
			expect( viewP.getChild( 0 ).name ).to.equal( 'img' );
			expect( viewP.getChild( 1 ).data ).to.equal( 'foo' );

			expect( converter.getCorrespondingDom( viewP ) ).to.not.equal( domP );
			expect( converter.getCorrespondingDom( viewP.getChild( 0 ) ) ).to.equal( domImg );
		} );

		it( 'should create tree of view elements from DOM elements and bind elements', () => {
			const domImg = createElement( document, 'img' );
			const domText = document.createTextNode( 'foo' );
			const domP = createElement( document, 'p', { 'class': 'foo' }, [ domImg, domText ] );

			const viewP = converter.domToView( domP, { bind: true } );

			expect( viewP ).to.be.an.instanceof( ViewElement );
			expect( viewP.name ).to.equal( 'p' );

			expect( viewP.getAttribute( 'class' ) ).to.equal( 'foo' );
			expect( count( viewP.getAttributeKeys() ) ).to.equal( 1 );

			expect( viewP.getChildCount() ).to.equal( 2 );
			expect( viewP.getChild( 0 ).name ).to.equal( 'img' );
			expect( viewP.getChild( 1 ).data ).to.equal( 'foo' );

			expect( converter.getCorrespondingDom( viewP ) ).to.equal( domP );
			expect( converter.getCorrespondingDom( viewP.getChild( 0 ) ) ).to.equal( domP.childNodes[ 0 ] );
		} );

		it( 'should create tree of view elements from DOM element without children', () => {
			const domImg = createElement( document, 'img' );
			const domText = document.createTextNode( 'foo' );
			const domP = createElement( document, 'p', { 'class': 'foo' }, [ domImg, domText ] );

			const viewImg = new ViewElement( 'img' );

			converter.bindElements( domImg, viewImg );

			const viewP = converter.domToView( domP, { withChildren: false } );

			expect( viewP ).to.be.an.instanceof( ViewElement );
			expect( viewP.name ).to.equal( 'p' );

			expect( viewP.getAttribute( 'class' ) ).to.equal( 'foo' );
			expect( count( viewP.getAttributeKeys() ) ).to.equal( 1 );

			expect( viewP.getChildCount() ).to.equal( 0 );
			expect( converter.getCorrespondingDom( viewP ) ).to.not.equal( domP );
		} );

		it( 'should create view document fragment from DOM document fragment', () => {
			const domImg = createElement( document, 'img' );
			const domText = document.createTextNode( 'foo' );
			const domFragment = document.createDocumentFragment();

			domFragment.appendChild( domImg );
			domFragment.appendChild( domText );

			const viewFragment = converter.domToView( domFragment, { bind: true } );

			expect( viewFragment ).to.be.an.instanceof( ViewDocumentFragment );
			expect( viewFragment.getChildCount() ).to.equal( 2 );
			expect( viewFragment.getChild( 0 ).name ).to.equal( 'img' );
			expect( viewFragment.getChild( 1 ).data ).to.equal( 'foo' );

			expect( converter.getCorrespondingDom( viewFragment ) ).to.equal( domFragment );
			expect( converter.getCorrespondingDom( viewFragment.getChild( 0 ) ) ).to.equal( domFragment.childNodes[ 0 ] );
		} );

		it( 'should create view document fragment from DOM document fragment without children', () => {
			const domImg = createElement( document, 'img' );
			const domText = document.createTextNode( 'foo' );
			const domFragment = document.createDocumentFragment();

			domFragment.appendChild( domImg );
			domFragment.appendChild( domText );

			const viewImg = new ViewElement( 'img' );

			converter.bindElements( domImg, viewImg );

			const viewFragment = converter.domToView( domFragment, { withChildren: false } );

			expect( viewFragment ).to.be.an.instanceof( ViewDocumentFragment );

			expect( viewFragment.getChildCount() ).to.equal( 0 );
			expect( converter.getCorrespondingDom( viewFragment ) ).to.not.equal( domFragment );
		} );

		it( 'should return already bind document fragment', () => {
			const domFragment = document.createDocumentFragment();
			const viewFragment = new ViewDocumentFragment();

			converter.bindDocumentFragments( domFragment, viewFragment );

			const viewFragment2 = converter.domToView( domFragment );

			expect( viewFragment2 ).to.equal( viewFragment );
		} );

		it( 'should return null for block filler', () => {
			const domFiller = converter.blockFiller( document );
			const viewFiller = converter.domToView( domFiller );

			expect( viewFiller ).to.be.null;
		} );
	} );

	describe( 'domChildrenToView', () => {
		it( 'should convert children', () => {
			const domImg = createElement( document, 'img' );
			const domText = document.createTextNode( 'foo' );
			const domP = createElement( document, 'p', null, [ domImg, domText ] );

			const viewChildren = Array.from( converter.domChildrenToView( domP ) );

			expect( viewChildren.length ).to.equal( 2 );
			expect( stringify( viewChildren[ 0 ] ) ).to.equal( '<img></img>' );
			expect( stringify( viewChildren[ 1 ] ) ).to.equal( 'foo' );
		} );

		it( 'should skip filler', () => {
			const domFiller = converter.blockFiller( document );
			const domP = createElement( document, 'p', null, domFiller );

			const viewChildren = Array.from( converter.domChildrenToView( domP ) );

			expect( viewChildren.length ).to.equal( 0 );
		} );

		it( 'should pass options', () => {
			const domText = document.createTextNode( 'foo' );
			const domB = createElement( document, 'b', null, 'bar' );
			const domP = createElement( document, 'p', null, [ domB, domText ] );

			const viewChildren = Array.from( converter.domChildrenToView( domP, { withChildren: false }  ) );

			expect( viewChildren.length ).to.equal( 2 );
			expect( stringify( viewChildren[ 0 ] ) ).to.equal( '<b></b>' );
			expect( stringify( viewChildren[ 1 ] ) ).to.equal( 'foo' );
		} );
	} );

	describe( 'domPositionToView', () => {
		it( 'should converter position in text', () => {
			const domText = document.createTextNode( 'foo' );
			const domB = createElement( document, 'b', null, 'bar' );
			const domP = createElement( document, 'p', null, [ domText, domB ] );

			const viewP = parse( '<p>foo<b>bar</b></p>' );

			converter.bindElements( domP, viewP );
			converter.bindElements( domB, viewP.getChild( 0 ) );

			const viewPosition = converter.domPositionToView( domText, 2 );

			expect( stringify( viewP, viewPosition ) ).to.equal( '<p>fo{}o<b>bar</b></p>' );
		} );

		it( 'should converter position in element', () => {
			const domText = document.createTextNode( 'foo' );
			const domB = createElement( document, 'b', null, 'bar' );
			const domP = createElement( document, 'p', null, [ domText, domB ] );

			const viewP = parse( '<p>foo<b>bar</b></p>' );

			converter.bindElements( domP, viewP );
			converter.bindElements( domB, viewP.getChild( 0 ) );

			const viewPosition = converter.domPositionToView( domP, 1 );

			expect( stringify( viewP, viewPosition ) ).to.equal( '<p>foo[]<b>bar</b></p>' );
		} );

		it( 'should converter position at the beginning', () => {
			const domText = document.createTextNode( 'foo' );
			const domP = createElement( document, 'p', null, domText );

			const viewP = parse( '<p>foo</p>' );

			converter.bindElements( domP, viewP );

			const viewPosition = converter.domPositionToView( domP, 0 );

			expect( stringify( viewP, viewPosition ) ).to.equal( '<p>[]foo</p>' );
		} );

		it( 'should converter position inside block filler', () => {
			const converter = new DomConverter( { blockFiller: NBSP_FILLER } );
			const domFiller = NBSP_FILLER( document );
			const domP = createElement( document, 'p', null, domFiller );

			const viewP = parse( '<p></p>' );

			converter.bindElements( domP, viewP );

			const viewPosition = converter.domPositionToView( domFiller, 0 );

			expect( stringify( viewP, viewPosition ) ).to.equal( '<p>[]</p>' );
		} );

		it( 'should converter position inside inline filler', () => {
			const domFiller = document.createTextNode( INLINE_FILLER );
			const domText = document.createTextNode( 'foo' );
			const domB = createElement( document, 'b', null, domFiller );
			const domP = createElement( document, 'p', null, [ domText, domB ] );

			const viewP = parse( '<p>foo<b></b></p>' );

			converter.bindElements( domP, viewP );
			converter.bindElements( domB, viewP.getChild( 1 ) );

			const viewPosition = converter.domPositionToView( domFiller, INLINE_FILLER_LENGTH );

			expect( stringify( viewP, viewPosition ) ).to.equal( '<p>foo<b>[]</b></p>' );
		} );

		it( 'should converter position inside inline filler with text', () => {
			const domFiller = document.createTextNode( INLINE_FILLER + 'bar' );
			const domText = document.createTextNode( 'foo' );
			const domB = createElement( document, 'b', null, domFiller );
			const domP = createElement( document, 'p', null, [ domText, domB ] );

			const viewP = parse( '<p>foo<b>bar</b></p>' );

			converter.bindElements( domP, viewP );
			converter.bindElements( domB, viewP.getChild( 1 ) );

			const viewPosition = converter.domPositionToView( domFiller, INLINE_FILLER_LENGTH + 2 );

			expect( viewPosition.offset ).to.equal( 2 );
			expect( stringify( viewP, viewPosition ) ).to.equal( '<p>foo<b>ba{}r</b></p>' );
		} );

		it( 'should converter position inside inline filler with text at the beginning', () => {
			const domFiller = document.createTextNode( INLINE_FILLER + 'bar' );
			const domText = document.createTextNode( 'foo' );
			const domB = createElement( document, 'b', null, domFiller );
			const domP = createElement( document, 'p', null, [ domText, domB ] );

			const viewP = parse( '<p>foo<b>bar</b></p>' );

			converter.bindElements( domP, viewP );
			converter.bindElements( domB, viewP.getChild( 1 ) );

			const viewPosition = converter.domPositionToView( domFiller, INLINE_FILLER_LENGTH - 1 );

			expect( viewPosition.offset ).to.equal( 0 );
			expect( stringify( viewP, viewPosition ) ).to.equal( '<p>foo<b>{}bar</b></p>' );
		} );

		it( 'should converter position at the end', () => {
			const domText = document.createTextNode( 'foo' );
			const domP = createElement( document, 'p', null, domText );

			const viewP = parse( '<p>foo</p>' );

			converter.bindElements( domP, viewP );

			const viewPosition = converter.domPositionToView( domP, 1 );

			expect( stringify( viewP, viewPosition ) ).to.equal( '<p>foo[]</p>' );
		} );

		it( 'should return null if there is no corresponding parent node', () => {
			const domText = document.createTextNode( 'foo' );
			const domP = createElement( document, 'p', null, domText );

			const viewPosition = converter.domPositionToView( domP, 0 );

			expect( viewPosition ).to.be.null;
		} );

		it( 'should return null if there is no corresponding sibling node', () => {
			const domB = createElement( document, 'b', null, 'bar' );
			const domText = document.createTextNode( 'foo' );
			const domP = createElement( document, 'p', null, [ domB, domText ] );

			const viewPosition = converter.domPositionToView( domP, 1 );

			expect( viewPosition ).to.be.null;
		} );

		it( 'should return null if there is no corresponding text node', () => {
			const domText = document.createTextNode( 'foo' );

			const viewPosition = converter.domPositionToView( domText, 1 );

			expect( viewPosition ).to.be.null;
		} );
	} );

	describe( 'domRangeToView', () => {
		it( 'should converter DOM range', () => {
			const domFoo = document.createTextNode( 'foo' );
			const domBar = document.createTextNode( 'bar' );
			const domB = createElement( document, 'b', null, domBar );
			const domP = createElement( document, 'p', null, [ domFoo, domB ] );

			const viewP = parse( '<p>foo<b>bar</b></p>' );

			converter.bindElements( domP, viewP );
			converter.bindElements( domB, viewP.getChild( 1 ) );

			const domRange = new Range();
			domRange.setStart( domFoo, 1 );
			domRange.setEnd( domBar, 2 );

			const viewRange = converter.domRangeToView( domRange );

			expect( stringify( viewP, viewRange ) ).to.equal( '<p>f{oo<b>ba}r</b></p>' );
		} );

		it( 'should return null if start or end is null', () => {
			const domFoo = document.createTextNode( 'foo' );
			const domBar = document.createTextNode( 'bar' );
			const domB = createElement( document, 'b', null, domBar );
			createElement( document, 'p', null, [ domFoo, domB ] );

			const domRange = new Range();
			domRange.setStart( domFoo, 1 );
			domRange.setEnd( domBar, 2 );

			const viewRange = converter.domRangeToView( domRange );

			expect( viewRange ).to.be.null;
		} );
	} );

	describe( 'domSelectionToView', () => {
		it( 'should converter selection', () => {
			const domFoo = document.createTextNode( 'foo' );
			const domBar = document.createTextNode( 'bar' );
			const domB = createElement( document, 'b', null, domBar );
			const domP = createElement( document, 'p', null, [ domFoo, domB ] );

			const viewP = parse( '<p>foo<b>bar</b></p>' );

			converter.bindElements( domP, viewP );
			converter.bindElements( domB, viewP.getChild( 1 ) );

			document.body.appendChild( domP );

			const domRange = new Range();
			domRange.setStart( domFoo, 1 );
			domRange.setEnd( domBar, 2 );

			const domSelection = document.getSelection();
			domSelection.removeAllRanges();
			domSelection.addRange( domRange );

			const viewSelection = converter.domSelectionToView( domSelection );

			expect( viewSelection.rangeCount ).to.equal( 1 );
			expect( stringify( viewP, viewSelection.getFirstRange() ) ).to.equal( '<p>f{oo<b>ba}r</b></p>' );
		} );

		it( 'should converter empty selection to empty selection', () => {
			const domSelection = document.getSelection();
			domSelection.removeAllRanges();

			const viewSelection = converter.domSelectionToView( domSelection );

			expect( viewSelection.rangeCount ).to.equal( 0 );
		} );

		it( 'should not add null ranges', () => {
			const domFoo = document.createTextNode( 'foo' );
			const domBar = document.createTextNode( 'bar' );
			const domB = createElement( document, 'b', null, domBar );
			const domP = createElement( document, 'p', null, [ domFoo, domB ] );

			document.body.appendChild( domP );

			const domRange = new Range();
			domRange.setStart( domFoo, 1 );
			domRange.setEnd( domBar, 2 );

			const domSelection = document.getSelection();
			domSelection.removeAllRanges();
			domSelection.addRange( domRange );

			const viewSelection = converter.domSelectionToView( domSelection );

			expect( viewSelection.rangeCount ).to.equal( 0 );
		} );
	} );

	describe( 'getCorrespondingView', () => {
		it( 'should return corresponding view element if element is passed', () => {
			const domElement = document.createElement( 'p' );
			const viewElement = new ViewElement( 'p' );

			converter.bindElements( domElement, viewElement );

			expect( converter.getCorrespondingView( domElement ) ).to.equal( viewElement );
		} );

		it( 'should return corresponding view text if text is passed', () => {
			const domText = document.createTextNode( 'foo' );
			const domP = document.createElement( 'p' );

			domP.appendChild( domText );

			const viewP = converter.domToView( domP );
			const viewText = viewP.getChild( 0 );

			converter.bindElements( domP, viewP );

			expect( converter.getCorrespondingView( domText ) ).to.equal( viewText );
		} );

		it( 'should return corresponding view document fragment', () => {
			const domFragment = document.createDocumentFragment();
			const viewFragment = converter.domToView( domFragment );

			converter.bindElements( domFragment, viewFragment );

			expect( converter.getCorrespondingView( domFragment ) ).to.equal( viewFragment );
		} );

		it( 'should return null if falsy value was passed', () => {
			expect( converter.getCorrespondingView( null ) ).to.be.null;
			expect( converter.getCorrespondingView( undefined ) ).to.be.null;
		} );
	} );

	describe( 'getCorrespondingViewElement', () => {
		it( 'should return corresponding view element', () => {
			const domElement = document.createElement( 'p' );
			const viewElement = new ViewElement( 'p' );

			converter.bindElements( domElement, viewElement );

			expect( converter.getCorrespondingViewElement( domElement ) ).to.equal( viewElement );
		} );
	} );

	describe( 'getCorrespondingViewDocumentFragment', () => {
		it( 'should return corresponding view document fragment', () => {
			const domFragment = document.createDocumentFragment();
			const viewFragment = converter.domToView( domFragment );

			converter.bindElements( domFragment, viewFragment );

			expect( converter.getCorrespondingViewDocumentFragment( domFragment ) ).to.equal( viewFragment );
		} );
	} );

	describe( 'getCorrespondingViewText', () => {
		it( 'should return corresponding view text based on sibling', () => {
			const domImg = document.createElement( 'img' );
			const domText = document.createTextNode( 'foo' );
			const domP = createElement( document, 'p', null, [ domImg, domText ] );

			const viewImg = new ViewElement( 'img' );

			converter.bindElements( domImg, viewImg );

			const viewP = converter.domToView( domP );
			const viewText = viewP.getChild( 1 );

			expect( converter.getCorrespondingViewText( domText ) ).to.equal( viewText );
		} );

		it( 'should return corresponding view text based on parent', () => {
			const domText = document.createTextNode( 'foo' );
			const domP = createElement( document, 'p', null, domText );

			const viewP = converter.domToView( domP );
			const viewText = viewP.getChild( 0 );

			converter.bindElements( domP, viewP );

			expect( converter.getCorrespondingViewText( domText ) ).to.equal( viewText );
		} );

		it( 'should return null if sibling is not bound', () => {
			const domImg = document.createElement( 'img' );
			const domText = document.createTextNode( 'foo' );
			const domP = createElement( document, 'p', null, [ domImg, domText ] );

			const viewP = converter.domToView( domP );

			converter.bindElements( domP, viewP );

			expect( converter.getCorrespondingViewText( domText ) ).to.be.null;
		} );

		it( 'should return null if sibling is not element', () => {
			const domTextFoo = document.createTextNode( 'foo' );
			const domTextBar = document.createTextNode( 'bar' );
			const domP = createElement( document, 'p', null, [ domTextFoo, domTextBar ] );

			const viewP = converter.domToView( domP );

			converter.bindElements( domP, viewP );

			expect( converter.getCorrespondingViewText( domTextBar ) ).to.be.null;
		} );

		it( 'should return null if parent is not bound', () => {
			const domText = document.createTextNode( 'foo' );
			createElement( document, 'p', null, domText );

			expect( converter.getCorrespondingViewText( domText ) ).to.be.null;
		} );

		it( 'should return null for inline filler', () => {
			const domFiller = document.createTextNode( INLINE_FILLER );
			const domP = createElement( document, 'p', null, domFiller );

			const viewP = converter.domToView( domP );

			converter.bindElements( domP, viewP );

			expect( converter.getCorrespondingViewText( domFiller ) ).to.be.null;
		} );

		it( 'should return null if there is no text node sibling in view', () => {
			const domB = document.createElement( 'b' );
			const domI = document.createElement( 'i' );
			const domText = document.createTextNode( 'x' );
			const domP = createElement( document, 'p', null, [ domB, domText, domI ] );

			const viewP = parse( '<p><b></b><i></i></p>' );
			const viewB = viewP.getChild( 0 );
			const viewI = viewP.getChild( 1 );

			converter.bindElements( domP, viewP );
			converter.bindElements( domI, viewI );
			converter.bindElements( domB, viewB );

			expect( converter.getCorrespondingViewText( domText ) ).to.be.null;
		} );

		it( 'should return null if there is no child text node in view', () => {
			const domText = document.createTextNode( 'x' );
			const domP = createElement( document, 'p', null, domText );

			const viewP = parse( '<p></p>' );

			converter.bindElements( domP, viewP );

			expect( converter.getCorrespondingViewText( domText ) ).to.be.null;
		} );
	} );

	describe( 'getCorrespondingDom', () => {
		it( 'should return corresponding DOM element if element was passed', () => {
			const domElement = document.createElement( 'p' );
			const viewElement = new ViewElement( 'p' );

			converter.bindElements( domElement, viewElement );

			expect( converter.getCorrespondingDom( viewElement ) ).to.equal( domElement );
		} );

		it( 'should return corresponding DOM text if text was passed', () => {
			const domText = document.createTextNode( 'foo' );
			const domP = document.createElement( 'p' );

			domP.appendChild( domText );

			const viewP = converter.domToView( domP );
			const viewText = viewP.getChild( 0 );

			converter.bindElements( domP, viewP );

			expect( converter.getCorrespondingDom( viewText ) ).to.equal( domText );
		} );

		it( 'should return corresponding DOM document fragment', () => {
			const domFragment = document.createDocumentFragment();
			const viewFragment = new ViewDocumentFragment();

			converter.bindElements( domFragment, viewFragment );

			expect( converter.getCorrespondingDom( viewFragment ) ).to.equal( domFragment );
		} );
	} );

	describe( 'getCorrespondingDomElement', () => {
		it( 'should return corresponding DOM element', () => {
			const domElement = document.createElement( 'p' );
			const viewElement = new ViewElement( 'p' );

			converter.bindElements( domElement, viewElement );

			expect( converter.getCorrespondingDomElement( viewElement ) ).to.equal( domElement );
		} );
	} );

	describe( 'getCorrespondingDomDocumentFragment', () => {
		it( 'should return corresponding DOM document fragment', () => {
			const domFragment = document.createDocumentFragment();
			const viewFragment = new ViewDocumentFragment();

			converter.bindElements( domFragment, viewFragment );

			expect( converter.getCorrespondingDomDocumentFragment( viewFragment ) ).to.equal( domFragment );
		} );
	} );

	describe( 'getCorrespondingDomText', () => {
		it( 'should return corresponding DOM text based on sibling', () => {
			const domImg = document.createElement( 'img' );
			const domText = document.createTextNode( 'foo' );
			const domP = document.createElement( 'p' );

			domP.appendChild( domImg );
			domP.appendChild( domText );

			const viewImg = new ViewElement( 'img' );

			converter.bindElements( domImg, viewImg );

			const viewP = converter.domToView( domP );
			const viewText = viewP.getChild( 1 );

			expect( converter.getCorrespondingDomText( viewText ) ).to.equal( domText );
		} );

		it( 'should return corresponding DOM text based on parent', () => {
			const domText = document.createTextNode( 'foo' );
			const domP = document.createElement( 'p' );

			domP.appendChild( domText );

			const viewP = converter.domToView( domP );
			const viewText = viewP.getChild( 0 );

			converter.bindElements( domP, viewP );

			expect( converter.getCorrespondingDomText( viewText ) ).to.equal( domText );
		} );

		it( 'should return null if sibling is not bound', () => {
			const domImg = document.createElement( 'img' );
			const domText = document.createTextNode( 'foo' );
			const domP = document.createElement( 'p' );

			domP.appendChild( domImg );
			domP.appendChild( domText );

			const viewP = converter.domToView( domP );
			const viewText = viewP.getChild( 1 );

			converter.bindElements( domP, viewP );

			expect( converter.getCorrespondingDomText( viewText ) ).to.be.null;
		} );

		it( 'should return null if parent is not bound', () => {
			const domText = document.createTextNode( 'foo' );
			const domP = document.createElement( 'p' );

			domP.appendChild( domText );

			const viewP = converter.domToView( domP );
			const viewText = viewP.getChild( 0 );

			expect( converter.getCorrespondingDomText( viewText ) ).to.be.null;
		} );
	} );
} );
