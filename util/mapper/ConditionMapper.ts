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
import {DATA_TYPE_SET, DATA_TYPE_SIMPLE, ExpressionMapper} from "./ExpressionMapper";
import {ColumnProperty} from "../property/ColumnProperty";

/** */
export type Column<T = any> = { propName: string, colName: string, converter: Converter<T> }

/** */
export class ConditionMapper extends ExpressionMapper {

    private readonly _map: DynamoDB.FilterConditionMap & DynamoDB.KeyConditions;

    constructor(map?: DynamoDB.FilterConditionMap & DynamoDB.KeyConditions) {
        super();
        this._map = map || {};
    }

    apply<T extends DATA_TYPE_SIMPLE | DATA_TYPE_SET>(operation: DynamoDB.Types.ComparisonOperator, column: ColumnProperty<any, any>, value: any): this {
        switch (operation) {
            case "EQ":
                return this.eq(column, value);
            case "NE":
                return this.ne(column, value);
            case "LE":
                return this.le(column, value);
            case "LT":
                return this.lt(column, value);
            case "GE":
                return this.ge(column, value);
            case "GT":
                return this.gt(column, value);
            case "NOT_NULL":
                return this.notNull(column);
            case "NULL":
                return this.null(column);
            case "CONTAINS":
                return this.contains(column, value);
            case "NOT_CONTAINS":
                return this.notContains(column, value);
            case "BEGINS_WITH":
                return this.beginsWith(column, value);
            case "IN":
                return this.in(column, value);
            case "BETWEEN":
                return this.between(column, value);
        }

        throw new Error(`Invalid operation type: ${operation}.`);
    }

    /**
     * {@inheritDoc DynamoDB}
     *
     * EQ : Equal.
     * EQ is supported for all data types, including lists and maps.
     * AttributeValueList can contain only one AttributeValue element of type String, Number, Binary, String Set,
     * Number Set, or Binary Set.  If an item contains an AttributeValue element of a different type than the one
     * provided in the request, the value does not match.  For example, {"S":"6"} does not equal {"N":"6"}. Also,
     * {"N":"6"} does not equal {"NS":["6", "2", "1"]}.
     */
    eq<T extends DATA_TYPE_SIMPLE>(column: ColumnProperty<any, T>, value?: T): this {
        const expressionPath = this.getColumnAttributeName(column);
        const attributeValue = this.getColumnAttributeValue(column, column.def.converter.convertTo(value)!);
        this.conditions.push(`${expressionPath} = ${attributeValue}`);
        return this;
    }

    /**
     * {@inheritDoc DynamoDB}
     *
     * NE : Not equal.
     * NE is supported for all data types, including lists and maps.
     * AttributeValueList can contain only one AttributeValue of type String, Number, Binary, String Set, Number Set,
     * or Binary Set.  If an item contains an AttributeValue of a different type than the one provided in the request,
     * the value does not match.  For example, {"S":"6"} does not equal {"N":"6"}. Also, {"N":"6"} does not equal
     * {"NS":["6", "2", "1"]}.
     */
    ne<T extends DATA_TYPE_SIMPLE | DATA_TYPE_SET>(column: ColumnProperty<any, T>, value?: T): this {
        const expressionPath = this.getColumnAttributeName(column);
        const attributeValue = this.getColumnAttributeValue(column, column.def.converter.convertTo(value)!);
        this.conditions.push(`${expressionPath} <> ${attributeValue}`);
        return this;
    }

    /**
     * {@inheritDoc DynamoDB}
     *
     * LE : Less than or equal.
     * AttributeValueList can contain only one AttributeValue element of type String, Number, or Binary (not a set
     * type).  If an item contains an AttributeValue element of a different type than the one provided in the request,
     * the value does not match.  For example, {"S":"6"} does not equal {"N":"6"}. Also, {"N":"6"} does not compare to
     * {"NS":["6", "2", "1"]}.
     */
    le<T extends DATA_TYPE_SIMPLE>(column: ColumnProperty<any, T>, value?: T): this {
        const expressionPath = this.getColumnAttributeName(column);
        const attributeValue = this.getColumnAttributeValue(column, column.def.converter.convertTo(value)!);
        this.conditions.push(`${expressionPath} <= ${attributeValue}`);
        return this;
    }

