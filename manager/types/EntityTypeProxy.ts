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

import {CallbackOperation} from "../../entity/index";
import {UNDEFINED} from "../../util";
import {def} from "../../util/Req";
import {PathGenerator} from "../../util/KeyPath";
import {SessionConfig} from "../SessionManager";
import {EntityType} from "./EntityType";
import {EntityKeyProxy} from "./EntityKeyProxy";
import {OBJECT_DIM, ObjectProperty} from "../../util/property/ObjectProperty";
import {IdColumnProperty} from "../../util/property/IdColumnProperty";
import {EntityColumnProperty} from "../../util/property/EntityColumnProperty";

/**
 * @internal Implementation of the EntityProxyMethods.
 */
export class EntityTypeProxy<E extends object = any> {

    /** The entity instance that is managed. */
    public readonly entity: E

    /** The entity type configuration. */
    public readonly entityType: EntityType<E>

    /** */
    public readonly entityKey: EntityKeyProxy<any>;

    constructor(entityType: EntityType<E>, entity ?: E) {
        this.entityType = entityType;
        this.entity = def(entity, new entityType.def.ctor());
        this.entityKey = new EntityKeyProxy<any>(entityType.key, this.entity);
    }

    public setValue<T>(prop: ObjectProperty<E, T>, value: T) {
        prop.evaluate(this.entity, OBJECT_DIM).set(value, {generate: true, throwIfNotFound: false});
    }

    public getValue<T>(prop: ObjectProperty<E, T>): T {
        return prop.evaluate(this.entity, OBJECT_DIM).get({generate: false, throwIfNotFound: false});
    }

    /**
     * Loops over each Id defined on this entity.
     *
     * @param block             Block to execute for each Id.
     * @param validateRequired  If TRUE then each Id column will be validated that it contains a value.
     */
    public forEachId(block: (id: IdColumnProperty<E>, value: any, valueIsSet: boolean) => void, validateRequired: boolean = true): void {
        this.entityKey.forEachId(block, validateRequired);
    };

    /**
     * Loops over each Column defined on this entity (including @Internal columns).
     *
     * @param block             Block to execute for each Id.
     * @param validateRequired  If TRUE then each required column will be validated that it contains a value.
     */
    public forEachCol(block: <T>(col: EntityColumnProperty<E, T>, value: T | undefined, valueIsSet: boolean) => void | boolean, validateRequired: boolean = true): void {
        this.entityType.cols.forEach(col => {
            // const value = col.getPropertyValue(this.entity);
            const value = this.getValue(col);
            if (validateRequired && col.def.required && value === UNDEFINED) {
                throw new Error(`Missing required field ${col.def.propName}.`);
            }

            block(col, value, value !== UNDEFINED);
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
        // this.entityType.cbs.forEach(cback => {
        //     this.getValue(cback.propName).call(this.entity, operation, config);
        // });
        this.entityType.cbs.forEach(cback => {
            this.getValue(cback).call(this.entity, operation, config);
            // cback.getPropertyValue(this.entity).call(this.entity, operation, config);
        });
    }

    /**
     * Compiles the key paths using this Entity instance and populates their resp. properties.
     *
     * @param defaultPathGenerator  This Path generator will be used if the entity definition
     *                              did not define a Path generator itself.
     */
    public compileKeys(defaultPathGenerator: PathGenerator): void {
        this.entityKey.compileKeys(defaultPathGenerator);
    }

    /**
     * Parses the key paths using this Entity instance and populates their resp. properties.
     *
     * @param defaultPathGenerator  This Path generator will be used if the entity definition
     *                              did not define a Path generator itself.
     */
    public parseKeys(defaultPathGenerator: PathGenerator): void {
        this.entityKey.parseKeys(defaultPathGenerator);
    }

}