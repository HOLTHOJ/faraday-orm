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

import {EntityDef} from "../../annotation/Entity";
import {FacetType} from "./FacetType";
import {EntityKey} from "./EntityKey";
import {ObjectProperty} from "../../util/property/ObjectProperty";
import {EntityColumnProperty} from "../../util/property/EntityColumnProperty";

/** The full entity type details. */
export type EntityType<E extends object = any> = {

    /** The entity class definition. */
    readonly def: EntityDef<E>,

    /** The entity key definition. */
    readonly key: EntityKey,

    /** All the columns defined on this entity type. */
    readonly cols: EntityColumnProperty<E, any>[],

    /** All the properties that will be exposed when calling JSON.stringify(). */
    readonly exposed: ObjectProperty<E, any>[],

    // /**
    //  * Contains a custom key path for this entity.
    //  * By default the Id values will be read from their resp @Id columns,
    //  * but if you want to use composite keys, you can specify the key paths here.
    //  */
    // readonly keyPath?: KeyPath,
    //
    // /** The PK column defined on this entity. */
    // readonly pk: IdColumnDef,
    //
    // /** The (optional) SK column defined on this entity. */
    // readonly sk?: IdColumnDef,

    /** The callbacks defined on this entity. */
    readonly cbs: ObjectProperty<E, Function>[],

    /** The facets defined for this entity. */
    readonly facets?: FacetType[],

};