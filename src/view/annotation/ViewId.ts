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

/** */
export type ViewIdType = "PK" | "SK";

/** */
export type ViewIdColumnDef = {
    propName: string,
    idType: ViewIdType,
    name: string,
    converter: Converter<string>,
};

/** */
export const VIEW_IDS = new Map<Function, ViewIdColumnDef[]>();

/**
 * Defines a View ID column in the DB row.
 * @param idType
 * @param columnName
 * @param columnConverter
 */
export function ViewId<T>(idType: ViewIdType, columnName: string, columnConverter: Converter<string> = StringConverter) {
    return (target: any, propertyKey: string) => {
        const columnDef: ViewIdColumnDef = {
            propName: propertyKey,
            idType: idType,
            name: columnName,
            converter: columnConverter,
        };

        if (VIEW_IDS.has(target.constructor)) {
            VIEW_IDS.get(target.constructor)!.push(columnDef);
        } else {
            VIEW_IDS.set(target.constructor, [columnDef]);
        }
    }
}