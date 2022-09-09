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
import {KeyPath} from "../util/KeyPath";

/** The entity annotation definition. */
export type EntityKeyDef<E extends object = {}> = {
    readonly ctor: Class<E>,
    readonly keyPath?: KeyPath,
};

/** @internal Repository of all entities and the constructor function on which they are defined. */
export const ENTITY_KEY = new Map<Function, EntityKeyDef>();

/**
 * Registers this class as a DynamoDB Entity. Entities can be saved and retrieved from the DB.
 *
 * @param typeName The type name of this entity. This is needed to match the DB row with its correct entity.
 * @param keyPath  The key paths that will be compiled/parsed into/from their resp. Id columns.
 * @param options  Additional options.
 *
 * @throws Error if the given type name is already registered.
 */
export function EntityKey<E extends object>(keyPath ?: KeyPath): (ctor: Class<E>) => void {
    return (ctor) => {
        if (ENTITY_KEY.has(ctor)) throw new Error(`Only one entity key configuration allowed per class.`);

        const entityDef: EntityKeyDef<E> = {
            ctor: ctor,
            keyPath: keyPath,
        };

        ENTITY_KEY.set(ctor, entityDef);
    }
}

