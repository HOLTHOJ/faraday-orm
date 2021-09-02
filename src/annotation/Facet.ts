/*
 *  Copyright (C) 2020  Jeroen Holthof <https://github.com/HOLTHOJ/faraday-orm>
 *
 *  This library is free software; you can redistribute it and/or
 *  modify it under the terms of the GNU Lesser General Public
 *  License as published by the Free Software Foundation; either
 *  version 2.1 of the License, or (at your option) any later version.
 *
 *  This library is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 *  Lesser General Public License for more details.
 *
 *  You should have received a copy of the GNU Lesser General Public
 *  License along with this library; if not, write to the Free Software
 *  Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301 USA
 */

import {DynamoDB} from "aws-sdk";
import {PathGenerator} from "../util/KeyPath";
import {Class} from "../util";
import {FACET_IDS, FacetIdType} from "./FacetId";

/** The facet query operation */
export type FacetQueryOperation = DynamoDB.ComparisonOperator;

/** @internal Repository of all facets and the constructor function on which they are defined. */
export const FACET_DEF = new Map<Function, Array<Readonly<FacetDef>>>();

/**
 * The default index. This will query the table's PK & SK without an index.
 * @type {typeof DEFAULT}
 */
export const DEFAULT: unique symbol = Symbol("default-index");

/** The full facet type details. */
export type FacetDef<F extends object = any> = {
    ctor: Class<F>,
    indexName: FacetIdType | typeof DEFAULT,
    queryName: string,
    operation: FacetQueryOperation,
    path?: string,
    pathGenerator?: PathGenerator
    // lsi?: FacetIdDef,
};

/**
 * Defines a Facet query on this entity.
 *
 * Facets provide an alternative way of accessing an item.
 * They will use a DynamoDB query on an LSI index defined on the table.
 *
 * @param index
 * @param queryName
 * @param operation
 * @param path
 * @param pathGenerator
 */
export function Facet(index: FacetIdType | typeof DEFAULT, queryName: string, operation: FacetQueryOperation): (ctor: Class) => void;
export function Facet(index: FacetIdType | typeof DEFAULT, queryName: string, operation: FacetQueryOperation, path: string, pathGenerator?: PathGenerator): (ctor: Class) => void;
export function Facet(index: FacetIdType | typeof DEFAULT, queryName: string, operation: FacetQueryOperation, path?: string, pathGenerator?: PathGenerator): (ctor: Class) => void {
    return (ctor) => {

        const facetType: FacetDef = {
            ctor: ctor,
            indexName: index,
            queryName: queryName,
            operation: operation,
            path: path,
            pathGenerator: pathGenerator,
        }

        if (index !== DEFAULT) {
            const ids = FACET_IDS.get(ctor) || [];

            let proto = Object.getPrototypeOf(ctor);
            while (proto) {
                ids.push(...(FACET_IDS.get(proto) || []));
                proto = Object.getPrototypeOf(proto);
            }

            // facetType.lsi = single(ids.filter(elt => elt.facetIdType === index),
            //     `Illegal SK Id Column configuration.`, true);
        }

        if (FACET_DEF.has(ctor)) {
            FACET_DEF.get(ctor)!.push(facetType);
        } else {
            FACET_DEF.set(ctor, [facetType]);
        }
    }
}