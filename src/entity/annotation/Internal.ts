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

import {ColumnDef, ENTITY_COLS} from "./Column";
import {Converter} from "../../converter/Converter";

/**
 * Configures a column to be an internal column. Internal columns cannot be modified directly from client applications.
 *
 * This means that client applications ARE allowed to set this value directly when PUTTING or UPDATING an item,
 * but its value can never differ from the value already existing in the DB. This ensures that client applications
 * have not modified this field between consecutive GET and PUT requests.
 *
 * The only way to update this column's value is through the use of @Callback functions, which are executed AFTER the
 * request from the client application is validated.
 *
 * An example of an internal field is the "LastUpdateTime" field. When a client application wants to update a resource,
 * it should not update the "LastUpdateTime" field itself, instead it should send back the old value, and the entity's
 * internal callback will update the field as part of the commit process.
 *
 * @param columnName
 * @param columnConverter
 * @param required
 * @constructor
 */
export function Internal<T>(columnName: string, columnConverter: Converter<T>, required ?: boolean) {
    return (target: any, propertyKey: string) => {

        const columnDef: ColumnDef = {
            propName: propertyKey,
            name: columnName,
            converter: columnConverter,
            required: !!required,
            internal: true
        };

        if (ENTITY_COLS.has(target.constructor)) {
            ENTITY_COLS.get(target.constructor)!.push(columnDef);
        } else {
            ENTITY_COLS.set(target.constructor, [columnDef]);
        }
    }
}