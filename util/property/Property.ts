import {req} from "../Req";

export type PropertyAccessorOptions = {
    // Default for GET() = FALSE
    // Default for SET() = TRUE
    generate?: boolean,

    // Default is always FALSE.
    throwIfNotFound?: boolean
}

export interface PropertyAccessor<T> {
    readonly path: string[],
    readonly get: (opts ?: PropertyAccessorOptions) => T | undefined,
    readonly set: (value: T | undefined, opts ?: PropertyAccessorOptions) => void,
}

export interface PropertyChain {
    readonly path: string[],
    readonly get: (opts ?: PropertyAccessorOptions) => any,
}

export abstract class Property<R extends object, T> {

    public readonly propertyRoot?: Property<R, any>;

    protected constructor(propertyRoot?: Property<R, any>) {
        this.propertyRoot = propertyRoot;
    }

    public evaluate(root: R, dimension: symbol): PropertyAccessor<any> {
        const parent = this.evaluateRoot(root, dimension);
        return this._evaluate(parent, dimension);
    }

    protected evaluateRoot(root: R, dimension: symbol): PropertyChain {
        if (typeof this.propertyRoot === "undefined") {
            return {
                path: [],
                get: () => (root as any)
            }
        } else {
            const parent = this.propertyRoot.evaluate(root, dimension);
            return {
                path: parent.path,
                get: (opts) => this._getValue(parent, opts)
            }
        }
    }

    protected abstract _getValue(a: PropertyAccessor<any>, opts ?: PropertyAccessorOptions): any;

    protected _evaluate(parent: PropertyChain, dimension: symbol): PropertyAccessor<any> {
        // If no subclass handled this dimension, then skip this step.
        // return {
        //     path: parent.path,
        //     get: (opts) => parent.get(opts),
        // set: (value, opts) => parent.s
        // }
        return req(this.propertyRoot).evaluate({} as R, dimension);
    }

}
