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

import {CallbackOperation, ColumnDef, EntityType, IdDef} from "..";
import {PathGenerator} from "../../util/KeyPath";
import {FacetType} from "../../facet/annotation/Facet";
import {SessionConfig} from "./SessionManager";
import {IdColumnDef} from "../annotation/Id";

/** A managed entity. */
export type EntityProxy<E extends object = any> = E & EntityProxyMethods<E>;

/** Methods that are added to a model class when it is managed. */
export interface EntityProxyMethods<E extends object = any> {

    /** The entity type configuration. */
    readonly entityType: EntityType<E>;

    getValue(propName: PropertyKey): any;

    setValue(propName: PropertyKey, value: any): void;

    /**
     * Returns the facet defined on this entity for the given query name.
     *
     * @param {string} queryName
     * @throws Error if the query name is not unique on this entity.
     * @return {Readonly<FacetType> | undefined}
     */
    getFacet(queryName: string): Readonly<FacetType> | undefined

    /**
     * Compiles the key paths using this Entity instance and populates their resp. properties.
     *
     * @param defaultPathGenerator  This Path generator will be used if the entity definition
     *                              did not define a Path generator itself.
     */
    compileKeys(defaultPathGenerator: PathGenerator): void

    /**
     * Parses the key paths using this Entity instance and populates their resp. properties.
     *
     * @param defaultPathGenerator  This Path generator will be used if the entity definition
     *                              did not define a Path generator itself.
     */
    parseKeys(defaultPathGenerator: PathGenerator): void;

    /**
     * Loops over each Id defined on this entity.
     *
     * @param block             Block to execute for each Id.
     * @param validateRequired  If TRUE then each Id column will be validated that it contains a value.
     */
    forEachId(block: (id: IdColumnDef, value: any, valueIsSet: boolean) => void, validateRequired?: boolean): void;

    /**
     * Loops over each Column defined on this entity (including @Internal columns).
     *
     * @param block             Block to execute for each Id.
     * @param validateRequired  If TRUE then each required column will be validated that it contains a value.
     */
    forEachCol(block: (col: ColumnDef, value: any | undefined, valueIsSet: boolean) => void | boolean, validateRequired?: boolean): void;

    /**
     * Executes all the entity's callback functions in reverse order.
     * This means that the callback function of the most parent class will be called first.
     *
     * @param operation
     * @param config
     */
    executeCallbacks(operation: CallbackOperation, config: SessionConfig): void;

    /**
     * Handles the stringify functionality for this entity.
     * This will delegate to the toJSON method on the model class, if it exists.
     */
    toJSON(): object;
}
