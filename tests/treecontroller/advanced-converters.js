/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* bender-tags: treecontroller */

'use strict';

import ModelDocument from '/ckeditor5/engine/treemodel/document.js';
import ModelDocumentFragment from '/ckeditor5/engine/treemodel/documentfragment.js';
import ModelElement from '/ckeditor5/engine/treemodel/element.js';
import ModelText from '/ckeditor5/engine/treemodel/text.js';
import ModelTextProxy from '/ckeditor5/engine/treemodel/textproxy.js';
import ModelRange from '/ckeditor5/engine/treemodel/range.js';
import ModelPosition from '/ckeditor5/engine/treemodel/position.js';
import ModelWalker from '/ckeditor5/engine/treemodel/treewalker.js';

import ViewDocumentFragment from '/ckeditor5/engine/treeview/documentfragment.js';
import ViewElement from '/ckeditor5/engine/treeview/element.js';
import ViewContainerElement from '/ckeditor5/engine/treeview/containerelement.js';
import ViewAttributeElement from '/ckeditor5/engine/treeview/attributeelement.js';
import ViewText from '/ckeditor5/engine/treeview/text.js';
import ViewWriter from  '/ckeditor5/engine/treeview/writer.js';
import ViewPosition from '/ckeditor5/engine/treeview/position.js';
import ViewRange from '/ckeditor5/engine/treeview/range.js';

import Mapper from '/ckeditor5/engine/treecontroller/mapper.js';
import ModelConversionDispatcher from '/ckeditor5/engine/treecontroller/modelconversiondispatcher.js';
import ViewConversionDispatcher from '/ckeditor5/engine/treecontroller/viewconversiondispatcher.js';

import {
	insertElement,
	insertText,
	setAttribute,
	removeAttribute,
	wrap,
	unwrap,
	move,
	remove,
	eventNameToConsumableType
} from '/ckeditor5/engine/treecontroller/model-to-view-converters.js';
import { convertToModelFragment, convertText } from '/ckeditor5/engine/treecontroller/view-to-model-converters.js';

let modelDoc, modelRoot, viewRoot, mapper, writer, modelDispatcher, viewDispatcher;

beforeEach( () => {
	modelDoc = new ModelDocument();
	modelRoot = modelDoc.createRoot( 'root' );
	viewRoot = new ViewContainerElement( 'div' );

	mapper = new Mapper();
	mapper.bindElements( modelRoot, viewRoot );

	writer = new ViewWriter();

	modelDispatcher = new ModelConversionDispatcher( { mapper, writer } );
	viewDispatcher = new ViewConversionDispatcher();

	modelDispatcher.on( 'insert:$text', insertText() );
	modelDispatcher.on( 'move', move() );
	modelDispatcher.on( 'remove', remove() );
	viewDispatcher.on( 'text', convertText() );
	viewDispatcher.on( 'documentFragment', convertToModelFragment() );
} );

function viewAttributesToString( item ) {
	let result = '';

	for ( let key of item.getAttributeKeys() ) {
		let value = item.getAttribute( key );

		if ( value ) {
			result += ' ' + key + '="' + value + '"';
		}
	}

	return result;
}

function viewToString( item ) {
	let result = '';

	if ( item instanceof ViewText ) {
		result = item.data;
	} else {
		// ViewElement or ViewDocumentFragment.
		for ( let child of item.getChildren() ) {
			result += viewToString( child );
		}

		if ( item instanceof ViewElement ) {
			result = '<' + item.name + viewAttributesToString( item ) + '>' + result + '</' + item.name + '>';
		}
	}

	return result;
}

function modelAttributesToString( item ) {
	let result = '';

	for ( let attr of item.getAttributes() ) {
		result += ' ' + attr[ 0 ] + '="' + attr[ 1 ] + '"';
	}

	return result;
}

