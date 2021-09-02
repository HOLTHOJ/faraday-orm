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

import {AttributeMapper} from "../util/mapper/AttributeMapper";
import {StringConverter} from "../converter";
import {DynamoDB} from "aws-sdk";
import {req} from "../util/Req";
import {ENTITY_DEF, ENTITY_REPO} from "../annotation/Entity";
import {Class} from "../util";
import {ExpectedMapper} from "../util/mapper/ExpectedMapper";
import {PathGenerator} from "../util/KeyPath";
import {SessionConfig, SessionManager} from "./SessionManager";
import {TransactionManager} from "./TransactionManager";
import {TableDef} from "./TableConfig";
import {EntityType} from "./EntityType";
import {EntityNotFoundException} from "./EntityNotFoundException";
import {ResultSet} from "../util/ResultSet";
import {ConditionMapper} from "../util/mapper/ConditionMapper";
import {QueryInput} from "./TransactionCallback";
import {ManagedFacet} from "./ManagedFacet";
import {ManagedEntity} from "./ManagedEntity";
import {EntityManager} from "../EntityManager";

/**
 * General config object for the EntityManager.
 */
export type EntityManagerConfig = {

    /** The table name. */
    readonly tableName: string,

    /** The table definition for the table targeted by this EntityManager. */
    readonly tableDef: TableDef,

    /** A map of (pre)loaded entity definitions. Each loaded entity is described as an Entity Type. */
    readonly entityDef: Map<string, EntityType>

    /** The default path generator for this entity manager. */
    readonly pathGenerator: PathGenerator,

};

/**
 * The EntityManager that provides CRUD operations on a managed entity.
 */
export class EntityManagerImpl implements EntityManager {

    /** The technical column that is used to match the db item with the model. */
    public static readonly TYPE_COLUMN = {name: "$type", converter: StringConverter};

    /** The config for this entity manager. */
    public readonly config: EntityManagerConfig;

    /**
     * The session keeps track of all the database calls made by this Entity manager instance.
     * The session is mapped one-to-one with the Entity manager instance, so if you want to execute operations
     * in a different session (e.g. with a different user), then you need to create a new Entity manager instance.
     *
     * @quote Hibernate (documentation/src/main/asciidoc/userguide/chapters/architecture/Architecture.adoc)
     *        "In JPA nomenclature, the Session is represented by an EntityManager."
     * */
    public readonly session: SessionManager;

    /** An extendable manager that is responsible for translating the CRUD requests to raw DynamoDB requests. */
    public readonly transactionManager: TransactionManager;

    /**
     * @private Only create an EntityManager using the EntityManagerFactory.
     * @see EntityManagerFactory
     */
    public constructor(entityManagerConfig: EntityManagerConfig, sessionConfig: SessionConfig) {
        this.config = entityManagerConfig;
        this.session = new SessionManager(sessionConfig);
        this.transactionManager = new TransactionManager(this.session, this.config);
    }

    /**
     * @private Only create an EntityManager using the EntityManagerFactory.
     * @see EntityManagerFactory
     */
    public static get(entityManagerConfig: EntityManagerConfig, sessionConfig: SessionConfig): EntityManagerImpl {
        return new EntityManagerImpl(entityManagerConfig, sessionConfig);
    }


    /***************************************************************************************
     * CRUD OPERATIONS
     ***************************************************************************************/

    /**
     * Gets the record that matches the Id values of the given entity.
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
        const record = new ManagedEntity(this.getEntityType(entity.constructor), entity)
        // const record = EntityManager.internal(entity);

        // Compile the key paths into their id columns.
        record.compileKeys(this.config.pathGenerator);

        // Map the ID columns onto the DynamoDB request.
        record.forEachId((id, value) => {
            key.setValue(id, value);
        }, true);

        const result = await this.transactionManager.getItem({record, key});
        if (typeof result.Item !== "undefined") {
            return this.loadFromDB(record.entityType, result.Item).entity;
        } else {
            throw new EntityNotFoundException(record.entityType.def.name, key.toMap())
        }
    }

    /**
     * Queries a given facet query name.
     *
     * @param entity
     * @param queryName If queryName is empty, then we perform a findAll query on the DEFAULT index.
     *
     * @return An iterable result set.
     */
    public queryItem<E extends object>(entity: E, queryName?: string): ResultSet<E> {
        const mapper = new ConditionMapper();
        const defaultPathGenerator = this.config.pathGenerator;

        const facetProxy = new ManagedFacet(this.getEntityType(entity.constructor), entity, queryName);
        // const facetProxy = FacetManager.internal(entity);
        // const facetType = (typeof queryName !== "undefined")
        //     ? this.getFacetType(facetProxy.entityType, queryName)
        //     : FacetManager.getDefaultFacetType(facetProxy.entityType);

        // Compile the table keys.
        facetProxy.compileKeys(defaultPathGenerator);

        // Extract the keys into a query condition.
        facetProxy.forEachId((id, value, valueIsSet) => {
            if (id.idType === "PK") {
                mapper.eq(id, value)
            } else if (valueIsSet) {
                // mapper.apply(facetType.operation, {name: this.entityManager.tableDef.facets[id.idType], converter: id.converter}, value);
            }
        }, false);

        const queryInput: QueryInput = {
            indexName: facetProxy.facetType?.indexName,
            record: facetProxy,
            item: mapper
        };

        return new ResultSet(queryInput, this.transactionManager,
            (elt) => this.loadFromDB(facetProxy.entityType, elt).entity);
    }

