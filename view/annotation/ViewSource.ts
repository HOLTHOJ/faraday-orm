/**
 * Copyright (C) 2020  Jeroen Holthof <https://github.com/HOLTHOJ/faraday-orm>
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301 USA
 */

import {EntityDef} from "../../entity/index";
import {Class} from "../../util/index";
import {KeyPath} from "../../util/KeyPath";
import {ENTITY_DEF} from "../../annotation/Entity";
import {req} from "../../util/Req";

/**
 * The query definition.
 */
export type ViewSourceDef<T extends object = any> = {
    propName: string,
    entityType: EntityDef<T>,
    keyPath: KeyPath,
    // cond?: (elt: T) => boolean,
};

/**
 * All query configurations per class.
 */
export const VIEW_SOURCE_DEF = new Map<Function, ViewSourceDef[]>();

/**
 * A ViewSource configuration is necessary when defining a composite view.
 *
 * This is a view that can return different entity types with one single query. This is very common in database designs
 * that only use 1 single table to store all entity types.
 *
 * If the database schema is defined to INCLUDE_ALL attributes in the View GSI, then a ViewSource is required to
 * map the attributes to the view. This is because we implicitly assume that this is a composite view.
 *
 * If the view GSI index only projects KEYS_ONLY or a list of custom attributes, then the View does not need a
 * ViewSource and all attributes are loaded directly onto the View using the @Column annotations.
 *
 * @param entityCtor The entity type that needs to be included in this view.
 * @param keyPath If this entity type is updated, then this keypath will be compiled to store as the view GSI keys,
 *                so that this entity type is queryable using this view.
 // * @param cond
 *
 * @return The annotation function can return a boolean.
 *         If it returns FALSE then this source cannot be loaded in this view.
 */
export function ViewSource<S extends object>(entityCtor: Class<S>, keyPath: KeyPath/*, cond?: (elt: S) => boolean*/) {
    return (target: any, propertyKey: string) => {

        // Lookup entityType; type needs to be loaded first.
        const entityType = req(ENTITY_DEF.get(entityCtor)) as EntityDef<S>;

        const viewEntityDef: ViewSourceDef<S> = {
            propName: propertyKey,
            entityType: entityType,
            keyPath: keyPath,
            // cond: cond,
        };

        if (VIEW_SOURCE_DEF.has(target.constructor)) {
            VIEW_SOURCE_DEF.get(target.constructor)!.push(viewEntityDef);
        } else {
            VIEW_SOURCE_DEF.set(target.constructor, [viewEntityDef]);
        }

    }
}