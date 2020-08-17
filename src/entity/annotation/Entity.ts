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

import {ENTITY_IDS, IdColumnDef} from "./Id";
import {ColumnDef, ENTITY_COLS} from "./Column";
import {CallbackDef, ENTITY_CALLBACKS} from "./Callback";
import {Class} from "../../util/Class";
import {one, single} from "../../util/Req";
import {KeyPath} from "../../util/KeyPath";

/** The entity annotation definition. */
export type EntityDef<E extends object = any> = { ctor: Class<E>, name: string, generateStats: boolean };

/** @internal Repository of all entities and the constructor function on which they are defined. */
export const ENTITY_DEF = new Map<Function, EntityType>();

/** @internal Repository of all entities and the name under which they are defined. */
export const ENTITY_REPO = new Map<string, EntityType>();

/** The full entity type details. */
export type EntityType<E extends object = any> = {

    /** The entity class definition. */
    readonly def: EntityDef<E>,

    /** All the columns defined on this entity type. */
    readonly cols: ColumnDef[],

    /**
     * Contains a custom key path for this entity.
     * By default the Id values will be read from their resp @Id columns,
     * but if you want to use composite keys, you can specify the key paths here.
     */
    readonly keyPath?: KeyPath,

    /** The PK column defined on this entity. */
    readonly pk: IdColumnDef,

    /** The (optional) SK column defined on this entity. */
    readonly sk?: IdColumnDef,

    /** The callbacks defined on this entity. */
    readonly cback: CallbackDef[],

    /** The (optional) custom toJSON() function defined on this entity type. */
    readonly toJSON?: PropertyDescriptor,

};

/**
 * Registers this class as a DynamoDB Entity. Entities can be saved and retrieved from the DB.
 *
 * @param typeName      The type name of this entity. This is needed to match the DB row with its correct entity.
 * @param keyPath       The key paths that will be compiled/parsed into/from their resp. Id columns.
 * @param generateStats If TRUE stats will be generated for this entity (if the trigger is enabled). Default is TRUE.
 *
 * @throws Error if the given type name is already registered.
 */
export function Entity(typeName: string, keyPath ?: KeyPath, generateStats: boolean = true): (ctor: Class) => void {
    return (ctor) => {

        if (ENTITY_REPO.has(typeName)) throw new Error(`Duplicate entity type ${typeName}.`);

        const cols = ENTITY_COLS.get(ctor) || [];
        const ids = ENTITY_IDS.get(ctor) || [];
        // const e = EMBEDDED_COLS.get(ctor) || [];
        const cb = ENTITY_CALLBACKS.get(ctor) || [];
        let tj = Object.getOwnPropertyDescriptor(ctor.prototype, "toJSON");

        let instanceProto = Object.getPrototypeOf(ctor.prototype);
        while (typeof tj === "undefined" && instanceProto) {
            tj = Object.getOwnPropertyDescriptor(instanceProto, "toJSON");
            instanceProto = Object.getPrototypeOf(instanceProto);
        }

        let proto = Object.getPrototypeOf(ctor);
        while (proto) {
            cols.push(...(ENTITY_COLS.get(proto) || []));
            ids.push(...(ENTITY_IDS.get(proto) || []));
            // e.push(...(EMBEDDED_COLS.get(proto) || []));
            cb.push(...(ENTITY_CALLBACKS.get(proto) || []));

            proto = Object.getPrototypeOf(proto);
        }

        const entityDef: EntityDef = {ctor: ctor, name: typeName, generateStats: generateStats};
        const entityType: EntityType = {
            def: entityDef,
            cols: cols,
            keyPath: keyPath,
            pk: single(ids.filter(elt => elt.idType === "PK"), `Missing required PK Id Column.`),
            sk: one(ids.filter(elt => elt.idType === "SK"), `Illegal SK Id Column configuration.`),
            // embedded: e,
            cback: cb.reverse(),
            toJSON: tj,
        };

        ENTITY_DEF.set(ctor, entityType);
        ENTITY_REPO.set(typeName, entityType);
    }
}
