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
import {Class} from "../../util";
import {def, one, single, unique} from "../../util/Req";
import {KeyPath} from "../../util/KeyPath";

/** The entity annotation definition. */
export type EntityDef<E extends object = {}> = {
    ctor: Class<E>,
    name: string,
    options: {
        exportTypeName: boolean,
        generateStats: boolean
    }
};

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
    readonly cbs: CallbackDef[],

    /** The (optional) custom toJSON() function defined for this entity type. */
    readonly toJSON?: PropertyDescriptor,

};

/**
 * Additional options for the @Entity configuration.
 */
export type EntityOptions = {

    /**
     * If TRUE then the entity type name will be exported in the toJSON() method. Defaults to TRUE.
     */
    exportTypeName?: boolean,

    /**
     * (Experimental) If TRUE then a "stats" record will be updated in the database. A stats record keeps track of the
     * number of items each query has. The DynamoDB stream for stats will also need to be enabled for this feature.
     *
     * Defaults to TRUE.
     */
    generateStats?: boolean,
}

/**
 * Registers this class as a DynamoDB Entity. Entities can be saved and retrieved from the DB.
 *
 * @param typeName The type name of this entity. This is needed to match the DB row with its correct entity.
 * @param keyPath  The key paths that will be compiled/parsed into/from their resp. Id columns.
 * @param options  Additional options.
 *
 * @throws Error if the given type name is already registered.
 */
export function Entity<E extends object>(typeName: string, keyPath ?: KeyPath, options?: EntityOptions): (ctor: Class<E>) => void {
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

        const entityDef: EntityDef = {
            ctor: ctor,
            name: typeName,
            options: {
                generateStats: def(options?.generateStats, true),
                exportTypeName: def(options?.exportTypeName, true),
            }
        };

        const entityType: EntityType = {
            def: entityDef,
            cols: unique(cols, col => col.name, true, `Duplicate column names not allowed.`),
            keyPath: keyPath,
            pk: single(ids.filter(elt => elt.idType === "PK"), `Missing required PK Id Column.`),
            sk: one(ids.filter(elt => elt.idType === "SK"), `Illegal SK Id Column configuration.`),
            // embedded: e,
            cbs: cb.reverse(),
            toJSON: tj,
        };

        ENTITY_DEF.set(ctor, entityType);
        ENTITY_REPO.set(typeName, entityType);
    }
}