function modelToString( item ) {
	let result = '';

	if ( item instanceof ModelTextProxy ) {
		let attributes = modelAttributesToString( item );

		result = attributes ? '<$text' + attributes + '>' + item.text + '</$text>' : item.text;
	} else {
		let walker = new ModelWalker( { boundaries: ModelRange.createFromElement( item ), shallow: true } );

		for ( let value of walker ) {
			result += modelToString( value.item );
		}

		if ( item instanceof ModelElement ) {
			let attributes = modelAttributesToString( item );

			result = '<' + item.name + attributes + '>' + result + '</' + item.name + '>';
		}
	}

	return result;
}

// Converter for custom `image` element that might have a `caption` element inside which changes
// how the image is displayed in the view:
//
// Model:
//
// [image {src="foo.jpg" title="foo"}]
//   └─ [caption]
//       ├─ f
//       ├─ o
//       └─ o
//
// [image {src="bar.jpg" title="bar"}]
//
// View:
//
// <figure>
//   ├─ <img src="foo.jpg" title="foo" />
//   └─ <caption>
//       └─ foo
//
// <img src="bar.jpg" title="bar" />
describe( 'image with caption converters', () => {
	beforeEach( () => {
		const modelImageConverter = function( evt, data, consumable, conversionApi ) {
			// First, consume the `image` element.
			consumable.consume( data.item, 'insert' );

			// Just create normal image element for the view.
			// Maybe it will be "decorated" later.
			const viewImage = new ViewContainerElement( 'img' );
			const insertPosition = conversionApi.mapper.toViewPosition( data.range.start );

			// Check if the `image` element has children.
			if ( data.item.getChildCount() > 0 ) {
				const modelCaption = data.item.getChild( 0 );

				// `modelCaption` insertion change is consumed from consumable values.
				// It will not be converted by other converters, but it's children (probably some text) will be.
				// Through mapping, converters for text will know where to insert contents of `modelCaption`.
				if ( consumable.consume( modelCaption, 'insert' ) ) {
					const viewCaption = new ViewContainerElement( 'figcaption' );

					const viewImageHolder = new ViewContainerElement( 'figure', null, [ viewImage, viewCaption ] );

					conversionApi.mapper.bindElements( modelCaption, viewCaption );
					conversionApi.mapper.bindElements( data.item, viewImageHolder );
					conversionApi.writer.insert( insertPosition, viewImageHolder );
				}
			} else {
				conversionApi.mapper.bindElements( data.item, viewImage );
				conversionApi.writer.insert( insertPosition, viewImage );
			}

			evt.stop();
		};

		const modelImageAttributesConverter = function( evt, data, consumable, conversionApi ) {
			if ( data.item.name != 'image' ) {
				return;
			}

			let viewElement = conversionApi.mapper.toViewElement( data.item );

			if ( viewElement.name == 'figure' ) {
				viewElement = viewElement.getChild( 0 );
			}

			consumable.consume( data.item, eventNameToConsumableType( evt.name ) );

			if ( !data.attributeNewValue ) {
				viewElement.removeAttribute( data.attributeKey );
			} else {
				viewElement.setAttribute( data.attributeKey, data.attributeNewValue );
			}

			evt.stop();
		};

		const viewFigureConverter = function( evt, data, consumable, conversionApi ) {
			if ( consumable.consume( data.input, { name: true } ) ) {
				const modelImage = conversionApi.convertItem( data.input.getChild( 0 ), consumable );
				const modelCaption = conversionApi.convertItem( data.input.getChild( 1 ), consumable );

				modelImage.appendChildren( modelCaption );

				data.output = modelImage;
			}
		};

		const viewImageConverter = function( evt, data, consumable ) {
			if ( consumable.consume( data.input, { name: true } ) ) {
				const modelImage = new ModelElement( 'image' );

				for ( let attributeKey of data.input.getAttributeKeys() ) {
					modelImage.setAttribute( attributeKey, data.input.getAttribute( attributeKey ) );
				}

				data.output = modelImage;
			}
		};

		const viewFigcaptionConverter = function( evt, data, consumable, conversionApi ) {
			if ( consumable.consume( data.input, { name: true } ) ) {
				const modelCaption = new ModelElement( 'caption' );
				const children = conversionApi.convertChildren( data.input, consumable );

				modelCaption.appendChildren( children );

				data.output = modelCaption;
			}
		};

		modelDispatcher.on( 'insert:image', modelImageConverter );
		modelDispatcher.on( 'addAttribute', modelImageAttributesConverter );
		modelDispatcher.on( 'changeAttribute', modelImageAttributesConverter );
		modelDispatcher.on( 'removeAttribute', modelImageAttributesConverter );
		viewDispatcher.on( 'element:figure', viewFigureConverter );
		viewDispatcher.on( 'element:img', viewImageConverter );
		viewDispatcher.on( 'element:figcaption', viewFigcaptionConverter );
	} );

	it( 'should convert model images changes without caption to view', () => {
		let modelElement = new ModelElement( 'image', { src: 'bar.jpg', title: 'bar' } );
		modelRoot.appendChildren( modelElement );
		modelDispatcher.convertInsert( ModelRange.createFromElement( modelRoot ) );

		expect( viewToString( viewRoot ) ).to.equal( '<div><img src="bar.jpg" title="bar"></img></div>' );

		modelElement.setAttribute( 'src', 'new.jpg' );
		modelElement.removeAttribute( 'title' );
		modelDispatcher.convertAttribute( 'changeAttribute', ModelRange.createOnElement( modelElement ), 'src', 'bar.jpg', 'new.jpg' );
		modelDispatcher.convertAttribute( 'removeAttribute', ModelRange.createOnElement( modelElement ), 'title', 'bar', null );

		expect( viewToString( viewRoot ) ).to.equal( '<div><img src="new.jpg"></img></div>' );
	} );

	it( 'should convert model images changes with caption to view', () => {
		let modelElement = new ModelElement( 'image', { src: 'foo.jpg', title: 'foo' }, new ModelElement( 'caption', {}, 'foobar' ) );
		modelRoot.appendChildren( modelElement );
		modelDispatcher.convertInsert( ModelRange.createFromElement( modelRoot ) );

		expect( viewToString( viewRoot ) ).to.equal(
			'<div><figure><img src="foo.jpg" title="foo"></img><figcaption>foobar</figcaption></figure></div>'
		);

		modelElement.setAttribute( 'src', 'new.jpg' );
		modelElement.removeAttribute( 'title' );
		modelDispatcher.convertAttribute( 'changeAttribute', ModelRange.createOnElement( modelElement ), 'src', 'bar.jpg', 'new.jpg' );
		modelDispatcher.convertAttribute( 'removeAttribute', ModelRange.createOnElement( modelElement ), 'title', 'bar', null );

		expect( viewToString( viewRoot ) ).to.equal( '<div><figure><img src="new.jpg"></img><figcaption>foobar</figcaption></figure></div>' );
	} );

	it( 'should convert view image to model', () => {
		let viewElement = new ViewContainerElement( 'img', { src: 'bar.jpg', title: 'bar' } );
		let modelElement = viewDispatcher.convert( viewElement );
		// Attaching to tree so tree walker works fine in `modelToString`.
		modelRoot.appendChildren( modelElement );

		expect( modelToString( modelElement ) ).to.equal( '<image src="bar.jpg" title="bar"></image>' );
	} );

	it( 'should convert view figure to model', () => {
		let viewElement = new ViewContainerElement(
			'figure',
			null,
			[
				new ViewContainerElement( 'img', { src: 'bar.jpg', title: 'bar' } ),
				new ViewContainerElement( 'figcaption', null, new ViewText( 'foobar' ) )
			]
		);
		let modelElement = viewDispatcher.convert( viewElement );
		// Attaching to tree so tree walker works fine in `modelToString`.
		modelRoot.appendChildren( modelElement );

		expect( modelToString( modelElement ) ).to.equal( '<image src="bar.jpg" title="bar"><caption>foobar</caption></image>' );
	} );
} );

