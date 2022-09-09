import {DynamoDB} from "aws-sdk";
import {ObjectProperty, PropertyDef} from "./ObjectProperty";
import {Property, PropertyAccessor, PropertyAccessorOptions, PropertyChain} from "./Property";
import {def, req} from "../Req";
import {Converter} from "../../converter";

export const COLUMN_VAL: unique symbol = Symbol("COLUMN_DIM");
export const COLUMN_ATT: unique symbol = Symbol("COLUMN_ATT");

export type ColumnDef<T> = PropertyDef & {
    colName: string,
    converter: Converter<T>,
}

export class ColumnProperty<R extends object, T> extends ObjectProperty<R, T> {

    readonly def: ColumnDef<T>;

    constructor(def: ColumnDef<T>, propertyRoot?: Property<R, any>) {
        super(def, propertyRoot);
        this.def = def;
    }

    public evaluate(root: DynamoDB.Types.AttributeMap, dimension: typeof COLUMN_VAL): PropertyAccessor<T>
    public evaluate(root: DynamoDB.Types.AttributeMap, dimension: typeof COLUMN_ATT): PropertyAccessor<DynamoDB.Types.AttributeValue>
    public evaluate(root: R, dimension: symbol): PropertyAccessor<any>
    public evaluate(root: any, dimension: symbol): PropertyAccessor<any> {
        return super.evaluate(root, dimension);
    }

    protected _evaluate(parent: PropertyChain, dimension: symbol): PropertyAccessor<any> {
        switch (dimension) {
            case COLUMN_ATT:
                return {
                    path: parent.path.concat(this.def.colName),
                    get: () => parent.get()[this.def.colName],
                    set: (value) => parent.get()[this.def.colName] = value,
                }
            case COLUMN_VAL:
                const converter = req(this.def.converter);
                return {
                    path: parent.path.concat(this.def.colName),
                    get: () => converter.convertFrom(parent.get()[this.def.colName]),
                    set: (value) => parent.get()[this.def.colName] = converter.convertTo(value),
                }
        }

        return super._evaluate(parent, dimension);
    }

    protected _getValue(a: PropertyAccessor<any>, opts ?: PropertyAccessorOptions): any {
        const val = a.get(opts)?.M;
        if (typeof val !== "undefined") return val;

        if (def(opts?.generate, false)) {
            a.set({M: {}}, opts);
            return {M: {}};
        }

        if (def(opts?.throwIfNotFound, false)) {
            throw ""
        }

        return undefined;

    }
}