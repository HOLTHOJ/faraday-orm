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

import {unique} from "../util/Req";
import {Converter} from "../converter";

/**
 * The type of id column.
 * At the moment only 8 LSI indexes are allowed by AWS.
 * We added the string type to the list as well to be future-compatible.
 */
export type FacetIdType = "LSI1" | "LSI2" | "LSI3" | "LSI4" | "LSI5" | "LSI6" | "LSI7" | "LSI8" | string;

/** The column definition for this FacetId column. */
export type FacetIdDef = {
    propName: PropertyKey,
    facetIdType: FacetIdType,
    converter?: Converter<any>,
};

/** @internal Repository of all ids and the constructor function on which they are defined. */
export const FACET_IDS = new Map<Function, FacetIdDef[]>();

/**
 * Defines the SK ID column for a Facet (LSI) index.
 *
 * @param idType Which LSI Facet this id is used for.
 */
export function FacetId(idType: FacetIdType, converter?: Converter<any>) {
    return (target: any, propertyKey: PropertyKey) => {

        const facetIdDef: FacetIdDef = {
            propName: propertyKey,
            facetIdType: idType,
            converter: converter,
        };

        if (FACET_IDS.has(target.constructor)) {
            const facetIds = FACET_IDS.get(target.constructor)!.concat(facetIdDef);
            unique(facetIds, elt => elt.facetIdType, true);

            FACET_IDS.set(target.constructor, facetIds);
        } else {
            FACET_IDS.set(target.constructor, [facetIdDef]);
        }
    }
}