// Converter overwrites default attribute converter for `linkHref` and `linkTitle` attribute is set on `quote` element.
//
// Model:
//
// [quote {linkHref='foo.html' linkTitle='Foo source'}]
//   ├─ f
//   ├─ o
//   └─ o
//
// foo {linkHref='foo.html' linkTitle='Foo title'}
//
// View:
//
// <blockquote>
//	 ├─ foo
//	 └─ <a href="foo.html" title="Foo source">
//	 	  └─ see source
//
// <a href="foo.html" title="Foo title">
//	 └─ foo
describe( 'custom attribute handling for given element', () => {
	beforeEach( () => {
		// NORMAL LINK MODEL TO VIEW CONVERTERS
		modelDispatcher.on( 'addAttribute:linkHref', wrap( ( value ) => new ViewAttributeElement( 'a', { href: value } ) ), null, 99 );
		modelDispatcher.on( 'addAttribute:linkTitle', wrap( ( value ) => new ViewAttributeElement( 'a', { title: value } ) ), null, 99 );

		const changeLinkAttribute = function( elementCreator ) {
			return ( evt, data, consumable, conversionApi ) => {
				consumable.consume( data.item, eventNameToConsumableType( evt.name ) );

				const viewRange = conversionApi.mapper.toViewRange( data.range );
				const viewOldA = elementCreator( data.attributeOldValue );
				const viewNewA = elementCreator( data.attributeNewValue );

				conversionApi.writer.unwrap( viewRange, viewOldA, evt.priority );
				conversionApi.writer.wrap( viewRange, viewNewA, evt.priority );

				evt.stop();
			};
		};

		modelDispatcher.on(
			'changeAttribute:linkHref',
			changeLinkAttribute( ( value ) => new ViewAttributeElement( 'a', { href: value } ) ),
			null,
			99
		);

		modelDispatcher.on(
			'changeAttribute:linkTitle',
			changeLinkAttribute( ( value ) => new ViewAttributeElement( 'a', { title: value } ) ),
			null,
			99
		);

		modelDispatcher.on(
			'removeAttribute:linkHref',
			unwrap( ( value ) => new ViewAttributeElement( 'a', { href: value } ) ),
			null,
			99
		);

		modelDispatcher.on(
			'removeAttribute:linkTitle',
			unwrap( ( value ) => new ViewAttributeElement( 'a', { title: value } ) ),
			null,
			99
		);

		// NORMAL LINK VIEW TO MODEL CONVERTERS
		viewDispatcher.on( 'element:a', ( evt, data, consumable, conversionApi ) => {
			if ( consumable.consume( data.input, { name: true, attribute: 'href' } ) ) {
				if ( !data.output ) {
					data.output = conversionApi.convertChildren( data.input, consumable );
				}

				for ( let child of data.output ) {
					child.setAttribute( 'linkHref', data.input.getAttribute( 'href' ) );
				}
			}
		} );

		viewDispatcher.on( 'element:a', ( evt, data, consumable, conversionApi ) => {
			if ( consumable.consume( data.input, { attribute: 'title' } ) ) {
				if ( !data.output ) {
					data.output = conversionApi.convertChildren( data.input, consumable );
				}

				for ( let child of data.output ) {
					child.setAttribute( 'linkTitle', data.input.getAttribute( 'title' ) );
				}
			}
		} );

		// QUOTE MODEL TO VIEW CONVERTERS
		modelDispatcher.on( 'insert:quote', ( evt, data, consumable, conversionApi ) => {
			consumable.consume( data.item, 'insert' );

			const viewPosition = conversionApi.mapper.toViewPosition( data.range.start );
			const viewElement = new ViewContainerElement( 'blockquote' );

			conversionApi.mapper.bindElements( data.item, viewElement );
			conversionApi.writer.insert( viewPosition, viewElement );

			if ( consumable.consume( data.item, 'addAttribute:linkHref' ) ) {
				const viewA = new ViewAttributeElement( 'a', { href: data.item.getAttribute( 'linkHref' ) }, new ViewText( 'see source' ) );

				if ( consumable.consume( data.item, 'addAttribute:linkTitle' ) ) {
					viewA.setAttribute( 'title', data.item.getAttribute( 'linkTitle' ) );
				}

				conversionApi.writer.insert( new ViewPosition( viewElement, viewElement.getChildCount() ), viewA );
			}

			evt.stop();
		} );

		const modelChangeLinkAttrQuoteConverter = function( evt, data, consumable, conversionApi ) {
			let viewKey = data.attributeKey.substr( 4 ).toLowerCase();

			consumable.consume( data.item, eventNameToConsumableType( evt.name ) );

			const viewElement = conversionApi.mapper.toViewElement( data.item );
			const viewA = viewElement.getChild( viewElement.getChildCount() - 1 );

			if ( data.attributeNewValue !== null ) {
				viewA.setAttribute( viewKey, data.attributeNewValue );
			} else {
				viewA.removeAttribute( viewKey );
			}

			evt.stop();
		};

		modelDispatcher.on( 'changeAttribute:linkHref:quote', modelChangeLinkAttrQuoteConverter );
		modelDispatcher.on( 'changeAttribute:linkTitle:quote', modelChangeLinkAttrQuoteConverter );

		modelDispatcher.on( 'removeAttribute:linkHref:quote', ( evt, data, consumable, conversionApi ) => {
			consumable.consume( data.item, eventNameToConsumableType( evt.name ) );

			const viewElement = conversionApi.mapper.toViewElement( data.item );
			const viewA = viewElement.getChild( viewElement.getChildCount() - 1 );
			const aIndex = viewA.getIndex();

			conversionApi.writer.remove( ViewRange.createFromParentsAndOffsets( viewElement, aIndex, viewElement, aIndex + 1 ) );

			evt.stop();
		} );
		modelDispatcher.on( 'removeAttribute:linkTitle:quote', modelChangeLinkAttrQuoteConverter );


		// QUOTE VIEW TO MODEL CONVERTERS
		viewDispatcher.on( 'element:blockquote', ( evt, data, consumable, conversionApi ) => {
			if ( consumable.consume( data.input, { name: true } ) ) {
				data.output = new ModelElement( 'quote' );

				const viewA = data.input.getChild( data.input.getChildCount() - 1 );

				// Convert the special "a" first, before converting all children.
				if ( viewA instanceof ViewElement && viewA.name == 'a' && consumable.consume( viewA, { name: true } ) ) {
					if ( consumable.consume( viewA, { attribute: 'href' } ) ) {
						data.output.setAttribute( 'linkHref', viewA.getAttribute( 'href' ) );
					}

					if ( consumable.consume( viewA, { attribute: 'title' } ) ) {
						data.output.setAttribute( 'linkTitle', viewA.getAttribute( 'title' ) );
					}
				}

				const children = conversionApi.convertChildren( data.input, consumable );
				data.output.appendChildren( children );
			}
		} );
	} );

	it( 'should convert model text with linkHref and linkTitle to view', () => {
		const modelText = new ModelText( 'foo', { linkHref: 'foo.html', linkTitle: 'Foo title' } );
		modelRoot.appendChildren( modelText );

		let range = ModelRange.createFromElement( modelRoot );

		modelDispatcher.convertInsert( range );

		// The expected value is different than in example or than what is really expected as it should be one link,
		// but writer does not have merging feature yet.
		expect( viewToString( viewRoot ) ).to.equal( '<div><a title="Foo title"><a href="foo.html">foo</a></a></div>' );

		// Let's change link's attributes.
		for ( let value of range ) {
			value.item.setAttribute( 'linkHref', 'bar.html' );
			value.item.setAttribute( 'linkTitle', 'Bar title' );
		}
		modelDispatcher.convertAttribute( 'changeAttribute', range, 'linkHref', 'foo.html', 'bar.html' );
		modelDispatcher.convertAttribute( 'changeAttribute', range, 'linkTitle', 'Foo title', 'Bar title' );

		expect( viewToString( viewRoot ) ).to.equal( '<div><a title="Bar title"><a href="bar.html">foo</a></a></div>' );

		// Let's remove a letter from the link.
		const removed = modelRoot.removeChildren( 0, 1 );
		modelDoc.graveyard.appendChildren( removed );
		modelDispatcher.convertRemove(
			ModelPosition.createFromParentAndOffset( modelRoot, 0 ),
			ModelRange.createFromElement( modelDoc.graveyard )
		);

		expect( viewToString( viewRoot ) ).to.equal( '<div><a title="Bar title"><a href="bar.html">oo</a></a></div>' );

		range = ModelRange.createFromElement( modelRoot );

		// Let's remove just one attribute.
		for ( let value of range ) {
			value.item.removeAttribute( 'linkTitle' );
		}
		modelDispatcher.convertAttribute( 'removeAttribute', range, 'linkTitle', 'Bar title', null );

		expect( viewToString( viewRoot ) ).to.equal( '<div><a href="bar.html">oo</a></div>' );

		// Let's remove the other attribute.
		for ( let value of range ) {
			value.item.removeAttribute( 'linkHref' );
		}
		modelDispatcher.convertAttribute( 'removeAttribute', range, 'linkHref', 'bar.html', null );

		expect( viewToString( viewRoot ) ).to.equal( '<div>oo</div>' );
	} );

	it( 'should convert a view element to model', () => {
		let viewElement = new ViewAttributeElement( 'a', { href: 'foo.html', title: 'Foo title' }, new ViewText( 'foo' ) );

		let modelText = viewDispatcher.convert( viewElement )[ 0 ];

		expect( modelText ).to.be.instanceof( ModelText );
		expect( modelText.text ).to.equal( 'foo' );
		expect( modelText.getAttribute( 'linkHref' ) ).to.equal( 'foo.html' );
		expect( modelText.getAttribute( 'linkTitle' ) ).to.equal( 'Foo title' );
	} );

	it( 'should convert quote model element with linkHref and linkTitle attribute to view', () => {
		let modelElement = new ModelElement( 'quote', { linkHref: 'foo.html', linkTitle: 'Foo source' }, 'foo' );
		modelRoot.appendChildren( modelElement );
		modelDispatcher.convertInsert( ModelRange.createFromElement( modelRoot ) );

		let expected = '<div><blockquote>foo<a href="foo.html" title="Foo source">see source</a></blockquote></div>';
		expect( viewToString( viewRoot ) ).to.equal( expected );

		modelDispatcher.on( 'addAttribute:bold', wrap( new ViewAttributeElement( 'strong' ) ) );
		modelDispatcher.on( 'changeAttribute:bold', wrap( new ViewAttributeElement( 'strong' ) ) );
		modelDispatcher.on( 'removeAttribute:bold', unwrap( new ViewAttributeElement( 'strong' ) ) );

		modelElement.appendChildren( new ModelText( 'bar', { bold: true } ) );
		modelDispatcher.convertInsert( ModelRange.createFromParentsAndOffsets( modelElement, 3, modelElement, 6 ) );

		expected = '<div><blockquote>foo<strong>bar</strong><a href="foo.html" title="Foo source">see source</a></blockquote></div>';
		expect( viewToString( viewRoot ) ).to.equal( expected );

		modelElement.removeAttribute( 'linkTitle' );
		modelElement.setAttribute( 'linkHref', 'bar.html' );

		modelDispatcher.convertAttribute( 'removeAttribute', ModelRange.createOnElement( modelElement ), 'linkTitle', 'Foo source', null );
		modelDispatcher.convertAttribute( 'changeAttribute', ModelRange.createOnElement( modelElement ), 'linkHref', 'foo.html', 'bar.html' );

		expected = '<div><blockquote>foo<strong>bar</strong><a href="bar.html">see source</a></blockquote></div>';
		expect( viewToString( viewRoot ) ).to.equal( expected );

		modelElement.removeAttribute( 'linkHref' );
		modelDispatcher.convertAttribute( 'removeAttribute', ModelRange.createFromElement( modelRoot ), 'linkHref', 'bar.html', null );

		expected = '<div><blockquote>foo<strong>bar</strong></blockquote></div>';
		expect( viewToString( viewRoot ) ).to.equal( expected );
	} );

	it( 'should convert view blockquote with a element to model', () => {
		let viewElement = new ViewContainerElement(
			'blockquote',
			null,
			[
				new ViewText( 'foo' ),
				new ViewAttributeElement(
					'a',
					{
						href: 'foo.html',
						title:'Foo source'
					},
					new ViewText( 'see source' )
				)
			]
		);

		let modelElement = viewDispatcher.convert( viewElement );
		modelRoot.appendChildren( modelElement );

		expect( modelToString( modelElement ) ).to.equal( '<quote linkHref="foo.html" linkTitle="Foo source">foo</quote>' );
	} );
} );

