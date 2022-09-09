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
import {ColumnDef} from "../../annotation/Column";
import {ExpressionAttributes} from "./ExpressionAttributes";
import {ColumnProperty} from "../property/ColumnProperty";

/** */
export type Column<T = any> = { name: string, converter: Converter<T> }

/** */
export class ExpectedMapper {

    private readonly _map: DynamoDB.ExpectedAttributeMap;

    constructor(map?: DynamoDB.ExpectedAttributeMap) {
        this._map = map || {};
    }

    setExists<T>(column: ColumnProperty<any, T>, value: boolean) {
        // column.setValue(this._map, {Exists: value});
    }

    setValue<T>(column: ColumnProperty<any, T>, operator: DynamoDB.ComparisonOperator, value?: T) {
        const attributeValue = column.def.converter.convertTo(value);
        if (typeof attributeValue === "undefined") {
            // column.setValue(this._map, {Exists: false});
        } else {
            // column.setValue(this._map, {ComparisonOperator: operator, Value: attributeValue});
        }
    }

    setValueList<T>(column: ColumnProperty<any, T>, operator: DynamoDB.ComparisonOperator, values?: T[]) {
        const attributeValue = values?.reduce((arr, value) => {
            const attributeValue = column.def.converter.convertTo(value);
            return (typeof attributeValue === "undefined") ? arr : arr.concat(attributeValue);
        }, new Array<DynamoDB.AttributeValue>());

        // column.setValue(this._map, {ComparisonOperator: operator, AttributeValueList: attributeValue});
    }

    deleteValue(column: ColumnProperty<any, any>) {
        // delete column.evaluatePath(this._map)[column.property.colName];
    }

    toMap(): DynamoDB.ExpectedAttributeMap {
        return {...this._map};
    }

    get expression() : string {
        return ""
    }

    get expressionAttributes() : ExpressionAttributes {
        throw ""
    }



}