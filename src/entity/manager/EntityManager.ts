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

import {AttributeMapper} from "../../util/mapper/AttributeMapper";
import {StringConverter} from "../../converter/StringConverter";
import {DynamoDB} from "aws-sdk";
import {def, req} from "../../util/Req";
import {ENTITY_DEF, ENTITY_REPO, EntityType} from "../annotation/Entity";
import {EntityProxy} from "./EntityProxy";
import {createEntityProxy} from "./EntityProxyImpl";
import {ColumnDescription} from "..";
import {Class} from "../../util/Class";
import {ExpectedMapper} from "../../util/mapper/ExpectedMapper";
import {PathToRegexpPathGenerator} from "../../util/PathToRegexpPathGenerator";
import {PathGenerator} from "../../util/KeyPath";
import {
    DefaultEntityManagerCallback,
    EntityManagerCallback,
    EntityManagerCallbackChain,
    EntityManagerCallbackNotifier
} from "./EntityManagerCallback";
import {SessionManager} from "./SessionManager";

/**
 * General config object to instantiate an EntityManager.
 */
export type EntityManagerConfig = {

    /** A user name to identify who is making the updates. */
    userName: string,

    /**
     * The table name.
     * An entity manager can only work with one table at a time.
     */
    tableName: string,

    /** A custom path generator for this entity manger only. */
    pathGenerator: PathGenerator,
};

/**
 *
 */
export class EntityManager {

    public static GLOBAL_CONFIG ?: Partial<EntityManagerConfig>;
    public static TYPE_COLUMN: ColumnDescription<string> = {name: "$type", converter: StringConverter};

    private static CB: EntityManagerCallbackChain = new DefaultEntityManagerCallback();

    public readonly config: EntityManagerConfig;
    public readonly transactionManager: SessionManager;

    private constructor(config?: Partial<EntityManagerConfig>) {
        this.config = {
            userName: req(config?.userName || EntityManager.GLOBAL_CONFIG?.userName, `Missing user name in config.`),
            tableName: req(config?.tableName || EntityManager.GLOBAL_CONFIG?.tableName, `Missing table name in config.`),
            pathGenerator: def(config?.pathGenerator || EntityManager.GLOBAL_CONFIG?.pathGenerator, new PathToRegexpPathGenerator()),
        }
        this.transactionManager = new SessionManager();
    }

    public static get(config?: Partial<EntityManagerConfig>): EntityManager {
        return new EntityManager(config);
    }

    public static registerCallback(handler: EntityManagerCallback) {
        this.CB = new EntityManagerCallbackNotifier(handler, this.CB);
    }

    /***************************************************************************************
     * CRUD OPERATIONS
     ***************************************************************************************/

    /**
     *
     *
     * @param getInput
     */
    public getItem<E extends object>(getInput: E): Promise<E> {
        const key = new AttributeMapper();
        const record = EntityManager.internal(getInput);

        // Compile the key paths into their id columns.
        record.compileKeys(this.config.pathGenerator);

        // Map the ID columns onto the DynamoDB request.
        record.forEachId((id, value) => {
            key.setValue(id, value);
        }, true);

        return EntityManager.CB.getItem(this, record, key);
    }

    /**
     *
     *
     *
     * @param createInput
     */
    public createItem<E extends object>(createInput: E): Promise<E> {
        const item = new AttributeMapper();
        const expected = new ExpectedMapper();
        const record = EntityManager.internal(createInput);

        // Verify that internal fields are not set.
        record.forEachCol((col, value, valueIsSet) => {
            if (valueIsSet && col.internal) {
                throw new Error(`Not allowed to set internal field ${col.propName}.`);
            }
        }, false)

        // Generate default values before calling callbacks.
        record.forEachCol((col, value, valueIsSet) => {
            if (!valueIsSet && col.defaultValue) {
                record.setValue(col.propName, col.defaultValue());
            }
        }, false);

        // Call callbacks before extracting the columns.
        record.executeCallbacks("INSERT", this.config)

        // Compile the key paths into their id columns.
        record.compileKeys(this.config.pathGenerator);

        // Extract the ID columns into the DB request.
        record.forEachId((id, value) => {
            expected.setExists2(id.name, false);
            item.setValue(id, value);
        });

        // Validates that the required columns have a value,
        // and extract the columns that contain a value.
        record.forEachCol((col, value, valueIsSet) => {
            if (valueIsSet) item.setValue(col, value);
        });

        // Set the $type column
        item.setValue(EntityManager.TYPE_COLUMN, record.entityType.def.name);

        return EntityManager.CB.putItem(this, record, item, expected);
    }

    /**
     *
     *
     *
     */
    public deleteItem<E extends object>(deleteInput: E): Promise<E> {
        const key = new AttributeMapper();
        const expected = new ExpectedMapper();
        const record = EntityManager.internal(deleteInput);

        // Set all provided fields as expected.
        record.forEachCol((col, value, valueIsSet) => {
            if (valueIsSet) expected.setValue(col, "EQ", value);
        }, true);

        // Run callbacks because they could generate ID columns.
        record.executeCallbacks("DELETE", this.config);

        // Compile the key paths into their id columns.
        record.compileKeys(this.config.pathGenerator);

        // Extract the ID columns into the DB request.
        record.forEachId((id, value) => {
            key.setValue(id, value);
        }, true);

        return EntityManager.CB.deleteItem(this, record, key, expected);
    }

