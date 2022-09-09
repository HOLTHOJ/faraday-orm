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

import {FACET_IDS} from "../../annotation/FacetId";
import {def, none, req, unique} from "../../util/Req";
import {DEFAULT_FACET, FACET_DEF, FacetDef} from "../../annotation/Facet";
import {TableDef} from "../TableConfig";
import {ENTITY_DEF} from "../../annotation/Entity";
import {FacetType} from "./FacetType";
import {EntityType} from "./EntityType";
import {IdColumnProperty} from "../../util/property/IdColumnProperty";
import {NumberConverter, StringConverter} from "../../converter";
import {ColumnDef} from "../../annotation/Column";
import {EntityColumnProperty} from "../../util/property/EntityColumnProperty";
import {ObjectProperty} from "../../util/property/ObjectProperty";

/**
 * Loads all Facet types for the entities defined in the given table definition.
 *
 * @param tableDef
 */
export function loadFacetDefs(tableDef: TableDef): Map<string, FacetType[]> {
    return tableDef.entities.reduce((map, elt) => {
        const facetDefs = req(FACET_DEF.get(elt));
        const entityDef = req(ENTITY_DEF.get(elt));

        const facetTypes = def(map.get(entityDef.name), [])
        // .concat(facetDefs.map(facetDef => loadFacet(entityDef, facetDef, tableDef, elt)));

        return map.set(entityDef.name, facetTypes);
    }, new Map<string, FacetType[]>())
}

export function loadFacetTypes<E extends object>(entityType: EntityType, tableDef: TableDef): FacetType[] {
    const ctor = entityType.def.ctor;

    const ids = FACET_IDS.get(ctor)?.slice() || [];

    let proto = Object.getPrototypeOf(ctor);
    while (proto) {
        ids.push(...(FACET_IDS.get(proto) || []));
        proto = Object.getPrototypeOf(proto);
    }

    const facetIds = unique(ids, id => id.facetIdType, true,
        (key) => `Duplicate @FacetId annotations found for facet type ${key}.`);

    const facetIdMap = facetIds.reduce(((facetMap, facetId) => {
        const {column, type, index} = req(tableDef.facets[facetId.facetIdType],
            `Could not find facet table configuration for ${facetId.facetIdType}.`);

        const facetColumnDef: ColumnDef<string | number> = {
            propName: facetId.propName.toString(),
            colName: column,
            internal: false,
            required: false,
            converter: (type == "number") ? NumberConverter : StringConverter
        };

        if (facetMap.has(index)) {
            throw new Error(`Duplicate Facet index name found: ${index}.`);
        }

        return facetMap.set(index, facetColumnDef);
    }), new Map<string, ColumnDef<string | number>>());

    // Add all facet ids as columns
    for (let facetId of facetIdMap.values()) {
        none(entityType.cols.filter(elt => elt.def.colName === facetId.colName),
            `Facet IDs are implicit columns and should not be explicitly annotated with @Column.`);

        entityType.cols.push(new EntityColumnProperty<any, any>(facetId));
        entityType.exposed.push(new ObjectProperty<any, any>(facetId));
    }

    // Add all facet query definitions.
    return def(FACET_DEF.get(ctor)?.map(elt => loadFacet(entityType, tableDef, elt, facetIdMap)), []);
}

export function loadFacet<E extends object>(entityType: EntityType, tableDef: TableDef, facetDef: FacetDef, facetIdMap: Map<string, ColumnDef<string | number>>): FacetType {
    if (facetDef.indexName === DEFAULT_FACET) return {
        def: facetDef,
        lsi: entityType.key.sk,
    };

    const {index} = req(tableDef.facets[facetDef.indexName],
        `Could not find facet table configuration for ${facetDef.indexName}.`);
    const facetColumnDef = req(facetIdMap.get(index));

    return {
        def: facetDef,
        lsi: new IdColumnProperty({idType: "SK", ...req(facetColumnDef)}),
        indexName: index
    };
}
