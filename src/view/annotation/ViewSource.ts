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

import {parse} from "path-to-regexp";
import {EntityManager, EntityType} from "../../entity";
import {Class} from "../../util/Class";

/**
 * The query definition.
 */
export type ViewSourceDef<T extends object = any> = {
    propName: string,
    entityType: EntityType<T>,
    pkPath: string,
    skPath?: string,
    cond?: (elt: T) => boolean,
    variables: string[],
    // params: FacetParamDef[],
};

/**
 * All query configurations per class.
 */
export const VIEW_SOURCE_DEF = new Map<Function, ViewSourceDef[]>();

/**
 *
 * @param entityCtor The entity type that needs to be included in this view.
 * @param pk
 * @param sk The SK path used by the entity type in this view.
 * @param cond A conditions that decides if the entity type needs to be included in this view.
 *
 */
export function ViewSource<S extends object>(entityCtor: Class<S>, pk: string, sk?: string, cond?: (elt: S) => boolean) {
    return (target: any, propertyKey: string, propertyDescriptor: PropertyDescriptor) => {

        // Lookup entityType; type needs to be loaded first.
        const entityType = EntityManager.getEntityType2(entityCtor);
        if (typeof entityType === "undefined")
            throw new Error(`Invalid entity in ViewEntity definition.`);

        const skTokens = sk ? parse(sk) : [];
        const tokenNames = skTokens
            .map(elt => typeof elt === "string" ? elt : elt.name)
            .filter(elt => typeof elt === "string") as string[];

        const viewEntityDef: ViewSourceDef<S> = {
            propName: propertyKey,
            entityType: entityType,
            pkPath: pk,
            skPath: sk,
            cond: cond,
            variables: tokenNames,
        };

        if (VIEW_SOURCE_DEF.has(target.constructor)) {
            VIEW_SOURCE_DEF.get(target.constructor)!.push(viewEntityDef);
        } else {
            VIEW_SOURCE_DEF.set(target.constructor, [viewEntityDef]);
        }

    }
}