    /**
     *
     *
     *
     */
    public async updateItem<E extends object>(updateInput: E, expectd ?: E): Promise<E> {
        const record = EntityManager.internal(updateInput);
        const expected = EntityManager.internal(expectd || EntityManager.load(record.entityType));

        // Validate that record & expected are the same type.
        if (record.entityType !== expected.entityType) throw new Error(`Inconsistent types.`);

        const item = new AttributeMapper();
        const exp = new ExpectedMapper();

        // Non-modifiable fields should not be manually changed by the client, so we verify it at DB level.
        // - If the client sends it as-is then it will not fail as an expected value.
        // - If the client modifies this field, then the expected map will reject the update.
        // Internal fields can still be modified internally, which will happen through the callbacks after this step.
        record.forEachCol((col, value, valueIsSet) => {
            if (valueIsSet && col.internal) exp.setValue(col, "EQ", value);
        }, false);

        // Mark the expected record columns as expected.
        expected.forEachCol((col, value, valueIsSet) => {
            if (valueIsSet) exp.setValue(col, "EQ", value);
        }, false)

        // Call callbacks before extracting the columns.
        record.executeCallbacks("UPDATE", this.config);

        // Compile the key paths into their id columns.
        record.compileKeys(this.config.pathGenerator);

        // Maps the entity IDs and verifies that an existing DB row exists.
        record.forEachId((id, value) => {
            item.setValue(id, value);
            exp.setValue(id, "EQ", value);
        }, true);

        // Maps the column values to update the DB row.
        record.forEachCol((col, value, valueIsSet) => {
            if (valueIsSet) item.setValue(col, value);
        }, true);

        // Set the $type column
        item.setValue(EntityManager.TYPE_COLUMN, record.entityType.def.name);

        return EntityManager.CB.updateItem(this, record, item, exp);
    }

    /**
     * Loads the given DynamoDB Attribute map into a new managed entity of the given type.
     *
     * NOTE : This is a low-level internal function.
     * If you need to load a new entity from the database, it is preferred to use getItem() instead.
     *
     * @param entityType
     * @param data
     * @throws Error if the DB Row type and Entity type don't match.
     */
    public loadFromDB<E extends object>(entityType: EntityType<E>, data: DynamoDB.AttributeMap): EntityProxy<E> {
        const item = new AttributeMapper(data);
        if (entityType.def.name !== item.getRequiredValue(EntityManager.TYPE_COLUMN)) {
            throw new Error(`Unexpected record type ${entityType}.`);
        }

        const entity = EntityManager.load(entityType);
        entity.forEachId((id) => {
            const value = item.getValue(id);
            if (id.required && typeof value === "undefined") {
                console.warn("Database id", id, "is required but no value was found. Loading will continue, " +
                    "but the Entity ORM configuration is likely not (no longer) in line with the data.");
            }
            entity.setValue(id.propName, value);
        }, false);

        entity.forEachCol((col) => {
            const value = item.getValue(col);
            if (col.required && typeof value === "undefined") {
                console.warn("Database col", col, "is required and no value was found. Loading will continue, " +
                    "but the Entity ORM configuration is likely not (no longer) in line with the data.");
            }
            entity.setValue(col.propName, value);
        }, false);

        // Parse the key paths into their id columns.
        entity.parseKeys(this.config.pathGenerator);

        return entity;
    }

    /***************************************************************************************
     * STATIC UTIL FUNCTIONS
     ***************************************************************************************/

    /**
     *
     * @param item
     */
    public static getEntityType<E extends object>(item: AttributeMapper): EntityType<E> {
        const entityTypeValue = item.getRequiredValue(EntityManager.TYPE_COLUMN);
        return this.getEntityType2<E>(entityTypeValue);
    }

    public static isManaged<E extends object>(entity: E): entity is EntityProxy<E> {
        return (entity as EntityProxy<E>).entityType !== undefined;
    }

    public static internal<X extends object>(entity: X): EntityProxy<X> {
        if (this.isManaged(entity)) return entity;
        throw new Error(`Entity ${entity.constructor} is not a managed entity. Load it in the entity manager first.`);
    }

    public loadFromDB2(data: DynamoDB.AttributeMap): EntityProxy<object> {
        const item = new AttributeMapper(data);
        const type = item.getRequiredValue(EntityManager.TYPE_COLUMN);
        return this.loadFromDB(EntityManager.getEntityType2(type), data);
    }

    /**
     *
     * @param entityType
     */
    public static load<X extends object>(entityType: string | Class<X> | EntityType<X>): EntityProxy<X> {
        const type = (typeof entityType === "function" || typeof entityType === "string")
            ? EntityManager.getEntityType2(entityType) : entityType;
        return new (createEntityProxy(type))();
    }

    /**
     *
     * @param {string | EntityDef<E>} entity
     * @return {EntityType<E>}
     */
    public static getEntityType2<E extends object = any>(entity: string | Class<E> | Function): EntityType<E> {
        if (typeof entity === "string") {
            return req(ENTITY_REPO.get(entity), `Invalid entity type name ${entity}.`);
            // } else if (typeof entity === "object") {
            //     return req(ENTITY_DEF.get(entity.constructor), `Invalid entity type ${entity}.`);
        } else {
            return req(ENTITY_DEF.get(entity), `Invalid entity type ${entity}.`);
        }
    }

}