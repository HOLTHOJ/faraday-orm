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

import {FACET_IDS} from "../annotation/FacetId";
import {def, req, single} from "../util/Req";
import {DEFAULT_FACET, FACET_DEF, FacetDef} from "../annotation/Facet";
import {TableDef} from "./TableConfig";
import {ENTITY_DEF, EntityDef} from "../annotation/Entity";
import {Class} from "../util";
import {FacetType} from "./FacetType";

export function loadFacetDefs(tableDef: TableDef): Map<string, FacetType[]> {
    return tableDef.entities.reduce((map, elt) => {
        const facetDefs = req(FACET_DEF.get(elt));
        const entityDef = req(ENTITY_DEF.get(elt));

        const facetTypes = def(map.get(entityDef.name), [])
            .concat(facetDefs.map(facetDef => loadFacet(entityDef, facetDef, tableDef, elt)));

        return map.set(entityDef.name, facetTypes);
    }, new Map<string, FacetType[]>())
}

export function loadFacet<E extends object>(entityDef: EntityDef, facetDef: FacetDef, tableDef: TableDef, ctor: Class<E>): FacetType {
    if (facetDef.indexName === DEFAULT_FACET) return {def: facetDef};

    const ids = FACET_IDS.get(ctor) || [];

    let proto = Object.getPrototypeOf(ctor);
    while (proto) {
        ids.push(...(FACET_IDS.get(proto) || []));
        proto = Object.getPrototypeOf(proto);
    }

    const lsi = single(ids.filter(elt => elt.facetIdType === facetDef.indexName),
        `Illegal SK Id Column configuration.`, true);

    const indexName = req(tableDef.facets[facetDef.indexName].index, "Invalid index name.")

    return {
        def: facetDef,
        lsi: lsi,
        indexName: indexName
    };
}