    /**
     * Creates a record for the given entity in the database.
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
        const record = new ManagedEntity(this.getEntityType(entity.constructor), entity)
        // const record = EntityManager.internal(entity);

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

        // Execute callbacks before compiling the IDs.
        record.executeCallbacks("INSERT", this.session.config)

        // Compile the key paths into their ID columns.
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
        item.setValue(EntityManagerImpl.TYPE_COLUMN, record.entityType.def.name);

        await this.transactionManager.putItem(record, item, expected);
        return this.loadFromDB(record.entityType, item.toMap()).entity;
    }

    /**
     * Deletes the record that matches the Id values of the given entity.
     *
     * If the given entity has any other non-id fields set,
     * then those fields will be used as expected values.
     *
     * This allows you to verify that the record you are trying to delete
     * and the record in the database are identical, and have not been modified in the meanwhile.
     *
     * If the given entity's type configuration has a KeyPath configured,
     * then the Id values will first be compiled.
     *
     * @param entity The entity to delete.
     *
     * @throws Error if an internal field is changed.
     * @throws Error if a required Id is not set.
     * @throws Error if a required Column is not set.
     *
     * @return A new entity instance containing the deleted item.
     */
    public async deleteItem<E extends object>(entity: E): Promise<E> {
        const key = new AttributeMapper();
        const expected = new ExpectedMapper();
        const record = new ManagedEntity(this.getEntityType(entity.constructor), entity)
        // const record = EntityManager.internal(entity);

        // Set all provided fields as expected.
        record.forEachCol((col, value, valueIsSet) => {
            if (valueIsSet) expected.setValue(col, "EQ", value);
        }, true);

        // Run callbacks because they could generate partial ID columns.
        record.executeCallbacks("DELETE", this.session.config);

        // Compile the key paths into their id columns.
        record.compileKeys(this.config.pathGenerator);

        // Extract the ID columns into the DB request.
        record.forEachId((id, value) => {
            key.setValue(id, value);
        }, true);

        const data = await this.transactionManager.deleteItem(record, key, expected)
        return this.loadFromDB(record.entityType, req(data.Attributes)).entity;
    }

    /**
     * Updates the given entity in the database.
     *
     * This will completely override the record in the database with the values of the given entity.
     *
     * @param entity            The new version of the entity to update.
     * @param expectedEntity    The old version of the entity that we currently expect to be in the database.
     *                          Not all fields need to be populated, only the fields that are set will be verified.
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
        const record = new ManagedEntity(this.getEntityType(entity.constructor), entity)
        // const record = EntityManager.internal(entity);
        const expected = new ManagedEntity(expectedEntity ? this.getEntityType(expectedEntity.constructor) : record.entityType, expectedEntity);
        // const expected = EntityManager.internal(expectedEntity || this.load(record.entityType));

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
        record.executeCallbacks("UPDATE", this.session.config);

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
        item.setValue(EntityManagerImpl.TYPE_COLUMN, record.entityType.def.name);

        await this.transactionManager.updateItem(record, item, exp)
        return this.loadFromDB(record.entityType, item.toMap()).entity;
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
    public loadFromDB<E extends object>(entityType: EntityType<E>, data: DynamoDB.AttributeMap): ManagedEntity<E> {
        const item = new AttributeMapper(data);
        if (entityType.def.name !== item.getRequiredValue(EntityManagerImpl.TYPE_COLUMN)) {
            throw new Error(`Unexpected record type ${entityType}.`);
        }

        const entity = new ManagedEntity(entityType)
        // const entity = this.load(entityType);
        entity.forEachId((id) => {
            entity.setValue(id.propName, item.getValue(id));
        }, false);

        entity.forEachCol((col) => {
            const value = item.getValue(col);
            if (col.required && typeof value === "undefined") {
                throw new Error(`Required field ${col.name} not found in database record.`)
                // console.warn("Database col", col, "is required and no value was found. Loading will continue, " +
                //     "but the Entity ORM configuration is likely not (no longer) in line with the data.");
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
    public getEntityType<E extends object = any>(entity: string | Class<E> | Function | DynamoDB.AttributeMap): EntityType<E> {
        if (typeof entity === "string") {
            return req(this.config.entityDef.get(entity), `Invalid entity type name ${entity}.`);
        } else if (typeof entity === "function") {
            return req(this.config.entityDef.get(req(ENTITY_DEF.get(entity)).name), `Invalid entity type ${entity}.`);
        } else {
            const item = new AttributeMapper(entity);
            const type = item.getRequiredValue(EntityManagerImpl.TYPE_COLUMN);
            return req(this.config.entityDef.get(type), `Invalid entity type name ${entity}.`);
        }
    }

}