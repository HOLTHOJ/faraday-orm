import {ExpressionAttributes} from "./ExpressionAttributes";
import {ExpressionAttributeNameMap, ExpressionAttributeValueMap} from "aws-sdk/clients/dynamodb";
import {DynamoDB} from "aws-sdk";
import {COLUMN_ATT, ColumnProperty} from "../property/ColumnProperty";

export type DATA_TYPE_SIMPLE = DynamoDB.StringAttributeValue | number | DynamoDB.BinaryAttributeValue;
export type DATA_TYPE_SET = DynamoDB.StringSetAttributeValue | number[] | DynamoDB.BinarySetAttributeValue;

export abstract class ExpressionMapper {

    protected readonly conditions: Array<string> = [];
    protected readonly names: Record<string, string> = {};
    protected readonly values: Record<string, DynamoDB.Types.AttributeValue> = {};

    protected addExpression() {

    }

    protected getColumnAttributeName(column: ColumnProperty<any, any>): string {
        // Both COLUMN_ATT & COLUMN_VAL should give the same path.
        const accessor = column.evaluate({}, COLUMN_ATT);
        return this.getExpressionAttributeNames(accessor.path);
    }

    protected getColumnAttributeValue(column: ColumnProperty<any, any>, value: DynamoDB.Types.AttributeValue): string | undefined {
        const attributeValueName = ":" + column.def.colName.replace(/[^a-z0-9]/gi, '');
        if (!this.values.hasOwnProperty(attributeValueName)) {
            // return `${this.values[attributeValueName]}`;
            this.values[attributeValueName] = value;
        }

        return attributeValueName;
        // return JSON.stringify(column.def.converter?.convertTo(value));
    }

    protected getExpressionAttributeName(columnName: string): string {
        const attributeName = "#" + columnName.replace(/[^a-z0-9]/gi, '');
        if (!this.names.hasOwnProperty(attributeName)) {
            // return `${this.names[attributeName]}`;
            this.names[attributeName] = columnName;
        }

        return attributeName;
    }

    protected getExpressionAttributeNames(path: string[]): string {
        return path.map(elt => this.getExpressionAttributeName(elt)).join(".");
    }

    get expression(): string {
        console.debug("Expression2", this.conditions);

        return this.conditions.join(" AND ");
    }

    get expressionAttributes(): ExpressionAttributes {
        const _names = this.names;
        const _values = this.values;
        return {
            get names(): ExpressionAttributeNameMap {
                return _names;
            },
            get values(): ExpressionAttributeValueMap {
                return _values;
            }
        }
    }

    getEN(): ExpressionAttributeNameMap {
        return Object.entries(this.names).reduce((obj, [key, value]) => {
            // Reverse the object.
            obj[value] = key;
            return obj;
        }, {} as ExpressionAttributeNameMap);
    }

}