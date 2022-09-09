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

import {def, one, req, single, unique} from "../../util/Req";
import {ENTITY_DEF, EntityDef} from "../../annotation/Entity";
import {ENTITY_COLS} from "../../annotation/Column";
import {ENTITY_IDS, IdColumnDef} from "../../annotation/Id";
import {ENTITY_INTERNAL} from "../../annotation/Internal";
import {ENTITY_CALLBACKS} from "../../annotation/Callback";
import {TableDef} from "../TableConfig";
import {ENTITY_EXPOSED} from "../../annotation/Exposed";
import {EntityType} from "./EntityType";
import {loadFacetTypes} from "./FacetTypeLoader";
import {ENTITY_KEY} from "../../annotation/EntityKey";
import {ObjectProperty} from "../../util/property/ObjectProperty";
import {IdColumnProperty} from "../../util/property/IdColumnProperty";
import {EntityColumnProperty} from "../../util/property/EntityColumnProperty";

/**
 * Loads all the entity types defined in the given table definition.
 *
 * @param tableDef
 */
export function loadEntityTypes(tableDef: TableDef): Map<string, EntityType> {
    return tableDef.entities.reduce((map, elt) => {
        const entityDef = req(ENTITY_DEF.get(elt), `Could not find entity definition for '${elt}'.`);

        if (map.has(entityDef.name))
            throw new Error(`Duplicate entity type ${entityDef.name}.`);

        const entityType = loadEntityType(entityDef, tableDef);
        const facetTypes = loadFacetTypes(entityType, tableDef);

        // Enhance classes with ToJSON override (need to do this after loading facets).
        entityDef.ctor.prototype.toJSON = function (key ?: string) {
            const json = {} as any

            // TODO : This can only control the exposure of properties on the entity itself.
            //        Referenced objects are exposed by the default stringify rules.
            entityType.exposed.forEach(elt => {
                // if (elt.exposed) {
                    // @ts-ignore
                    json[elt.def.propName] = this[elt.def.propName]
                // }
            })

            if (entityDef.options.exportTypeName) {
                json["_type"] = entityDef.name;
            }

            return json;
        }

        return map.set(entityDef.name, {...entityType, facets: facetTypes});
    }, new Map<string, EntityType>())
}

/**
 * Loads a given entity definition for a given table definition.
 *
 * @param entityDef
 * @param tableDef
 */
export function loadEntityType<E extends object>(entityDef: EntityDef, tableDef: TableDef): EntityType {
    const ctor = entityDef.ctor;

    const cols = ENTITY_COLS.get(ctor)?.slice() || [];
    const ids = ENTITY_IDS.get(ctor)?.slice() || [];
    const int = ENTITY_INTERNAL.get(ctor)?.slice() || [];
    const ex = ENTITY_EXPOSED.get(ctor)?.slice() || [];
    // const e = EMBEDDED_COLS.get(ctor)?.slice() || [];
    const cb = ENTITY_CALLBACKS.get(ctor)?.slice() || [];
    let key = ENTITY_KEY.get(ctor);

    // Collect all entity annotations in the constructor hierarchy.
    let proto = Object.getPrototypeOf(ctor);
    while (proto) {
        cols.push(...(ENTITY_COLS.get(proto) || []));
        ids.push(...(ENTITY_IDS.get(proto) || []));
        int.push(...(ENTITY_INTERNAL.get(proto) || []));
        ex.push(...(ENTITY_EXPOSED.get(proto) || []));
        // e.push(...(EMBEDDED_COLS.get(proto) || []));
        cb.push(...(ENTITY_CALLBACKS.get(proto) || []));
        key = def(key, ENTITY_KEY.get(proto));
        proto = Object.getPrototypeOf(proto);
    }

    const pkId = single(ids.filter(elt => elt.idType === "PK"), `Missing required PK Id Column.`);
    const pk: IdColumnDef = {...pkId, colName: req(tableDef.ids["PK"]), internal: false, required: true};

    const skId = one(ids.filter(elt => elt.idType === "SK"), `Illegal SK Id Column configuration.`);
    const sk: IdColumnDef | undefined = skId && {
        ...skId,
        colName: req(tableDef.ids["SK"]),
        internal: false,
        required: true
    };

    if (entityDef.options.exportKeys) ex.push({propName: pkId.propName, exposed: true})
    if (entityDef.options.exportKeys && skId) ex.push({propName: skId.propName, exposed: true})

    unique(cols, col => col.colName, true, (key) => `Duplicate column name ${key} not allowed. All columns: ${cols.map(elt => elt.propName + "-" + elt.colName)}.`)
        .forEach(col => {
            // Set the internal flag
            col.internal = int.findIndex(elt => elt.propName === col.propName) >= 0

            // Mark all columns that are not explicitly annotated as exposed by default
            if (ex.findIndex(elt => elt.propName === col.propName) < 0) {
                ex.push({propName: col.propName, exposed: true})
            }
        })

    // Enhance classes with ToJSON override.
    // ctor.prototype.toJSON = function (key ?: string) {
    //     const json = {} as any
    //
    //     // TODO : This can only control the exposure of properties on the entity itself.
    //     //        Referenced objects are exposed by the default stringify rules.
    //     ex.forEach(elt => {
    //         if (elt.exposed) {
    //             // @ts-ignore
    //             json[elt.propName] = this[elt.propName]
    //         }
    //     })
    //
    //     if (entityDef.options.exportTypeName) {
    //         json["_type"] = entityDef.name;
    //     }
    //
    //     return json;
    // }

    return {
        def: entityDef,
        cols: cols.map(elt => new EntityColumnProperty(elt)),
        exposed: ex.filter(elt => elt.exposed).map(elt => new ObjectProperty(elt)),
        cbs: cb.map(elt => new ObjectProperty(elt)),
        key: {
            pk: new IdColumnProperty(pk),
            sk: sk && new IdColumnProperty(sk),
            keyPath: key?.keyPath || entityDef.keyPath,
            def: key || {ctor: entityDef.ctor, keyPath: entityDef.keyPath}
        },
    };
}
