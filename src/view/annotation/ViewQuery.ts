/**
 * Copyright (C) 2020  Jeroen Holthof <https://github.com/HOLTHOJ/faraday-orm>
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301 USA
 */

import {DynamoDB} from "aws-sdk";
import {Class} from "../../util/Class";

/**
 * The query definition.
 */
export type ViewQueryDef<E extends object = any> = {
    ctor: Class<E>,
    name: string,
    pk: string,
    sk?: string,
    // params: FacetParamDef[],
    operation: ViewQueryOperation,
    // variables: string[],
};

/**
 *
 */
export type ViewQueryOperation = Extract<"EQ" | "BEGINS_WITH", DynamoDB.ComparisonOperator>;


/**
 * All query configurations per class.
 */
export const VIEW_QUERY_DEF = new Map<Function, ViewQueryDef[]>();

/**
 * Configures a query for the View it is defined on. A query consists of a PK and optional SK value.
 *
 * @param name      The name of the query. This name is used to lookup the correct query configuration on a view class.
 * @param pkPath    The path that will be evaluated and used as the PrimaryKey in the query.
 * @param skPath    The (optional) path that will be evaluated and used as the SortKey in the query.
 * @param op        The operator to use in the DynamoDB query. Only applies if an SK path is provided.
 * @constructor A no-arg constructor.
 */
export function ViewQuery(name: string, pkPath: string, skPath?: string, op ?: ViewQueryOperation) {
    return (ctor: { new(): {} }) => {

        if (typeof skPath !== "undefined" && typeof op === "undefined")
            throw new Error(`Operation is needed if the facet includes a SK.`);

        const facetDef: ViewQueryDef = {
            ctor: ctor,
            name: name,
            pk: pkPath,
            sk: skPath,
            operation: op || "EQ",
        };

        if (VIEW_QUERY_DEF.has(ctor)) {
            VIEW_QUERY_DEF.get(ctor)!.push(facetDef);
        } else {
            VIEW_QUERY_DEF.set(ctor, [facetDef]);
        }

    }
}
