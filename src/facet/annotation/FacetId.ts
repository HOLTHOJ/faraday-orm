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

/** The column definition for this Id column. */
export type FacetIdDef = {
    propName: PropertyKey,
    facetName: string,
    indexName: string,
};

/** @internal Repository of all ids and the constructor function on which they are defined. */
export const FACET_IDS = new Map<Function, FacetIdDef[]>();

/**
 * Defines an ID column in the DB row.
 *
 * @param facetName
 * @param indexName
 */
export function FacetId(facetName: string, indexName: string) {
    return (target: any, propertyKey: PropertyKey) => {

        const facetIdDef: FacetIdDef = {
            propName: propertyKey,
            facetName: facetName,
            indexName: indexName,
        };

        if (FACET_IDS.has(target.constructor)) {
            FACET_IDS.get(target.constructor)!.push(facetIdDef);
        } else {
            FACET_IDS.set(target.constructor, [facetIdDef]);
        }
    }
}