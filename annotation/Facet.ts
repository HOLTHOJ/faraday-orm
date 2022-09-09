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
import {FacetIdType} from "./FacetId";
import {unique} from "../util/Req";

/** The facet query operation */
export type FacetQueryOperation = Extract<"EQ" | "LE" | "LT" | "GE" | "GT" | "BEGINS_WITH" | "BETWEEN", DynamoDB.ComparisonOperator>;

/** @internal Repository of all facets and the constructor function on which they are defined. */
export const FACET_DEF = new Map<Function, FacetDef[]>();

/** The default facet. This will query the table's PK & SK without an index. */
export const DEFAULT_FACET: unique symbol = Symbol("default-facet");

/** The full facet type details. */
export type FacetDef<F extends object = any> = {
    ctor: Class<F>,
    indexName: FacetIdType | typeof DEFAULT_FACET,
    queryName: string,
    operation: FacetQueryOperation,
    path?: string,
    pathGenerator?: PathGenerator,
};

/**
 * Defines a Facet query on this entity.
 *
 * Facets provide an alternative way of accessing an item.
 * They will execute a DynamoDB query on an LSI index defined on the entity's table.
 *
 * @param index         The LSI-index to use.
 * @param queryName     Unique query name needed to call this query in the EntityManager.
 * @param operation     The query operation used in construction the query.
 * @param path          The SK path to match against.
 * @param pathGenerator Optional path generator.
 */
export function Facet(index: FacetIdType | typeof DEFAULT_FACET, queryName: string, operation: FacetQueryOperation): (ctor: Class) => void;
export function Facet(index: FacetIdType | typeof DEFAULT_FACET, queryName: string, operation: FacetQueryOperation, path: string, pathGenerator?: PathGenerator): (ctor: Class) => void;
export function Facet(index: FacetIdType | typeof DEFAULT_FACET, queryName: string, operation: FacetQueryOperation, path?: string, pathGenerator?: PathGenerator): (ctor: Class) => void {
    return (ctor) => {

        const facetType: FacetDef = {
            ctor: ctor,
            indexName: index,
            queryName: queryName,
            operation: operation,
            path: path,
            pathGenerator: pathGenerator,
        }

        if (FACET_DEF.has(ctor)) {
            const callbacks = FACET_DEF.get(ctor)!.concat(facetType);
            unique(callbacks, elt => elt.indexName.toString() + "/" + elt.queryName, true);

            FACET_DEF.set(ctor, callbacks);
        } else {
            FACET_DEF.set(ctor, [facetType]);
        }
    }
}