    /**
     * {@inheritDoc DynamoDB}
     *
     * LT : Less than.
     * AttributeValueList can contain only one AttributeValue of type String, Number, or Binary (not a set type).
     * If an item contains an AttributeValue element of a different type than the one provided in the request, the
     * value does not match.  For example, {"S":"6"} does not equal {"N":"6"}. Also, {"N":"6"} does not compare to
     * {"NS":["6", "2", "1"]}.
     */
    lt<T extends DATA_TYPE_SIMPLE>(column: ColumnProperty<any, T>, value?: T): this {
        const expressionPath = this.getColumnAttributeName(column);
        const attributeValue = this.getColumnAttributeValue(column, column.def.converter.convertTo(value)!);
        this.conditions.push(`${expressionPath} < ${attributeValue}`);
        return this;
    }

    /**
     * {@inheritDoc DynamoDB}
     *
     * GE : Greater than or equal.
     * AttributeValueList can contain only one AttributeValue element of type String, Number, or Binary (not a set
     * type).  If an item contains an AttributeValue element of a different type than the one provided in the request,
     * the value does not match.  For example, {"S":"6"} does not equal {"N":"6"}. Also, {"N":"6"} does not compare to
     * {"NS":["6", "2", "1"]}.
     */
    ge<T extends DATA_TYPE_SIMPLE>(column: ColumnProperty<any, T>, value?: T): this {
        const expressionPath = this.getColumnAttributeName(column);
        const attributeValue = this.getColumnAttributeValue(column, column.def.converter.convertTo(value)!);
        this.conditions.push(`${expressionPath} >= ${attributeValue}`);
        return this;
    }

    /**
     * {@inheritDoc DynamoDB}
     *
     * GT : Greater than.
     * AttributeValueList can contain only one AttributeValue element of type String, Number, or Binary (not a set
     * type).  If an item contains an AttributeValue element of a different type than the one provided in the request,
     * the value does not match.  For example, {"S":"6"} does not equal {"N":"6"}. Also, {"N":"6"} does not compare to
     * {"NS":["6", "2", "1"]}.
     */
    gt<T extends DATA_TYPE_SIMPLE>(column: ColumnProperty<any, T>, value?: T): this {
        const expressionPath = this.getColumnAttributeName(column);
        const attributeValue = this.getColumnAttributeValue(column, column.def.converter.convertTo(value)!);
        this.conditions.push(`${expressionPath} > ${attributeValue}`);
        return this;
    }

    /**
     * {@inheritDoc DynamoDB}
     *
     * NOT_NULL : The attribute exists.
     * NOT_NULL is supported for all data types, including lists and maps.
     * This operator tests for the existence of an attribute, not its data type.
     * If the data type of attribute "a" is null, and you evaluate it using NOT_NULL, the result is a Boolean true.
     * This result is because the attribute "a" exists; its data type is not relevant to the NOT_NULL comparison
     * operator.
     */
    notNull<T extends DATA_TYPE_SIMPLE | DATA_TYPE_SET>(column: ColumnProperty<any, T>): this {
        const expressionPath = this.getColumnAttributeName(column);
        this.conditions.push(`attribute_exists(${expressionPath})`);
        return this;
    }

    /**
     * {@inheritDoc DynamoDB}
     *
     * NULL : The attribute does not exist.
     * NULL is supported for all data types, including lists and maps.
     * This operator tests for the nonexistence of an attribute, not its data type.
     * If the data type of attribute "a" is null, and you evaluate it using NULL, the result is a Boolean false.
     * This is because the attribute "a" exists; its data type is not relevant to the NULL comparison operator.
     */
    null<T extends DATA_TYPE_SIMPLE | DATA_TYPE_SET>(column: ColumnProperty<any, T>): this {
        const expressionPath = this.getColumnAttributeName(column);
        this.conditions.push(`attribute_not_exists(${expressionPath})`);
        return this;
    }

    /**
     * {@inheritDoc DynamoDB}
     *
     * CONTAINS : Checks for a subsequence, or value in a set.
     * AttributeValueList can contain only one AttributeValue element of type String, Number, or Binary (not a set
     * type).  If the target attribute of the comparison is of type String, then the operator checks for a substring
     * match.  If the target attribute of the comparison is of type Binary, then the operator looks for a subsequence
     * of the target that matches the input.  If the target attribute of the comparison is a set ("SS", "NS", or "BS"),
     * then the operator evaluates to true if it finds an exact match with any member of the set. CONTAINS is supported
     * for lists: When evaluating "a CONTAINS b", "a" can be a list; however, "b" cannot be a set, a map, or a list.
     */
    contains<T extends DATA_TYPE_SIMPLE>(column: ColumnProperty<any, T | T[]>, value?: T): this {
        const expressionPath = this.getColumnAttributeName(column);
        const attributeValue = this.getColumnAttributeValue(column, column.def.converter.convertTo(value)!);
        this.conditions.push(`contains(${expressionPath}, ${attributeValue})`);
        return this;
    }

