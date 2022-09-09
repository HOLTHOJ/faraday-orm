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

import {UNDEFINED} from "../../util";
import {req} from "../../util/Req";
import {PathGenerator} from "../../util/KeyPath";
import {EntityKey} from "./EntityKey";
import {IdColumnProperty} from "../../util/property/IdColumnProperty";
import {Property} from "../../util/property/Property";
import {OBJECT_DIM} from "../../util/property/ObjectProperty";

/**
 */
export class EntityKeyProxy<E extends object = any> {

    /** The key instance that is managed. */
    public readonly key: E

    /** The key type configuration. */
    public readonly keyType: EntityKey<E>

    constructor(keyType: EntityKey<E>, key: E) {
        this.key = req(key)
        this.keyType = keyType
    }

    public setValue<T>(prop: Property<E, T>, value: T) {
        prop.evaluate(this.key, OBJECT_DIM).set(value, {generate: true, throwIfNotFound: false});
    }

    public getValue<T>(prop: Property<E, T>): T {
        return prop.evaluate(this.key, OBJECT_DIM).get({generate: false, throwIfNotFound: false});
    }

    // public getValue(propName: PropertyKey): any {
    //     return (this.key as any)[propName];
    // };
    //
    // public setValue(propName: PropertyKey, value: any): void {
    //     (this.key as any)[propName] = value;
    // }

    /**
     * Loops over each Id defined on this entity.
     *
     * @param block             Block to execute for each Id.
     * @param validateRequired  If TRUE then each Id column will be validated that it contains a value.
     */
    public forEachId(block: (id: IdColumnProperty<E>, value: any, valueIsSet: boolean) => void, validateRequired: boolean = true): void {
        const pk = this.keyType.pk;
        // const pkValue = pk.getPropertyValue(this.key);
        const pkValue = this.getValue(pk);
        if (validateRequired && pkValue === UNDEFINED) {
            throw new Error(`Missing required field ${pk.def.propName}.`);
        }
        block(pk, pkValue, pkValue !== UNDEFINED);

        const sk = this.keyType.sk;
        if (sk) {
            // const skValue = sk.getPropertyValue(this.key);
            const skValue = this.getValue(sk);
            if (validateRequired && skValue === UNDEFINED) {
                throw new Error(`Missing required field ${sk.def.propName}.`);
            }
            block(sk, skValue, skValue !== UNDEFINED);
        }
    };

    /**
     * Compiles the key paths using this Entity instance and populates their resp. properties.
     *
     * @param defaultPathGenerator  This Path generator will be used if the entity definition
     *                              did not define a Path generator itself.
     */
    public compileKeys(defaultPathGenerator: PathGenerator): void {
        if (typeof this.keyType.keyPath === "undefined") return;

        const pkPath = this.keyType.keyPath.pkPath;
        const skPath = this.keyType.keyPath.skPath;
        const pathGenerator = this.keyType.keyPath.pathGenerator || defaultPathGenerator;

        const pkCol = this.keyType.pk;
        const pkValue = pathGenerator.compile(this.key, req(pkPath));
        // pkCol.setPropertyValue(this.key, pkValue);
        this.setValue(pkCol, pkValue);

        if (this.keyType.sk) {
            const skCol = this.keyType.sk;
            const skValue = pathGenerator.compile(this.key, req(skPath));
            // skCol.setPropertyValue(this.key, skValue);
            this.setValue(skCol, skValue);
        }
    }

    /**
     * Parses the key paths using this Entity instance and populates their resp. properties.
     *
     * @param defaultPathGenerator  This Path generator will be used if the entity definition
     *                              did not define a Path generator itself.
     */
    public parseKeys(defaultPathGenerator: PathGenerator): void {
        if (typeof this.keyType.keyPath === "undefined") return;

        const pkPath = this.keyType.keyPath.pkPath;
        const skPath = this.keyType.keyPath.skPath;
        const pathGenerator = this.keyType.keyPath.pathGenerator || defaultPathGenerator;

        if (this.keyType.pk) {
            const pkCol = this.keyType.pk as Property<E, string>;
            // const pkValue = pkCol.getPropertyValue(this.key);
            const pkValue = this.getValue(pkCol);
            const decompiledFields = pathGenerator.parse(pkValue, req(pkPath));
            Object.entries(decompiledFields).forEach(([key, val]) => {
                (this.key as any)[key] = val;
                // this.setValue(key, val);
            })
        }

        if (this.keyType.sk) {
            const skCol = req(this.keyType.sk) as Property<E, string>;
            // const skValue = skCol.getPropertyValue(this.key);
            const skValue = this.getValue(skCol);
            const decompiledFields = pathGenerator.parse(skValue, req(skPath));
            Object.entries(decompiledFields).forEach(([key, val]) => {
                // TODO : This should be a valid registered property.
                // But the property is likely not annotated on the KeyType, so it only exists at runtime.
                (this.key as any)[key] = val;
                // this.setValue(key, val);
            })
        }
    }

}