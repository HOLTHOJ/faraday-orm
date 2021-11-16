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
import {ViewColumnDef, ViewIdColumnDef, ViewIndexType, ViewProjectedType, ViewQueryDef, ViewSourceDef} from "../view";

/** A view definition which configures an object into a View. */
export type ViewType<V extends object = any> = {

    /** The class that this view is defined on. */
    readonly ctor: Class<V>,

    /** The index name of this view. */
    readonly indexName: string,

    /**
     * The DynamoDB index projected attribute type of this view.
     * Can be undefined if no index needs to be used (indexType = default).
     */
    readonly indexProjections: ViewProjectedType,

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

    /** */
    readonly queries: ViewQueryDef[],

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