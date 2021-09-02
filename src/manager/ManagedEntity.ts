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

import {CallbackOperation, ColumnDef} from "../entity";
import {UNDEFINED} from "../util";
import {def, req} from "../util/Req";
import {PathGenerator} from "../util/KeyPath";
import {SessionConfig} from "./SessionManager";
import {IdColumnDef} from "../annotation/Id";
import {EntityType} from "./EntityType";

/**
 * @internal Implementation of the EntityProxyMethods.
 */
export class ManagedEntity<E extends object> {

    /** The entity instance that is managed. */
    public readonly entity: E

    /** The entity type configuration. */
    public readonly entityType: EntityType<E>

    constructor(entityType: EntityType<E>, entity ?: E) {
        this.entity = def(entity, new entityType.def.ctor())
        this.entityType = entityType
    }

    public getValue(propName: PropertyKey): any {
        return (this.entity as any)[propName];
    };

    public setValue(propName: PropertyKey, value: any): void {
        (this.entity as any)[propName] = value;
    }

    /**
     * Loops over each Id defined on this entity.
     *
     * @param block             Block to execute for each Id.
     * @param validateRequired  If TRUE then each Id column will be validated that it contains a value.
     */
    public forEachId(block: (id: IdColumnDef, value: any, valueIsSet: boolean) => void, validateRequired: boolean = true): void {
        const pk = this.entityType.pk;
        const pkValue = this.getValue(pk.propName);
        if (validateRequired && pkValue === UNDEFINED) {
            throw new Error(`Missing required field ${pk.propName}.`);
        }
        block(pk, pkValue, pkValue !== UNDEFINED);

        const sk = this.entityType.sk;
        if (sk) {
            const skValue = this.getValue(sk.propName);
            if (validateRequired && skValue === UNDEFINED) {
                throw new Error(`Missing required field ${sk.propName}.`);
            }
            block(sk, skValue, skValue !== UNDEFINED);
        }
    };

    /**
     * Loops over each Column defined on this entity (including @Internal columns).
     *
     * @param block             Block to execute for each Id.
     * @param validateRequired  If TRUE then each required column will be validated that it contains a value.
     */
    public forEachCol<E>(block: (col: ColumnDef, value: any | undefined, valueIsSet: boolean) => void | boolean, validateRequired: boolean = true): void {
        this.entityType.cols.some(col => {
            const value = this.getValue(col.propName);
            if (validateRequired && col.required && value === UNDEFINED) {
                throw new Error(`Missing required field ${col.propName}.`);
            }

            return block(col, value, value !== UNDEFINED);
        });
    }

    /**
     * Executes all the entity's callback functions in reverse order.
     * This means that the callback function of the most parent class will be called first.
     *
     * @param operation
     * @param config
     */
    public executeCallbacks<E>(operation: CallbackOperation, config: SessionConfig) {
        this.entityType.cbs.forEach(cback => {
            this.getValue(cback.propName).call(this.entity, operation, config);
        });
    }

    /**
     * Compiles the key paths using this Entity instance and populates their resp. properties.
     *
     * @param defaultPathGenerator  This Path generator will be used if the entity definition
     *                              did not define a Path generator itself.
     */
    public compileKeys(defaultPathGenerator: PathGenerator): void {
        if (typeof this.entityType.keyPath === "undefined") return;

        const pkPath = this.entityType.keyPath.pkPath;
        const skPath = this.entityType.keyPath.skPath;
        const pathGenerator = this.entityType.keyPath.pathGenerator || defaultPathGenerator;

        const pkCol = this.entityType.pk;
        const pkValue = pathGenerator.compile(this.entity, req(pkPath));
        this.setValue(pkCol.propName, pkValue);

        if (this.entityType.sk) {
            const skCol = this.entityType.sk;
            const skValue = pathGenerator.compile(this.entity, req(skPath));
            this.setValue(skCol.propName, skValue);
        }
    }

    /**
     * Parses the key paths using this Entity instance and populates their resp. properties.
     *
     * @param defaultPathGenerator  This Path generator will be used if the entity definition
     *                              did not define a Path generator itself.
     */
    public parseKeys(defaultPathGenerator: PathGenerator): void {
        if (!this.entityType.keyPath) return;

        const pkPath = this.entityType.keyPath.pkPath;
        const skPath = this.entityType.keyPath.skPath;
        const pathGenerator = this.entityType.keyPath.pathGenerator || defaultPathGenerator;

        if (this.entityType.pk) {
            const pkCol = this.entityType.pk;
            const pkValue = this.getValue(pkCol.propName);
            const decompiledFields = pathGenerator.parse(pkValue, req(pkPath));
            Object.entries(decompiledFields).forEach(([key, val]) => {
                this.setValue(key, val);
            })
        }

        if (this.entityType.sk) {
            const skCol = req(this.entityType.sk);
            const skValue = this.getValue(skCol.propName);
            const decompiledFields = pathGenerator.parse(skValue, req(skPath));
            Object.entries(decompiledFields).forEach(([key, val]) => {
                this.setValue(key, val);
            })
        }
    }

}