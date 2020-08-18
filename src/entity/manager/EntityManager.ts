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
 * General config object for the EntityManager.
 */
export type EntityManagerConfig = {

    /** A user name to identify who is making the updates. */
    userName: string,

    /** The table name. */
    tableName: string,

    /** A custom path generator. */
    pathGenerator: PathGenerator,
};

/**
 *
 */
export class EntityManager {

    /** Global config as a fallback for all Entity manager instances. */
    public static GLOBAL_CONFIG ?: Partial<EntityManagerConfig>;

    /** The technical column that is used to match the db item with the model  */
    public static TYPE_COLUMN = {name: "$type", converter: StringConverter};

    private static CB: EntityManagerCallbackChain = new DefaultEntityManagerCallback();

    /**
     * The config of this entity manager.
     * This is the actual configuration that is used (it only contains default from GLOBAL_CONFIG).
     */
    public readonly config: EntityManagerConfig;

    /** The session manager keeps track of all the database calls made by this Entity manager instance. */
    public readonly sessionManager: SessionManager;

    private constructor(config?: Partial<EntityManagerConfig>) {
        this.config = {
            userName: req(config?.userName || EntityManager.GLOBAL_CONFIG?.userName, `Missing user name in config.`),
            tableName: req(config?.tableName || EntityManager.GLOBAL_CONFIG?.tableName, `Missing table name in config.`),
            pathGenerator: def(config?.pathGenerator || EntityManager.GLOBAL_CONFIG?.pathGenerator, new PathToRegexpPathGenerator()),
        }
        this.sessionManager = new SessionManager();
    }

    public static get(config?: Partial<EntityManagerConfig>): EntityManager {
        return new EntityManager(config);
    }

    /**
     * Registers a callback in the callback chain.
     * This is designed to be used by other frameworks to extend the entity manager.
     */
    public static registerCallback(handler: EntityManagerCallback) {
        this.CB = new EntityManagerCallbackNotifier(handler, this.CB);
    }

    /***************************************************************************************
     * CRUD OPERATIONS
     ***************************************************************************************/

    /**
     * Gets the entity that matches the Id values of the given entity.
     *
     * If the given entity's type configuration has a KeyPath configured,
     * then the Id values will first be compiled before querying the database.
     *
     * @param entity The entity to fetch.
     *
     * @throws Error if a required Id is not set.
     *
     * @return A new entity instance containing the database values.
     */
    public getItem<E extends object>(entity: E): Promise<E> {
        const key = new AttributeMapper();
        const record = EntityManager.internal(entity);

        // Compile the key paths into their id columns.
        record.compileKeys(this.config.pathGenerator);

        // Map the ID columns onto the DynamoDB request.
        record.forEachId((id, value) => {
            key.setValue(id, value);
        }, true);

        return EntityManager.CB.getItem(this, record, key);
    }

