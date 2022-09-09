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
import {ExpressionAttributes} from "./ExpressionAttributes";
import {DATA_TYPE_SIMPLE, ExpressionMapper} from "./ExpressionMapper";
import {COLUMN_VAL, ColumnProperty} from "../property/ColumnProperty";

/** */
export type Column<T = any> = { colName: string, converter: Converter<T> }
export type Operation = Extract<"EQ" | "LE" | "LT" | "GE" | "GT" | "BEGINS_WITH" | "BETWEEN", DynamoDB.ComparisonOperator>

/**
 * {@inheritDoc DynamoDB}
 *
 * @see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.html#Query.KeyConditionExpressions
 */
export class KeyConditionMapper extends ExpressionMapper {

    private readonly _map: DynamoDB.FilterConditionMap & DynamoDB.KeyConditions;

    constructor(map?: DynamoDB.FilterConditionMap & DynamoDB.KeyConditions) {
        super();
        this._map = map || {};
    }

    apply<T extends DATA_TYPE_SIMPLE>(operation: Operation, column: ColumnProperty<any, T>, value: T): this {
        switch (operation) {
            case "EQ":
                return this.eq(column, value);
            case "LE":
                return this.le(column, value);
            case "LT":
                return this.lt(column, value);
            case "GE":
                return this.ge(column, value);
            case "GT":
                return this.gt(column, value);
            case "BEGINS_WITH":
                return this.beginsWith(column, value);
            case "BETWEEN":
                if (!Array.isArray(value) || value.length !== 2)
                    throw new Error(`Require exactly 2 values to evaluate a BETWEEN expression.`);
                return this.between(column, [value[0], value[1]]);
        }

        throw new Error(`Invalid operation type: ${operation}.`);
    }

    /**
     * {@inheritDoc DynamoDB}
     *
     * a = b — true if the attribute a is equal to the value b
     */
    eq<T extends DATA_TYPE_SIMPLE>(column: ColumnProperty<any, T>, value?: T): this {
        const map = {} as DynamoDB.Types.AttributeMap;
        const accessor = column.evaluate(map, COLUMN_VAL);
        accessor.set(value, {generate: false, throwIfNotFound: true});

        const expressionPath = this.getColumnAttributeName(column);
        const attributeValue = this.getColumnAttributeValue(column, map[column.def.colName]);
        // const attributeValue = JSON.stringify(map[column.def.colName]);

        console.debug("Adding EQ condition", expressionPath, attributeValue);
        this.conditions.push(`${expressionPath} = ${attributeValue}`);

        return this;
    }

    /**
     * {@inheritDoc DynamoDB}
     *
     * a <= b — true if a is less than or equal to b
     */
    le<T extends DATA_TYPE_SIMPLE>(column: ColumnProperty<any, T>, value?: T): this {
        const map = {} as DynamoDB.Types.AttributeMap;
        const accessor = column.evaluate(map, COLUMN_VAL);
        accessor.set(value, {generate: false, throwIfNotFound: true});

        const expressionPath = this.getColumnAttributeName(column);
        const attributeValue = JSON.stringify(map);
        this.conditions.push(`${expressionPath} <= ${attributeValue}`);
        return this;
    }

    /**
     * {@inheritDoc DynamoDB}
     *
     * a < b — true if a is less than b
     */
    lt<T extends DATA_TYPE_SIMPLE>(column: ColumnProperty<any, T>, value?: T): this {
        const map = {} as DynamoDB.Types.AttributeMap;
        const accessor = column.evaluate(map, COLUMN_VAL);
        accessor.set(value, {generate: false, throwIfNotFound: true});

        const expressionPath = this.getColumnAttributeName(column);
        const attributeValue = JSON.stringify(map);
        this.conditions.push(`${expressionPath} < ${attributeValue}`);
        return this;
    }

    /**
     * {@inheritDoc DynamoDB}
     *
     * a >= b — true if a is greater than or equal to b
     */
    ge<T extends DATA_TYPE_SIMPLE>(column: ColumnProperty<any, T>, value?: T): this {
        const map = {} as DynamoDB.Types.AttributeMap;
        const accessor = column.evaluate(map, COLUMN_VAL);
        accessor.set(value, {generate: false, throwIfNotFound: true});

        const expressionPath = this.getColumnAttributeName(column);
        const attributeValue = JSON.stringify(map);
        this.conditions.push(`${expressionPath} >= ${attributeValue}`);
        return this;
    }

    /**
     * {@inheritDoc DynamoDB}
     *
     * a > b — true if a is greater than b
     */
    gt<T extends DATA_TYPE_SIMPLE>(column: ColumnProperty<any, T>, value?: T): this {
        const map = {} as DynamoDB.Types.AttributeMap;
        const accessor = column.evaluate(map, COLUMN_VAL);
        accessor.set(value, {generate: false, throwIfNotFound: true});

        const expressionPath = this.getColumnAttributeName(column);
        const attributeValue = JSON.stringify(map);
        this.conditions.push(`${expressionPath} > ${attributeValue}`);
        return this;
    }

    /**
     * {@inheritDoc DynamoDB}
     *
     * begins_with (a, substr)— true if the value of attribute a begins with a particular substring.
     */
    beginsWith<T extends Exclude<DATA_TYPE_SIMPLE, number>>(column: ColumnProperty<any, T>, value?: T): this {
        const map = {} as DynamoDB.Types.AttributeMap;
        const accessor = column.evaluate(map, COLUMN_VAL);
        accessor.set(value, {generate: false, throwIfNotFound: true});
        const attributeValue = JSON.stringify(map);

        const expressionPath = this.getColumnAttributeName(column);
        this.conditions.push(`begins_with(${expressionPath}, ${attributeValue})`);
        return this;
    }

    /**
     * {@inheritDoc DynamoDB}
     *
     * a BETWEEN b AND c — true if a is greater than or equal to b, and less than or equal to c
     */
    between<T extends DATA_TYPE_SIMPLE>(column: ColumnProperty<any, T>, value: [T | undefined, T | undefined]): this {
        if (!Array.isArray(value) || value.length !== 2) {
            throw new Error(`Require exactly 2 values to evaluate a BETWEEN expression.`);
        }

        const map1 = {} as DynamoDB.Types.AttributeMap;
        const accessor1 = column.evaluate(map1, COLUMN_VAL);
        accessor1.set(value[0], {generate: false, throwIfNotFound: true});
        const attributeValue1 = JSON.stringify(map1);

        const map2 = {} as DynamoDB.Types.AttributeMap;
        const accessor2 = column.evaluate(map2, COLUMN_VAL);
        accessor2.set(value[1], {generate: false, throwIfNotFound: true});
        const attributeValue2 = JSON.stringify(map2);

        const expressionPath = this.getColumnAttributeName(column);
        this.conditions.push(`${expressionPath} BETWEEN ${attributeValue1} AND ${attributeValue2}`);
        return this;
    }

    toMap(): DynamoDB.FilterConditionMap & DynamoDB.KeyConditions {
        return {...this._map};
    }

    get expression(): string {
        console.debug("Expression", this.conditions);

        if (Object.keys(this.names).length > 2)
            throw new Error(`KeyConditions can only apply one single expression to the pk and sk.`);

        return super.expression;
    }

    get expressionAttributes(): ExpressionAttributes {
        if (Object.keys(this.names).length > 2)
            throw new Error(`KeyConditions can only apply one single expression to the pk and sk.`);

        return super.expressionAttributes;
    }
}