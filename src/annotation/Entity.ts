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

import {Class} from "../util";
import {def} from "../util/Req";
import {KeyPath} from "../util/KeyPath";

/** The entity annotation definition. */
export type EntityDef<E extends object = {}> = {
    readonly ctor: Class<E>,
    readonly keyPath?: KeyPath,
    readonly name: string,
    readonly options: {
        readonly exportTypeName: boolean,
        readonly generateStats: boolean
    }
};

/** @internal Repository of all entities and the constructor function on which they are defined. */
export const ENTITY_DEF = new Map<Function, EntityDef>();

/** @internal Repository of all entities and the name under which they are defined. */
export const ENTITY_REPO = new Map<string, EntityDef>();

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
        if (ENTITY_DEF.has(ctor)) throw new Error(`Only one entity configuration allowed per class.`);
        if (ENTITY_REPO.has(typeName)) throw new Error(`Only one entity configuration allowed per type name.`);

        const entityDef: EntityDef = {
            ctor: ctor,
            name: typeName,
            keyPath: keyPath,
            options: {
                generateStats: def(options?.generateStats, true),
                exportTypeName: def(options?.exportTypeName, true),
            }
        };

        ENTITY_DEF.set(ctor, entityDef);
        ENTITY_REPO.set(typeName, entityDef);
    }
}

