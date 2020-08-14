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

import {DBConverter} from "../../converter/DBConverter";

/** */
export type ColumnDescription<T = any> = { name: string, converter: DBConverter<T> }

/**
 * The definition of a database column defined on an Entity class.
 */
export type ColumnDef<T = any> = {

    /** The property name. */
    propName: string,

    /** The DB column name. */
    name: string,

    /** The converter needed to convert to DynamoDB Attribute. */
    converter: DBConverter<T>,

    /** Indicates this is a required column. */
    required: boolean,

    /**
     * Indicates this is an internal column and should only be updated
     * using callbacks or by defining a default value.
     */
    internal: boolean,

    /** The default value to use if the value is not set. */
    defaultValue?: () => T

};

/** */
export const ENTITY_COLS = new Map<Function, ColumnDef[]>();

/**
 * Defines a column in the DB row.
 * @param column
 * @param required
 * @param defaultValue
 */
export function Column<T>(column: ColumnDescription<T>, required ?: boolean, defaultValue ?: () => T) {
    return (target: object, propertyKey: string, descriptor ?: TypedPropertyDescriptor<T>) => {

        const columnDef: ColumnDef<T> = {
            propName: propertyKey,
            name: column.name,
            converter: column.converter,
            required: !!required,
            internal: false,
            defaultValue: defaultValue
        };

        if (ENTITY_COLS.has(target.constructor)) {
            ENTITY_COLS.get(target.constructor)!.push(columnDef);
        } else {
            ENTITY_COLS.set(target.constructor, [columnDef]);
        }
    }
}