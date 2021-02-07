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

/** */
export type Column<T = any> = { name: string, converter: Converter<T> }

export type DATA_TYPE_SIMPLE = DynamoDB.StringAttributeValue | number | DynamoDB.BinaryAttributeValue;
export type DATA_TYPE_SET = DynamoDB.StringSetAttributeValue | number[] | DynamoDB.BinarySetAttributeValue;

/** */
export class ConditionMapper {

    private readonly _map: DynamoDB.FilterConditionMap & DynamoDB.KeyConditions;

    constructor(map?: DynamoDB.FilterConditionMap & DynamoDB.KeyConditions) {
        this._map = map || {};
    }

    apply<T extends DATA_TYPE_SIMPLE | DATA_TYPE_SET>(operation: DynamoDB.Types.ComparisonOperator, column: Column<T>, value: T | T[]): this {
        if (Array.isArray(value)) {
            switch (operation) {
                case "IN":
                    return this.in(column, value);
                case "BETWEEN":
                    return this.between(column, [value[0], value[1]]);
                default:
                    throw new Error(`Invalid operation type. Expected an array of values.`)
            }
        } else {
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
                    return this.notNull(column, value);
                case "NULL":
                    return this.null(column, value);
                case "CONTAINS":
                    return this.contains(column, value);
                case "NOT_CONTAINS":
                    return this.notContains(column, value);
                case "BEGINS_WITH":
                    return this.beginsWith(column, value);
                default:
                    throw new Error(`Invalid operation type. Expected only one value.`)
            }
        }

        throw new Error(`Invalid operation type.`);
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
    eq<T extends DATA_TYPE_SIMPLE | DATA_TYPE_SET>(column: Column<T>, value?: T): this {
        const attributeValue = column.converter.convertTo(value);
        this._map[column.name] = {
            AttributeValueList: [req(attributeValue)],
            ComparisonOperator: "EQ"
        };
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
    ne<T extends DATA_TYPE_SIMPLE | DATA_TYPE_SET>(column: Column<T>, value?: T): this {
        const attributeValue = column.converter.convertTo(value);
        this._map[column.name] = {
            AttributeValueList: [req(attributeValue)],
            ComparisonOperator: "NE"
        };
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
    le<T extends DATA_TYPE_SIMPLE>(column: Column<T>, value?: T): this {
        const attributeValue = column.converter.convertTo(value);
        this._map[column.name] = {
            AttributeValueList: [req(attributeValue)],
            ComparisonOperator: "LE"
        };
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
    lt<T extends DATA_TYPE_SIMPLE>(column: Column<T>, value?: T): this {
        const attributeValue = column.converter.convertTo(value);
        this._map[column.name] = {
            AttributeValueList: [req(attributeValue)],
            ComparisonOperator: "LT"
        };
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
    ge<T extends DATA_TYPE_SIMPLE>(column: Column<T>, value?: T): this {
        const attributeValue = column.converter.convertTo(value);
        this._map[column.name] = {
            AttributeValueList: [req(attributeValue)],
            ComparisonOperator: "GE"
        };
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
    gt<T extends DATA_TYPE_SIMPLE>(column: Column<T>, value?: T): this {
        const attributeValue = column.converter.convertTo(value);
        this._map[column.name] = {
            AttributeValueList: [req(attributeValue)],
            ComparisonOperator: "GT"
        };
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
    notNull<T extends DATA_TYPE_SIMPLE | DATA_TYPE_SET>(column: Column<T>, value?: T): this {
        const attributeValue = column.converter.convertTo(value);
        this._map[column.name] = {
            AttributeValueList: [req(attributeValue)],
            ComparisonOperator: "NOT_NULL"
        };
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
    null<T extends DATA_TYPE_SIMPLE | DATA_TYPE_SET>(column: Column<T>, value?: T): this {
        const attributeValue = column.converter.convertTo(value);
        this._map[column.name] = {
            AttributeValueList: [req(attributeValue)],
            ComparisonOperator: "NULL"
        };
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
    contains<T extends DATA_TYPE_SIMPLE>(column: Column<T>, value?: T): this {
        const attributeValue = column.converter.convertTo(value);
        this._map[column.name] = {
            AttributeValueList: [req(attributeValue)],
            ComparisonOperator: "CONTAINS"
        };
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
    notContains<T extends DATA_TYPE_SIMPLE>(column: Column<T>, value?: T): this {
        const attributeValue = column.converter.convertTo(value);
        this._map[column.name] = {
            AttributeValueList: [req(attributeValue)],
            ComparisonOperator: "NOT_CONTAINS"
        };
        return this;
    }

    /**
     * {@inheritDoc DynamoDB}
     *
     * BEGINS_WITH : Checks for a prefix.
     * AttributeValueList can contain only one AttributeValue of type String or Binary (not a Number or a set type).
     * The target attribute of the comparison must be of type String or Binary (not a Number or a set type).
     */
    beginsWith<T extends Exclude<DATA_TYPE_SIMPLE, number>>(column: Column<T>, value?: T): this {
        const attributeValue = column.converter.convertTo(value);
        this._map[column.name] = {
            AttributeValueList: [req(attributeValue)],
            ComparisonOperator: "BEGINS_WITH"
        };
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
    in<T extends DATA_TYPE_SIMPLE>(column: Column<T>, value?: Array<T | undefined>): this {
        const attributeValues = value?.map(elt => req(column.converter.convertTo(elt)));
        this._map[column.name] = {
            AttributeValueList: req(attributeValues),
            ComparisonOperator: "IN"
        };
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
    between<T extends DATA_TYPE_SIMPLE>(column: Column<T>, value: [T | undefined, T | undefined]): this {
        const attributeValues = value.map(elt => req(column.converter.convertTo(elt)));
        this._map[column.name] = {
            AttributeValueList: attributeValues,
            ComparisonOperator: "BETWEEN"
        };
        return this;
    }

    toMap(): DynamoDB.FilterConditionMap & DynamoDB.KeyConditions {
        return {...this._map};
    }

}