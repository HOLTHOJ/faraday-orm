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

import {ViewColumnDef, ViewIdColumnDef, ViewQueryDef, ViewSourceDef, ViewType} from "../index";
import {PathGenerator} from "../../util/KeyPath";
import {EntityDef} from "../../entity/index";

/** A view instance. */
export type ViewProxy<V extends object = any> = V & ViewProxyMethods<V>;

/** */
export type ViewProxyMethods<V extends object = any> = {

    /** The view type used to create this instance. */
    readonly viewType: ViewType<V>;

    getValue(propName: PropertyKey): any;

    setValue(propName: PropertyKey, value: any): void;

    /**
     * Checks if this View contains a @ViewSource for the given entity.
     * If a @ViewSource configuration is found then the configured condition is evaluated and the result returned.
     *
     * @param entity
     * @return TRUE if a @ViewSource is found and the condition evaluates to TRUE.
     */
    // canLoadSource<E extends object>(entity: E): boolean;

    /**
     * Loads an entity instance into this view.
     *  - This will call the @ViewSource function defined on this view.
     *  - This will also evaluate the @ViewSource condition before loading the entity. If the condition is false,
     *    then this function will do nothing.
     *  - This will also parse and populate the SK ID column.
     *
     * @param source
     * @param entity The entity instance to load.
     * @param parseSk If TRUE the SK path will be generated. Can be turned of to avoid parsing errors. Default is TRUE.
     *
     * @see compileKeys
     *
     * @return TRUE if the source was loaded. FALSE if the source condition was not met.
     * @throws Error If no @ViewSource definition could be found for the given entity's type.
     */
    loadSource<E extends object>(source: ViewSourceDef<E>, entity: E): boolean;
    loadSource<E extends object>(source: ViewSourceDef<E>, entity: E, parseSk: false): boolean;
    loadSource<E extends object>(source: ViewSourceDef<E>, entity: E, parseSk: true, defaultGenerator: PathGenerator): boolean;

    /**
     * Gets the View query from the configured View type for the given query name.
     *
     * @param {string} queryName
     */
    getViewQuery(queryName: string): ViewQueryDef

    /**
     *
     * @return {ViewSourceDef<E>}
     * @param entityType
     */
    getViewSource<E extends object>(entityType: EntityDef<E>): ViewSourceDef<E> | undefined

    /**
     * Parses the given key paths using this View instance and populates their resp. properties.
     */
    compileKeys(defaultGenerator: PathGenerator, query: ViewQueryDef): void;

    /**
     * Reads the Id properties and returns their column definition and value.
     *
     * @param block             Block to iterate over each Id.
     * @param validateRequired  If TRUE then the value will be first validated against the column definition. Default
     *     is TRUE.
     */
    forEachId(block: (id: ViewIdColumnDef, value: any, valueIsSet: boolean) => void, validateRequired?: boolean): void;

    /**
     *
     * @param block
     * @param validateRequired
     */
    forEachColumn(block: (col: ViewColumnDef, value: any, valueIsSet: boolean) => void, validateRequired?: boolean): void

    /**
     * Returns the object to stringify. The result depends on the ViewProjectedType setting.
     *  - If KEYS_ONLY, it will return an object only containing the ids.
     *  - If PROJECTED_ALL or CUSTOM, it will return an object containing all the @ViewColumn properties.
     */
    toJSON(): object;

}