// Default view converter for tables that will convert table structure into paragraphs if tables are not supported.
// TRs are supposed to become paragraphs and TDs content should be separated using space.
it( 'default table view to model converter', () => {
	viewDispatcher.on( 'element:a', ( evt, data, consumable, conversionApi ) => {
		if ( consumable.consume( data.input, { name: true, attribute: 'href' } ) ) {
			if ( !data.output ) {
				data.output = conversionApi.convertChildren( data.input, consumable );
			}

			for ( let child of data.output ) {
				child.setAttribute( 'linkHref', data.input.getAttribute( 'href' ) );
			}
		}
	} );

	viewDispatcher.on( 'element:tr', ( evt, data, consumable, conversionApi ) => {
		if ( consumable.consume( data.input, { name: true } ) ) {
			data.output = new ModelElement( 'paragraph' );
			const children = conversionApi.convertChildren( data.input, consumable );

			for ( let i = 1; i < children.length; i++ ) {
				if ( children[ i ] instanceof ModelText && children[ i - 1 ] instanceof ModelText ) {
					children[ i - 1 ].text += ' ';
				}
			}

			data.output.appendChildren( children );
		}
	} );

	viewDispatcher.on( 'element:table', ( evt, data, consumable, conversionApi ) => {
		if ( consumable.consume( data.input, { name: true } ) ) {
			data.output = conversionApi.convertChildren( data.input, consumable );
		}
	} );

	viewDispatcher.on( 'element:td', ( evt, data, consumable, conversionApi ) => {
		if ( consumable.consume( data.input, { name: true } ) ) {
			data.output = conversionApi.convertChildren( data.input, consumable );
		}
	} );

	let viewTable = new ViewContainerElement( 'table', null, [
		new ViewContainerElement( 'tr', null, [
			new ViewContainerElement( 'td', null, new ViewText( 'foo' ) ),
			new ViewContainerElement( 'td', null, new ViewAttributeElement( 'a', { href: 'bar.html' }, new ViewText( 'bar' ) ) )
		] ),
		new ViewContainerElement( 'tr', null, [
			new ViewContainerElement( 'td' ),
			new ViewContainerElement( 'td', null, new ViewText( 'abc' ) )
		] )
	] );

	let model = viewDispatcher.convert( viewTable );
	let modelFragment = new ModelDocumentFragment( model );

	expect( modelToString( modelFragment ) ).to.equal( '<paragraph>foo <$text linkHref="bar.html">bar</$text></paragraph><paragraph>abc</paragraph>' );
} );

