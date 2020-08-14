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

import {Converter} from "../../converter/DBConverter";
import {StringConverter} from "../../converter/DBStringConverter";

/**
 *
 */
export type ViewColumnDef = {
    propName: string,
    name: string,
    required?: boolean,
    converter: Converter<string>,
    // converter?: ViewColumnConverter<any, any>,
};

/**
 *
 */
export const VIEW_COLUMN_DEFS = new Map<Function, ViewColumnDef[]>();

/**
 *
 */
export type ViewColumnType = number | boolean | string | null | Array<ViewColumnType>;

/**
 *
 */
export type ViewColumnConverter<E extends ViewColumnType, T> = {
    fromPrimitive(value: E): T
    toPrimitive(value: T): E
}

/**
 * Exposes this property in the API response object.
 * The property can both be a field as well as a get()/set() accessor.
 * @param name      The name to use for this property in the response object. If not provided,
 *                  then the property's name will be used.
 * @param converter An optional converter to transform the value to a primitive so that it can be exported as JSON.
 */
export function ViewColumn<E extends ViewColumnType, T = any>(name?: string, converter: Converter<string> = StringConverter/*, converter ?: ViewColumnConverter<E, T>*/) {

    return (target: any, propertyKey: string, descriptor?: TypedPropertyDescriptor<T>) => {

        const propertyDef: ViewColumnDef = {
            propName: propertyKey,
            name: name || propertyKey,
            converter: converter,
        };

        if (VIEW_COLUMN_DEFS.has(target.constructor)) {
            VIEW_COLUMN_DEFS.get(target.constructor)!.push(propertyDef);
        } else {
            VIEW_COLUMN_DEFS.set(target.constructor, [propertyDef]);
        }
    }
}