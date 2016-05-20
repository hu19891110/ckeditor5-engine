/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

'use strict';

import MoveDelta from './movedelta.js';
import { register } from '../batch.js';
import DeltaFactory from './deltafactory.js';
import RemoveOperation from '../operation/removeoperation.js';
import Position from '../position.js';
import Range from '../range.js';

/**
 * @classdesc
 * To provide specific OT behavior and better collisions solving, {@link engine.model.Batch#remove} method
 * uses the `RemoveDelta` class which inherits from the `Delta` class and may overwrite some methods.
 *
 * @memberOf engine.model.delta
 */
export default class RemoveDelta extends MoveDelta {
	/**
	 * @inheritDoc
	 */
	static get className() {
		return 'engine.model.delta.RemoveDelta';
	}
}

function addRemoveOperation( batch, delta, position, howMany ) {
	const operation = new RemoveOperation( position, howMany, batch.doc.version );
	delta.addOperation( operation );
	batch.doc.applyOperation( operation );
}

/**
 * Removes given node or range of nodes.
 *
 * @chainable
 * @method engine.model.Batch#remove
 * @param {engine.model.Node|engine.model.Range} nodeOrRange Node or range of nodes to remove.
 */
register( 'remove', function( nodeOrRange ) {
	const delta = new RemoveDelta();
	this.addDelta( delta );

	if ( nodeOrRange instanceof Range ) {
		// The array is reversed, so the ranges are correct and do not have to be updated.
		let ranges = nodeOrRange.getMinimalFlatRanges().reverse();

		for ( let flat of ranges ) {
			addRemoveOperation( this, delta, flat.start, flat.end.offset - flat.start.offset );
		}
	} else {
		addRemoveOperation( this, delta, Position.createBefore( nodeOrRange ), 1 );
	}

	return this;
} );

DeltaFactory.register( RemoveDelta );