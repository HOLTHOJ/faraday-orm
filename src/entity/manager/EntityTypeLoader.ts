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


import {Class} from "../../util";
import {one, req, single, unique} from "../../util/Req";
import {ENTITY_DEF, EntityDef, EntityType} from "../annotation/Entity";
import {ENTITY_COLS} from "../annotation/Column";
import {ENTITY_IDS} from "../annotation/Id";
import {ENTITY_INTERNAL} from "../annotation/Internal";
import {ENTITY_CALLBACKS} from "../annotation/Callback";
import {TableDef} from "./TableConfig";
import {ENTITY_EXPOSED} from "../annotation/Exposed";

export function loadEntityDefs(tableDef: TableDef): Map<string, EntityType> {
    return tableDef.entities.reduce((map, elt) => {
        const entityDef = req(ENTITY_DEF.get(elt));

        if (map.has(entityDef.name))
            throw new Error(`Duplicate entity type ${entityDef.name}.`);

        return map.set(entityDef.name, loadEntity(entityDef, tableDef, elt));
    }, new Map<string, EntityType>())
}

export function loadEntity<E extends object>(entityDef: EntityDef, tableDef: TableDef, ctor: Class<E>): EntityType {
    // let tj = Object.getOwnPropertyDescriptor(ctor.prototype, "toJSON");
    // let instanceProto = Object.getPrototypeOf(ctor.prototype);
    // while (typeof tj === "undefined" && instanceProto) {
    //     tj = Object.getOwnPropertyDescriptor(instanceProto, "toJSON");
    //     instanceProto = Object.getPrototypeOf(instanceProto);
    // }

    const cols = ENTITY_COLS.get(ctor) || [];
    const ids = ENTITY_IDS.get(ctor) || [];
    const int = ENTITY_INTERNAL.get(ctor) || [];
    const ex = ENTITY_EXPOSED.get(ctor) || [];
    // const e = EMBEDDED_COLS.get(ctor) || [];
    const cb = ENTITY_CALLBACKS.get(ctor) || [];

    // Collect all entity annotations in the constructor hierarchy.
    let proto = Object.getPrototypeOf(ctor);
    while (proto) {
        cols.push(...(ENTITY_COLS.get(proto) || []));
        ids.push(...(ENTITY_IDS.get(proto) || []));
        int.push(...(ENTITY_INTERNAL.get(proto) || []));
        ex.push(...(ENTITY_EXPOSED.get(proto) || []));
        // e.push(...(EMBEDDED_COLS.get(proto) || []));
        cb.push(...(ENTITY_CALLBACKS.get(proto) || []));
        proto = Object.getPrototypeOf(proto);
    }

    const pkId = single(ids.filter(elt => elt.idType === "PK"), `Missing required PK Id Column.`);
    ex.push({propName: pkId.propName, exposed: true})

    const skId = one(ids.filter(elt => elt.idType === "SK"), `Illegal SK Id Column configuration.`);
    if (skId) ex.push({propName: skId.propName, exposed: true})

    const entityCols = unique(cols, col => col.name, true, `Duplicate column names not allowed.`);
    entityCols.forEach(col => {
        // Set the internal flag
        col.internal = int.findIndex(elt => elt.propName === col.propName) >= 0

        // Default to exposed
        if (ex.findIndex(elt => elt.propName === col.propName) < 0)
            ex.push({propName: col.propName, exposed: true})
    })

    return {
        def: entityDef,
        cols: entityCols,
        exposed: ex,
        keyPath: entityDef.keyPath,
        pk: {...pkId, name: tableDef.ids["PK"], exposed: true, internal: false, required: true},
        sk: skId && {...skId, name: tableDef.ids["SK"], exposed: true, internal: false, required: true},
        // embedded: e,
        cbs: cb.reverse(),
        // toJSON: tj,
    };
}