    /**
     * {@inheritDoc DynamoDB}
     *
     * NOT_CONTAINS : Checks for absence of a subsequence, or absence of a value in a set.
     * AttributeValueList can contain only one AttributeValue element of type String, Number, or Binary (not a set
     * type).  If the target attribute of the comparison is a String, then the operator checks for the absence of a
     * substring match.  If the target attribute of the comparison is Binary, then the operator checks for the absence
     * of a subsequence of the target that matches the input.  If the target attribute of the comparison is a set
     * ("SS", "NS", or "BS"), then the operator evaluates to true if it does not find an exact match with any member of
     * the set. NOT_CONTAINS is supported for lists: When evaluating "a NOT CONTAINS b", "a" can be a list; however,
     * "b" cannot be a set, a map, or a list.
     */
    notContains<T extends DATA_TYPE_SIMPLE>(column: ColumnProperty<any, T>, value?: T): this {
        const expressionPath = this.getColumnAttributeName(column);
        const attributeValue = this.getColumnAttributeValue(column, column.def.converter.convertTo(value)!);
        this.conditions.push(`NOT contains(${expressionPath}, ${attributeValue})`);
        return this;
    }

    /**
     * {@inheritDoc DynamoDB}
     *
     * BEGINS_WITH : Checks for a prefix.
     * AttributeValueList can contain only one AttributeValue of type String or Binary (not a Number or a set type).
     * The target attribute of the comparison must be of type String or Binary (not a Number or a set type).
     */
    beginsWith<T extends Exclude<DATA_TYPE_SIMPLE, number>>(column: ColumnProperty<any, T>, value?: T): this {
        const expressionPath = this.getColumnAttributeName(column);
        const attributeValue = this.getColumnAttributeValue(column, column.def.converter.convertTo(value)!);
        this.conditions.push(`begins_with(${expressionPath}, ${attributeValue})`);
        return this;
    }

    /**
     * {@inheritDoc DynamoDB}
     *
     * IN : Checks for matching elements in a list.
     * AttributeValueList can contain one or more AttributeValue elements of type String, Number, or Binary.
     * These attributes are compared against an existing attribute of an item.
     * If any elements of the input are equal to the item attribute, the expression evaluates to true.
     */
    in<T extends DATA_TYPE_SIMPLE>(column: ColumnProperty<any, T>, value: T[]): this {
        const expressionPath = this.getColumnAttributeName(column);
        const attributeValues = value.map(elt => this.getColumnAttributeValue(column, column.def.converter.convertTo(elt)!));
        this.conditions.push(`${expressionPath} IN (${attributeValues.join(", ")})`);
        return this;
    }

    /**
     * {@inheritDoc DynamoDB}
     *
     * BETWEEN : Greater than or equal to the first value, and less than or equal to the second value.
     * AttributeValueList must contain two AttributeValue elements of the same type, either String, Number, or Binary
     * (not a set type).  A target attribute matches if the target value is greater than, or equal to, the first
     * element and less than, or equal to, the second element.  If an item contains an AttributeValue element of a
     * different type than the one provided in the request, the value does not match.  For example, {"S":"6"} does not
     * compare to {"N":"6"}. Also, {"N":"6"} does not compare to {"NS":["6", "2", "1"]}
     */
    between<T extends DATA_TYPE_SIMPLE>(column: ColumnProperty<any, T>, value: [T | undefined, T | undefined]): this {
        if (!Array.isArray(value) || value.length !== 2) {
            throw new Error(`Require exactly 2 values to evaluate a BETWEEN expression.`);
        }

        const expressionPath = this.getColumnAttributeName(column);
        const attributeValue0 = this.getColumnAttributeValue(column, column.def.converter.convertTo(value[0])!);
        const attributeValue1 = this.getColumnAttributeValue(column, column.def.converter.convertTo(value[1])!);
        // const [expressionPath0, attributeValue0] = this.getAttribute(column, value[0]);
        // const [expressionPath1, attributeValue1] = this.getAttribute(column, value[1]);
        this.conditions.push(`${expressionPath} BETWEEN ${attributeValue0} AND ${attributeValue1}`);
        return this;
    }

    toMap(): DynamoDB.FilterConditionMap & DynamoDB.KeyConditions {
        return {...this._map};
    }

}