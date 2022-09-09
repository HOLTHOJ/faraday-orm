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
import {Converter} from "../../converter";
import {req} from "../Req";
import {ExpressionAttributes} from "./ExpressionAttributes";
import {COLUMN_ATT, COLUMN_VAL, ColumnProperty} from "../property/ColumnProperty";

/** */
export type Column<T = any> = {
    readonly colName: string;
    readonly propName: string;
    readonly converter: Converter<T>;
}

/** */
export class AttributeMapper {

    private readonly _map: DynamoDB.Types.AttributeMap;

    constructor(map?: DynamoDB.AttributeMap) {
        this._map = map || {};
    }

    hasValue<T>(column: ColumnProperty<any, T>): boolean {
        const value = column.evaluate(this._map, COLUMN_ATT).get({generate: false, throwIfNotFound: false});

        // const root = this.evaluatePath(column.columnPath, false, false);
        // if (typeof root === "undefined") return false;
        //
        // const value = root[column.property.colName];
        if (typeof value === "undefined") return false;

        return Object.keys(value).length > 0;
    }

    setValue<T>(column: ColumnProperty<any, T>, value: T | undefined) {
        column.evaluate(this._map, COLUMN_VAL).set(value)
        // const attributeValue = column.property.converter.convertTo(value);
        // this.setAttribute(column, column.property.converter.convertTo(value));
    }

    setRequiredValue<T>(column: ColumnProperty<any, T>, value: T): void;
    setRequiredValue<T>(column: ColumnProperty<any, T>, value: T | undefined, defaultValue: T): void;
    setRequiredValue<T>(column: ColumnProperty<any, T>, value: T | undefined, defaultValue ?: T) {
        if (typeof value === "undefined" || value === null) {
            if (typeof defaultValue === "undefined" || defaultValue === null)
                throw Error(`Missing required value for property ${column.def.colName}.`);

            value = defaultValue;
        }

        this.setValue(column, value);
    }

    getValue<T>(column: ColumnProperty<any, T>): T | undefined {
        return column.evaluate(this._map, COLUMN_VAL).get();
        // const value = this.getAttributeValue(column);
        // return column.property.converter.convertFrom(value);
    }

    getRequiredValue<T>(column: ColumnProperty<any, T>, defaultValue ?: T): T {
        const value = this.getValue(column);
        if (typeof value !== "undefined" && value !== null) return value;

        if (typeof defaultValue === "undefined" || defaultValue === null)
            throw Error(`Missing required value for property ${column.def.colName}.`);

        return defaultValue;
    }

    // --------------------------------------
    // Attribute section
    // --------------------------------------

    private evaluatePath(path: string[] | undefined, generate: boolean = true, throwIfNotFound: boolean = true): DynamoDB.Types.MapAttributeValue | DynamoDB.Types.AttributeMap {
        if (!Array.isArray(path) || path.length === 0) return this._map;

        return path.reduce((cwd, elt) => {
            if (cwd.hasOwnProperty(elt)) {
                return req(cwd[elt].M, `Property ${elt} in path ${path} is not an object type.`);
            } else if (generate) {
                cwd[elt] = {M: {}};
                return {};
            } else if (throwIfNotFound) {
                throw `Property ${elt} does not exist in path ${path}.`;
            } else {
                return {};
            }
        }, this._map);
    }

    setAttribute<T>(column: ColumnProperty<any, T>, attr?: DynamoDB.Types.AttributeValue) {
        if (typeof attr !== "undefined") {
            column.evaluate(this._map, COLUMN_ATT).set(attr);
            // this.evaluatePath(column.columnPath, true, false)[column.property.colName] = attr;
        } else {
            // This indicates that we explicitly emptied this field.
            column.evaluate(this._map, COLUMN_ATT).set({});
            // this.evaluatePath(column.columnPath, true, false)[column.property.colName] = {};
        }
    }

    // deleteValue<T>(column: ColumnProperty<any, T>) {
    // FIXME : does this remove the value from the original map or from a copy ?
    // delete this.evaluatePath(column.columnPath, false, false)[column.property.colName];
    // }

    getAttributeValue<T>(column: ColumnProperty<any, T>): DynamoDB.Types.AttributeValue | undefined {
        return column.evaluate(this._map, COLUMN_ATT).get();
        // return this.evaluatePath(column.columnPath, false, false)[column.property.colName];
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

    get expression(): string {
        throw ""
    }

    get expressionAttributes(): ExpressionAttributes {
        throw ""
    }
}