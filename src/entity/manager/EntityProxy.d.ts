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

import {CallbackOperation, ColumnDef, EntityType, IdColumnDef} from "..";

export type EntityProxy<E extends object = any> = E & {

    readonly entityType: EntityType<E>;

    getValue(propName: PropertyKey): any;

    setValue(propName: PropertyKey, value: any): void;

    /**
     * Parses the key paths using this Entity instance and populates their resp. properties.
     */
    parseKeys(): void;

    forEachId(block: (id: IdColumnDef, value: any, valueIsSet: boolean) => void, validateRequired?: boolean): void;

    /**
     *
     * ** Includes @Internal columns.
     *
     * @param block
     * @param validateRequired
     */
    forEachCol(block: (col: ColumnDef, value: any | undefined, valueIsSet: boolean) => void, validateRequired?: boolean): void;

    executeCallbacks(operation: CallbackOperation): void;

    toJSON(): object;
}
