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

import {ColumnDef} from "./Column";
import {Converter} from "../../converter/DBConverter";
import {StringConverter} from "../../converter/DBStringConverter";

/** The type of id column. */
export type IdType = "PK" | "SK";

/** */
export type IdGenerator<T = any> = (type: IdType, value: T) => string;

/** The column definition for this Id column. */
export type IdColumnDef = ColumnDef<string> & { idType: IdType, generator?: IdGenerator<any> };

/** */
export const ENTITY_IDS = new Map<Function, IdColumnDef[]>();

/**
 * Defines an ID column in the DB row.
 *
 * @param idType
 * @param columnName
 * @param columnConverter
 * @param generator
 */
export function Id(idType: IdType, columnName: string, columnConverter: Converter<string> = StringConverter, generator ?: IdGenerator) {
    return (target: any, propertyKey: string) => {

        const columnDef: IdColumnDef = {
            propName: propertyKey,
            name: columnName,
            converter: columnConverter,
            required: true,
            internal: false,
            idType: idType,
            generator: generator,
        };

        if (ENTITY_IDS.has(target.constructor)) {
            ENTITY_IDS.get(target.constructor)!.push(columnDef);
        } else {
            ENTITY_IDS.set(target.constructor, [columnDef]);
        }
    }
}