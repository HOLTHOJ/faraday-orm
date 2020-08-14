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
import {ColumnDescription} from "../entity";

export class ExpectedMapper {

    private readonly _map: DynamoDB.ExpectedAttributeMap;

    constructor(map?: DynamoDB.ExpectedAttributeMap) {
        this._map = map || {};
    }

    setExists<T>(column: ColumnDescription<T>, value: boolean) {
        this._map[column.name] = {
            Exists: value
        };
    }

    setExists2(columnName: string, value: boolean) {
        this._map[columnName] = {
            Exists: value
        };
    }

    setValue<T>(column: ColumnDescription<T>, operator: DynamoDB.ComparisonOperator, value?: T) {
        const attributeValue = column.converter.convertTo(value);
        if (typeof attributeValue === "undefined") {
            this.setExists(column, false);
        } else {
            this._map[column.name] = {
                ComparisonOperator: operator,
                Value: attributeValue,
            };
        }
    }

    setValueList<T>(column: ColumnDescription<T>, operator: DynamoDB.ComparisonOperator, values?: T[]) {
        const attributeValue = values?.reduce((arr, value) => {
            const attributeValue = column.converter.convertTo(value);
            return (typeof attributeValue === "undefined") ? arr : arr.concat(attributeValue);
        }, new Array<DynamoDB.AttributeValue>());

        this._map[column.name] = {
            ComparisonOperator: operator,
            AttributeValueList: attributeValue,
        };
    }

    deleteValue(column: ColumnDescription<any>) {
        delete this._map[column.name];
    }

    toMap(): DynamoDB.ExpectedAttributeMap {
        return {...this._map};
    }

}