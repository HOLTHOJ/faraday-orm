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

import {KeyPath} from "../../util/KeyPath";
import {EntityKeyDef} from "../../annotation/EntityKey";
import {IdColumnProperty} from "../../util/property/IdColumnProperty";

/** The full entity type details. */
export type EntityKey<E extends object = any> = {

    readonly def: EntityKeyDef<E>

    /** All the properties that will be exposed when calling JSON.stringify(). */
    // readonly exposed: ExposedDef[],

    /**
     * Contains a custom key path for this entity.
     * By default the Id values will be read from their resp @Id columns,
     * but if you want to use composite keys, you can specify the key paths here.
     */
    readonly keyPath?: KeyPath,

    /** The PK column defined on this entity. */
    readonly pk: IdColumnProperty<E>,

    /** The (optional) SK column defined on this entity. */
    readonly sk?: IdColumnProperty<E>,

};