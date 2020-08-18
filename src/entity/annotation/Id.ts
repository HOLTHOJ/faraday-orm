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
import {Converter} from "../../converter/Converter";
import {StringConverter} from "../../converter/StringConverter";

/** The type of id column. PK = Partition Key, SK = Sort Key. */
export type IdType = "PK" | "SK";

/** The column definition for this Id column. */
export type IdColumnDef = ColumnDef<string> & { idType: IdType };

/** @internal Repository of all ids and the constructor function on which they are defined. */
export const ENTITY_IDS = new Map<Function, IdColumnDef[]>();

/**
 * Defines an ID column in the DB row.
 *
 * @param idType            The type if Id column. DynamoDB tables can have a Partition Key (pk) and Sort Key (sk).
 * @param columnName        The name of the column in the database.
 * @param columnConverter   A converter to convert the value from/to their database attribute value.
 */
export function Id(idType: IdType, columnName: string, columnConverter: Converter<string> = StringConverter) {
    return (target: any, propertyKey: string) => {

        const columnDef: IdColumnDef = {
            propName: propertyKey,
            name: columnName,
            converter: columnConverter,
            required: true,
            internal: false,
            idType: idType,
        };

        if (ENTITY_IDS.has(target.constructor)) {
            ENTITY_IDS.get(target.constructor)!.push(columnDef);
        } else {
            ENTITY_IDS.set(target.constructor, [columnDef]);
        }
    }
}