    /**
     * Creates the given entity in the database.
     *
     * This is an exclusive create function and will fail if the item already exists.
     *
     * @param entity The entity to create.
     *
     * @throws Error if the item already exists.
     * @throws Error if an internal field is set.
     * @throws Error if a required Id is not set.
     * @throws Error if a required Column is not set.
     *
     * @return A new entity instance containing the database values.
     */
    public createItem<E extends object>(entity: E): Promise<E> {
        const item = new AttributeMapper();
        const expected = new ExpectedMapper();
        const record = EntityManager.internal(entity);

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
        }, true);

        // Validates that the required columns have a value,
        // and extract the columns that contain a value.
        record.forEachCol((col, value, valueIsSet) => {
            if (valueIsSet) item.setValue(col, value);
        }, true);

        // Set the $type column
        item.setValue(EntityManager.TYPE_COLUMN, record.entityType.def.name);

        return EntityManager.CB.putItem(this, record, item, expected);
    }

    /**
     * Deletes the entity that matches the Id values of the given entity.
     *
     * If the given entity's type configuration has a KeyPath configured,
     * then the Id values will first be compiled before querying the database.
     *
     * @param entity The entity to delete.
     *
     * @throws Error if an internal field is changed.
     * @throws Error if a required Id is not set.
     * @throws Error if a required Column is not set.
     *
     * @return A new entity instance containing the deleted item.
     */
    public deleteItem<E extends object>(entity: E): Promise<E> {
        const key = new AttributeMapper();
        const expected = new ExpectedMapper();
        const record = EntityManager.internal(entity);

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
     * Updates the given entity in the database.
     *
     * This will completely override the item in the database with the values of the given entity.
     *
     * @param entity            The new version of the entity to update.
     * @param expectedEntity    The old version of the entity that we currently expect to be in the database.
     *                          Not all fields need to be populated, only the fields that are set are verified.
     *
     * @throws Error if the item does not exist.
     * @throws Error if an internal field is changed.
     * @throws Error if a required Id is not set.
     * @throws Error if a required Column is not set.
     * @throws Error if an expected value does not match with the database value.
     * @throws Error if the entity type of the given entity and expected entity are not the same.
     *
     * @return A new entity instance containing the new updated item.
     */
    public async updateItem<E extends object>(entity: E, expectedEntity ?: E): Promise<E> {
        const record = EntityManager.internal(entity);
        const expected = EntityManager.internal(expectedEntity || EntityManager.load(record.entityType));

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
     * @internal If you need to load a new entity from the database, it is preferred to use getItem() instead.
     *
     * @param entityType    The entity type to create.
     * @param data          The DynamoDB item data.
     *
     * @throws Error if the DB Row type and Entity type don't match.
     *
     * @return A new entity instance containing the given attribute values.
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
     * Tests if the given entity is a managed entity.
     * A managed entity is an entity that is first loaded by the Entity Manager,
     * and is enhanced with some additional technical methods needed by the Entity Manager.
     *
     * @param entity The entity instance to test.
     *
     * @see EntityManager#load
     * @return The same entity type-casted as Entity Proxy if managed.
     */
    public static isManaged<E extends object>(entity: E): entity is EntityProxy<E> {
        return (entity as EntityProxy<E>).entityType !== undefined;
    }

    /**
     * Casts the given entity to a managed entity, if the entity instance is actually managed.
     *
     * @param entity The entity instance to cast.
     *
     * @throws Error if the given entity instance is not a managed instance.
     *
     * @see EntityManager#load
     * @see EntityManager#isManaged
     * @return The same entity type-casted as Entity Proxy if managed.
     */
    public static internal<X extends object>(entity: X): EntityProxy<X> {
        if (this.isManaged(entity)) return entity;
        throw new Error(`Entity ${entity.constructor} is not a managed entity. Load it in the entity manager first.`);
    }

    /**
     * Loads the given entity type into a managed entity instance.
     * Every entity type should first be loaded before it can be used in any of the Entity Manager's CRUD operations.
     *
     * @param entityType The entity type to load.
     *
     * @see EntityManager#getEntityType
     * @return A new managed entity instance.
     */
    public static load<X extends object>(entityType: string | Class<X> | EntityType<X>): EntityProxy<X> {
        const type = (typeof entityType === "function" || typeof entityType === "string")
            ? EntityManager.getEntityType(entityType) : entityType;
        return new (createEntityProxy(type))();
    }

    /**
     * Gets the entity type from the given entity information.
     *
     * @param entity    The entity can be
     *                   - the entity type name defined in the @Entity annotation
     *                   - the entity model class (constructor)
     *                   - a DynamoDB item (attribute map)
     *
     * @throws Error if no entity type could be found.
     *
     * @see Entity
     * @see ENTITY_DEF
     * @see ENTITY_REPO
     * @return The entity type if found.
     */
    public static getEntityType<E extends object = any>(entity: string | Class<E> | Function | DynamoDB.AttributeMap): EntityType<E> {
        if (typeof entity === "string") {
            return req(ENTITY_REPO.get(entity), `Invalid entity type name ${entity}.`);
        } else if (typeof entity === "function") {
            return req(ENTITY_DEF.get(entity), `Invalid entity type ${entity}.`);
        } else {
            const item = new AttributeMapper(entity);
            const type = item.getRequiredValue(EntityManager.TYPE_COLUMN);
            return req(ENTITY_REPO.get(type), `Invalid entity type name ${entity}.`);
        }
    }

}