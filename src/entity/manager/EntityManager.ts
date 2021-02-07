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
import {StringConverter} from "../../converter";
import {DynamoDB} from "aws-sdk";
import {def, req} from "../../util/Req";
import {ENTITY_DEF, ENTITY_REPO, EntityType} from "../annotation/Entity";
import {EntityProxy} from "./EntityProxy";
import {createEntityProxy} from "./EntityProxyImpl";
import {Class} from "../../util";
import {ExpectedMapper} from "../../util/mapper/ExpectedMapper";
import {PathToRegexpPathGenerator} from "../../util/PathToRegexpPathGenerator";
import {PathGenerator} from "../../util/KeyPath";
import {LogLevel, SessionManager} from "./SessionManager";
import {TransactionManager} from "./TransactionManager";

/**
 * General config object for the EntityManager.
 */
export type EntityManagerConfig = {

    /** A username to identify who is making the updates. */
    readonly userName: string,

    /** The table name. */
    readonly tableName: string,

    /** The default path generator for this entity manager. */
    readonly pathGenerator: PathGenerator,

    readonly logLevel: LogLevel;

};

export class EntityNotFoundException extends Error {

    constructor(entity: string, key: DynamoDB.Types.AttributeMap) {
        super(`Entity ${entity} not found for key: ${JSON.stringify(key)}.`);
    }

}

/**
 *
 */
export class EntityManager {

    /** Global config as a fallback for all Entity manager instances. */
    public static GLOBAL_CONFIG ?: Partial<EntityManagerConfig>;

    /** The technical column that is used to match the db item with the model. */
    public static TYPE_COLUMN = {name: "$type", converter: StringConverter};

    /** The config for this entity manager. */
    public readonly config: EntityManagerConfig;

    /**
     * The session keeps track of all the database calls made by this Entity manager instance.
     * The session is mapped one-to-one with the Entity manager instance.
     *
     * @quote Hibernate (documentation/src/main/asciidoc/userguide/chapters/architecture/Architecture.adoc)
     *        "In JPA nomenclature, the Session is represented by an EntityManager."
     * */
    public readonly session: SessionManager;

    /**
     *
     */
    public readonly transactionManager: TransactionManager;

    private constructor(config?: Partial<EntityManagerConfig>) {
        this.config = {
            logLevel: req(config?.logLevel || EntityManager.GLOBAL_CONFIG?.logLevel || "STATS", `Missing logLevel in config.`),
            userName: req(config?.userName || EntityManager.GLOBAL_CONFIG?.userName, `Missing user name in config.`),
            tableName: req(config?.tableName || EntityManager.GLOBAL_CONFIG?.tableName, `Missing table name in config.`),
            pathGenerator: def(config?.pathGenerator || EntityManager.GLOBAL_CONFIG?.pathGenerator, new PathToRegexpPathGenerator()),
        }
        this.session = new SessionManager(undefined, this.config.logLevel);
        this.transactionManager = new TransactionManager(this.session, this.config);
    }

    public static get(config?: Partial<EntityManagerConfig>): EntityManager {
        return new EntityManager(config);
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
    public async getItem<E extends object>(entity: E): Promise<E> {
        const key = new AttributeMapper();
        const record = EntityManager.internal(entity);

        // Compile the key paths into their id columns.
        record.compileKeys(this.config.pathGenerator);

        // Map the ID columns onto the DynamoDB request.
        record.forEachId((id, value) => {
            key.setValue(id, value);
        }, true);

        const result = await this.transactionManager.getItem({record, key});
        if (typeof result.Item !== "undefined") {
            return this.loadFromDB(record.entityType, result.Item);
        } else {
            throw new EntityNotFoundException(record.entityType.def.name, key.toMap())
        }
    }

    /**
     * Creates the given entity in the database.
     * This is an exclusive create function and will fail if the item already exists.
     *
     * @param entity The entity to create.
     *
     * @throws Error if the item already exists in the database.
     * @throws Error if an internal field is set (internal fields can only be set by callbacks).
     * @throws Error if a required Id is not set (this is evaluated after callbacks and path compilation).
     * @throws Error if a required Column is not set (this is evaluated after callbacks and path compilation).
     *
     * @return A new entity instance containing the database values.
     */
    public async createItem<E extends object>(entity: E): Promise<E> {
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

        // Execute callbacks before extracting the columns.
        record.executeCallbacks("INSERT", this.config)

        // Compile the key paths into their id columns.
        record.compileKeys(this.config.pathGenerator);

        // Extract the ID columns into the DB request.
        record.forEachId((id, value) => {
            expected.setExists(id, false);
            item.setValue(id, value);
        }, true);

        // Validates that the required columns have a value,
        // and extract the columns that contain a value.
        record.forEachCol((col, value, valueIsSet) => {
            if (valueIsSet) item.setValue(col, value);
        }, true);

        // Set the $type column
        item.setValue(EntityManager.TYPE_COLUMN, record.entityType.def.name);

        await this.transactionManager.putItem(record, item, expected);
        return this.loadFromDB(record.entityType, item.toMap());
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

        return this.transactionManager.deleteItem(record, key, expected)
            .then(data => this.loadFromDB(record.entityType, req(data.Attributes)));
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

        return this.transactionManager.updateItem(record, item, exp)
            .then(() => this.loadFromDB(record.entityType, item.toMap()));
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