// Model converter that converts any non-converted elements and attributes into view elements and attributes.
// View converter that converts any non-converted elements and attributes into model elements and attributes.
describe( 'universal converter', () => {
	beforeEach( () => {
		// "Universal" converters
		modelDispatcher.on( 'insert', insertElement( ( data ) => new ViewContainerElement( data.item.name ) ), null, 99 );
		modelDispatcher.on( 'addAttribute', setAttribute(), null, 99 );
		modelDispatcher.on( 'changeAttribute', setAttribute(), null, 99 );
		modelDispatcher.on( 'removeAttribute', removeAttribute(), null, 99 );

		viewDispatcher.on( 'element', ( evt, data, consumable, conversionApi ) => {
			if ( consumable.consume( data.input, { name: true } ) ) {
				data.output = new ModelElement( data.input.name );

				for ( let key of data.input.getAttributeKeys() ) {
					if ( consumable.consume( data.input, { attribute: key } ) ) {
						data.output.setAttribute( key, data.input.getAttribute( key ) );
					}
				}

				data.output.appendChildren( conversionApi.convertChildren( data.input, consumable ) );
			}
		}, null, 99 );

		// "Real" converters -- added with sooner priority. Should overwrite the "universal" converters.
		modelDispatcher.on( 'insert:image', insertElement( new ViewContainerElement( 'img' ) ) );
		modelDispatcher.on( 'addAttribute:bold', wrap( new ViewAttributeElement( 'strong' ) ) );
		modelDispatcher.on( 'changeAttribute:bold', wrap( new ViewAttributeElement( 'strong' ) ) );
		modelDispatcher.on( 'removeAttribute:bold', unwrap( new ViewAttributeElement( 'strong' ) ) );

		viewDispatcher.on( 'element:img', ( evt, data, consumable ) => {
			if ( consumable.consume( data.input, { name: true } ) ) {
				const modelImage = new ModelElement( 'image' );

				for ( let attributeKey of data.input.getAttributeKeys() ) {
					modelImage.setAttribute( attributeKey, data.input.getAttribute( attributeKey ) );
				}

				data.output = modelImage;
			}
		} );
		viewDispatcher.on( 'element:strong', ( evt, data, consumable, conversionApi ) => {
			if ( consumable.consume( data.input, { name: true } ) ) {
				if ( !data.output ) {
					data.output = conversionApi.convertChildren( data.input, consumable );
				}

				for ( let child of data.output ) {
					child.setAttribute( 'bold', true );
				}
			}
		} );
	} );

	it( 'should convert model to view', () => {
		let modelElement = new ModelElement( 'table', { cellpadding: 5, cellspacing: 5 }, [
			new ModelElement( 'tr', null, [
				new ModelElement( 'td', null, [
					'foo ',
					new ModelText( 'abc', { bold: true } ),
					' bar'
				] ),
				new ModelElement( 'td', null, [
					new ModelElement( 'foo', { foo: 'bar' }, 'bar' )
				] )
			] )
		] );

		modelRoot.appendChildren( modelElement );
		modelDispatcher.convertInsert( ModelRange.createFromElement( modelRoot ) );

		expect( viewToString( viewRoot ) ).to.equal(
			'<div>' +
				'<table cellpadding="5" cellspacing="5">' +
					'<tr>' +
						'<td>foo <strong>abc</strong> bar</td>' +
						'<td><foo foo="bar">bar</foo></td>' +
					'</tr>' +
				'</table>' +
			'</div>'
		);
	} );

	it( 'should convert view to model', () => {
		let viewElement = new ViewContainerElement( 'table', { cellpadding: 5, cellspacing: 5 }, [
			new ViewContainerElement( 'tr', null, [
				new ViewContainerElement( 'td', null, [
					new ViewText( 'foo ' ),
					new ViewAttributeElement( 'strong', null, new ViewText( 'abc' ) ),
					new ViewText( ' bar' )
				] ),
				new ViewContainerElement( 'td', null, new ViewContainerElement( 'foo', { foo: 'bar' }, new ViewText( 'bar' ) ) )
			] )
		] );

		let modelElement = viewDispatcher.convert( viewElement );
		modelRoot.appendChildren( modelElement );

		expect( modelToString( modelElement ) ).to.equal(
			'<table cellpadding="5" cellspacing="5">' +
				'<tr>' +
					'<td>foo <$text bold="true">abc</$text> bar</td>' +
					'<td><foo foo="bar">bar</foo></td>' +
				'</tr>' +
			'</table>'
		);
	} );
} );