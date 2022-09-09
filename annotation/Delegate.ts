import {unique} from "../util/Req";
import {Class} from "../util";

/**
 * The definition of a database column defined on an Entity class.
 */
export type DelegateDef<T extends object = any> = {

    /** Unique delegate name. Used to link the reference with the delegate type. */
    name: string,

    /** Class constructor of the delegate type. */
    ctor: Class<T>

};

export type DelegateRef<T extends object = any> = {

    /** The property name. */
    propName: string,

    /** The column name used in the database. */
    columnName: string | typeof FLATTEN | undefined,

    /** The name of the delegate that is referenced. */
    // delegateName: string
    delegateType: Class<T>,

    /** Indicates this is a required delegate. */
    required: boolean,

};

/** @internal Repository of all delegates and the constructor function on which they are defined. */
export const DELEGATE_DEF = new Map<Function, DelegateDef>();
export const DELEGATE_REPO = new Map<string, DelegateDef>();
export const DELEGATE_REF = new Map<Function, DelegateRef[]>();

/**
 * Defines a delegate type.
 *
 * @param typeName
 */
export function Delegate<D extends object>(typeName: string) {
    return (ctor: Class<D>, propertyKey: string) => {

        if (DELEGATE_DEF.has(ctor)) throw new Error(`Delegate names have to be unique.`);
        if (DELEGATE_REPO.has(typeName)) throw new Error(`Delegate names have to be unique.`);

        const delegateDef: DelegateDef<D> = {
            name: typeName,
            ctor: ctor,
        };

        DELEGATE_DEF.set(ctor, delegateDef);
        DELEGATE_REPO.set(typeName, delegateDef);
    }
}

export const FLATTEN: unique symbol = Symbol("flatten-delegate");

/**
 *
 * @param referenceType
 * @param required
 * @param columnName
 * @constructor
 */
export function Reference<D extends object>(referenceType: Class<D>, required ?: boolean, columnName?: string | typeof FLATTEN | undefined) {
    return (target: object, propertyKey: string, descriptor ?: TypedPropertyDescriptor<D>) => {

        const delegateRef: DelegateRef<D> = {
            delegateType: referenceType,
            propName: propertyKey,
            required: !!required,
            columnName: columnName,
        };

        if (DELEGATE_REF.has(target.constructor)) {
            const columns = DELEGATE_REF.get(target.constructor)!.concat(delegateRef);
            unique(columns, elt => elt.propName, true);

            DELEGATE_REF.set(target.constructor, columns);
        } else {
            DELEGATE_REF.set(target.constructor, [delegateRef]);
        }
    }
}