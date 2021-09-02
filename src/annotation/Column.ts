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

import {Converter} from "../converter";

/**
 * The definition of a database column defined on an Entity class.
 */
export type ColumnDef<T = any> = {

    /** The property name. */
    propName: string,

    /** The DB column name. */
    name: string,

    /** The converter needed to convert to DynamoDB Attribute. */
    converter: Converter<T>,

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

/** @internal Repository of all columns and the constructor function on which they are defined. */
export const ENTITY_COLS = new Map<Function, ColumnDef[]>();

/**
 * Defines a column in the DB row.
 *
 * @param columnName        The name of the column in the database.
 * @param columnConverter   A converter to convert the value from/to their database attribute value.
 * @param required          Will validate the value of this column before storing it in the database.
 * @param defaultValue      Generates a default value in case no value is provided.
 */
export function Column<T>(columnName: string, columnConverter: Converter<T>, required ?: boolean, defaultValue ?: () => T) {
    return (target: object, propertyKey: string, descriptor ?: TypedPropertyDescriptor<T>) => {

        const columnDef: ColumnDef<T> = {
            propName: propertyKey,
            name: columnName,
            converter: columnConverter,
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