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

import {PathGenerator} from "../../util/KeyPath";
import {FacetType} from "../annotation/Facet";
import {EntityType, IdColumnDef} from "../../entity";

/** A facet instance. */
export type FacetProxy<F extends object = any> = F & FacetProxyMethods<F>;

/** */
export type FacetProxyMethods<F extends object = any> = {

    /**
     * The facet type used to compile the keys in this instance.
     *
     * @see compileKeys
     * @throws Error if no facet type has been loaded/compiled into this instance yet.
     */
    readonly facetType: FacetType<F>;

    /** The base entity type. */
    readonly entityType: EntityType<F>;

    getValue(propName: PropertyKey): any;

    setValue(propName: PropertyKey, value: any): void;

    /**
     * Parses the key properties using this Facet instance.
     *
     * @param defaultGenerator Default generator used when the @Facet definition contains no generator.
     * @param queryName The query name defined on the @Facet definition.
     */
    compileKeys(defaultGenerator: PathGenerator, queryName: FacetType): void;

    /**
     * Reads the Id properties and returns their column definition and value.
     *
     * @param block             Block to iterate over each Id.
     * @param validateRequired  If TRUE then the value will be first validated against the column definition. Default
     *     is TRUE.
     */
    forEachId(block: (id: IdColumnDef, value: any, valueIsSet: boolean) => void, validateRequired?: boolean): void;

}