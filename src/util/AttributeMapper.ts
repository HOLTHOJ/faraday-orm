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

import {DynamoDB} from "aws-sdk";
import {DBConverter} from "../converter/DBConverter";

export type ColumnDef<T> = {
    readonly name: string;
    readonly converter: DBConverter<T>;
    // readonly defaultValue?: () => T;
    // readonly required?: boolean;
}

export class AttributeMapper {

    private readonly _map: DynamoDB.Types.AttributeMap;

    constructor(map?: DynamoDB.AttributeMap) {
        this._map = map || {};
    }

    hasValue<T>(column: ColumnDef<T>): boolean {
        return this._map[column.name] && Object.keys(this._map[column.name]).length > 0;
    }

    setValue<T>(column: ColumnDef<T>, value: T | undefined) {
        const attributeValue = column.converter.convertTo(value);
        this.setAttribute(column, attributeValue);
    }

    setRequiredValue<T>(column: ColumnDef<T>, value: T): void;
    setRequiredValue<T>(column: ColumnDef<T>, value: T | undefined, defaultValue: T): void;
    setRequiredValue<T>(column: ColumnDef<T>, value: T | undefined, defaultValue ?: T) {
        if (typeof value === "undefined" || value === null) {
            if (typeof defaultValue === "undefined" || defaultValue === null)
                throw Error(`Missing required value for property ${column.name}.`);

            value = defaultValue;
        }

        this.setValue(column, value);
    }

    getValue<T>(column: ColumnDef<T>): T | undefined {
        const value = this._map[column.name];
        return column.converter.convertFrom(value);
    }

    getRequiredValue<T>(column: ColumnDef<T>, defaultValue ?: T): T {
        const value = this.getValue(column);
        if (typeof value !== "undefined" && value !== null) return value;

        if (typeof defaultValue === "undefined" || defaultValue === null)
            throw Error(`Missing required value for property ${column.name}.`);

        return defaultValue;
    }

    setAttribute<T>(column: ColumnDef<T>, attr?: DynamoDB.Types.AttributeValue) {
        if (typeof attr !== "undefined") {
            this._map[column.name] = attr
        } else {
            this._map[column.name] = {};
        }
    }

    deleteValue(column: ColumnDef<any>) {
        delete this._map[column.name];
    }

    getAttributeValue<T>(column: ColumnDef<T>): DynamoDB.Types.AttributeValue | undefined {
        return this._map[column.name];
    }

    toJSON(): object {
        const jsonObj = {} as any;

        // add all properties
        let proto = Object.getPrototypeOf(this);
        while (proto) {
            for (const key of Object.getOwnPropertyNames(proto)) {
                const desc = Object.getOwnPropertyDescriptor(proto, key);
                const hasGetter = desc && typeof desc.get === 'function';
                if (hasGetter) {
                    // @ts-ignore
                    jsonObj[key] = this[key];
                }
            }
            proto = Object.getPrototypeOf(proto);
        }

        return jsonObj;
    }

    toMap(includeEmpty: boolean = false): DynamoDB.Types.AttributeMap {
        if (includeEmpty) return {...this._map};

        return Object.entries({...this._map}).reduce((obj, elt) => {
            if (Object.keys(elt[1]).length !== 0) {
                obj[elt[0]] = elt[1];
            }
            return obj;
        }, {} as DynamoDB.AttributeMap);
    }

    equals(other: AttributeMapper): boolean {
        return JSON.stringify(this._map) === JSON.stringify(other.toMap());
    }

}