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

import {ViewIdColumnDef} from "./ViewId";
import {ViewSourceDef} from "./ViewSource";
import {ViewColumnDef} from "./ViewColumn";
import {Class} from "../../util";
import {TransactionManager} from "../../manager/TransactionManager";
import {EntityDef} from "../../entity";
import {ViewTransactionFactory} from "../manager/ViewCallback";
import {DynamoDB} from "aws-sdk";

/**
 * The index type as defined on the DynamoDB table index.
 * The value "default" stands for the table itself (no index).
 */
export type ViewIndexType = "default" | "LSI" | "GSI";

/** The projected attributes setting as defined on the DynamoDB table index. */
export type ViewProjectedType = DynamoDB.ProjectionType;

/** The view definitions for each class. */
export const VIEW_DEF = new Map<Function, ViewDef>();

/** A reverse mapping from the View Source entity type to their owning View Type. */
export const VIEW_SOURCE_ENTITIES = new Map<EntityDef, ViewType[]>();

export type ViewDef = {
    readonly name: string,
    readonly indexName: string,
}

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
 * Creates a View for the given index name.
 *
 * @param viewName
 * @param indexName The name of the index. Will be used when querying.
 */
export function View(viewName: string, indexName: string): (ctor: Class) => any;

/**
 * @internal Implementation of the two public overloaded methods.
 */
export function View(viewName: string, indexName: string) {
    return (ctor: { new(...args: any[]): {} }) => {

        if (VIEW_DEF.has(ctor)) throw new Error(`Only one view configuration allowed per class.`);

        const viewDef: ViewDef = {
            name: viewName,
            indexName: indexName,
        };

        // viewDef.ctor = createViewProxy(viewDef.ctor, viewDef);
        VIEW_DEF.set(ctor, viewDef);
    }
}

/**
 * Adds a callback to the TransactionManager to populate the View index fields before committing the entity.
 * This needs to be executed once the View file is loaded (e.g. if a View class with annotation is used in the model).
 */
TransactionManager.registerCallback(new ViewTransactionFactory());