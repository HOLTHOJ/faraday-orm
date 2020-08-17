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

import {VIEW_IDS, ViewIdColumnDef} from "./ViewId";
import {VIEW_SOURCE_DEF, ViewSourceDef} from "./ViewSource";
import {VIEW_COLUMN_DEFS, ViewColumnDef} from "./ViewColumn";
import {one, single} from "../../util/Req";
import {EntityManager, EntityType} from "../../entity";
import {Class} from "../../util/Class";
import {ViewCallback} from "../manager/ViewCallback";

/**
 * The index type as defined on the DynamoDB table index.
 * The value "default" stands for the table itself (no index).
 */
export type ViewIndexType = "default" | "LSI" | "GSI";

/** The projected attributes setting as defined on the DynamoDB table index. */
export type ViewProjectedType = "PROJECTED_ALL" | "KEYS_ONLY" | "CUSTOM" ;

/** The view definitions for each class. */
export const VIEW_DEF = new Map<Function, ViewType>();

/** A reverse mapping from the View Source entity type to their owning View Type. */
export const VIEW_SOURCE_ENTITIES = new Map<EntityType, ViewType[]>();

/** A view definition which configures an object into a View. */
export type ViewType<V extends object = object> = {

    /** The class that this view is defined on. */
    readonly ctor: Class<V>,

    /** The DynamoDB index type of this view. */
    readonly indexType: ViewIndexType,

    /**
     * The index name of this view.
     * Can be undefined if no index needs to be used (indexType = default).
     */
    readonly indexName?: string,

    /**
     * The DynamoDB index projected attribute type of this view.
     * Can be undefined if no index needs to be used (indexType = default).
     */
    readonly indexProjections?: ViewProjectedType,

    /**
     * The @ViewSource definitions of this view.
     * Sources are entities that share the same index fields and queries.
     */
    readonly sources: ViewSourceDef[],

    /**
     * The @ViewColumn definitions of this view.
     * These are the columns that will be exposed.
     */
    readonly columns: ViewColumnDef[],

    /**
     * The PK column definition of this view.
     * This is the column that is annotated with @ViewId("PK").
     * If the index is an LSI then the PK columns of all view sources need to match this PK.
     */
    readonly pk: ViewIdColumnDef,

    /**
     * The (optional) SK column definition of this view.
     * This is the column that is annotated with @ViewId("SK").
     * If the index is an LSI then the SK column is required.
     */
    readonly sk?: ViewIdColumnDef,

};


/**
 *
 * @param indexType
 * @param indexName
 * @param pk
 * @param projected The projected attributes definition of the index.
 * @constructor
 */
export function View(indexType: "default"): (ctor: { new(): any }) => any;
export function View(indexType: ViewIndexType, indexName: string, projected?: ViewProjectedType): (ctor: { new(): any }) => any;
export function View(indexType: ViewIndexType, indexName?: string, projected: ViewProjectedType = "PROJECTED_ALL") {
    return (ctor: { new(...args: any[]): {} }) => {
        const i = VIEW_IDS.get(ctor) || [];
        const s = VIEW_SOURCE_DEF.get(ctor) || [];
        const c = VIEW_COLUMN_DEFS.get(ctor) || [];

        let proto = Object.getPrototypeOf(ctor);
        while (proto) {
            i.push(...(VIEW_IDS.get(proto) || []));
            s.push(...(VIEW_SOURCE_DEF.get(proto) || []));
            c.push(...(VIEW_COLUMN_DEFS.get(proto) || []));

            proto = Object.getPrototypeOf(proto);
        }

        const viewDef: ViewType = {
            ctor: ctor,
            indexType: indexType,
            indexProjections: projected,
            indexName: indexName,
            sources: s,
            columns: c,
            pk: single(i.filter(elt => elt.idType === "PK")),
            sk: one(i.filter(elt => elt.idType === "SK")),
        };

        if (VIEW_DEF.has(ctor)) {
            throw new Error(`Only one view configuration allowed per class.`);
        }

        // viewDef.ctor = createViewProxy(viewDef.ctor, viewDef);
        VIEW_DEF.set(ctor, viewDef);

        s.forEach(elt => {
            if (VIEW_SOURCE_ENTITIES.has(elt.entityType)) {
                VIEW_SOURCE_ENTITIES.get(elt.entityType)!.push(viewDef);
            } else {
                VIEW_SOURCE_ENTITIES.set(elt.entityType, [viewDef]);
            }
        })
    }
}

/**
 * Adds a callback to the EntityManager to populate the View index fields before committing the entity.
 * This needs to be executed once the View file is loaded (e.g. if a View class with annotation is used in the model).
 */
EntityManager.registerCallback(new ViewCallback());