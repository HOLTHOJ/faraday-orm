import {def} from "../Req";
import {Property, PropertyAccessor, PropertyAccessorOptions, PropertyChain} from "./Property";

export const OBJECT_DIM: unique symbol = Symbol("OBJECT_DIM");

export type PropertyDef = {
    propName: string
}

export class ObjectProperty<R extends object, T> extends Property<R, T> {

    public readonly def: PropertyDef

    constructor(def: PropertyDef, propertyRoot?: Property<R, any>) {
        super(propertyRoot);
        this.def = def
    }

    public evaluate(root: R, dimension: typeof OBJECT_DIM): PropertyAccessor<any>
    public evaluate(root: R, dimension: symbol): PropertyAccessor<any>
    public evaluate(root: any, dimension: symbol): PropertyAccessor<any> {
        return super.evaluate(root, dimension);
    }

    protected _evaluate(parent: PropertyChain, dimension: symbol): PropertyAccessor<any> {
        if (dimension === OBJECT_DIM) {
            return {
                path: parent.path.concat(this.def.propName),
                get: () => parent.get()[this.def.propName],
                set: (value) => parent.get()[this.def.propName] = value,
            }
        } else {
            return super._evaluate(parent, dimension);
        }
    }

    protected _getValue(a: PropertyAccessor<any>, opts ?: PropertyAccessorOptions): any {
        const val = a.get(opts);
        if (typeof val !== "undefined") return val;

        if (def(opts?.generate, false)) {
            a.set({}, opts);
            return {};
        }

        if (def(opts?.throwIfNotFound, false)) {
            throw ""
        }

        return undefined;

    }

}
