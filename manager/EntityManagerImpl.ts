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
import {StringConverter} from "../converter/index";
import {DynamoDB} from "aws-sdk";
import {req} from "../util/Req";
import {ENTITY_DEF, ENTITY_REPO} from "../annotation/Entity";
import {Class} from "../util/index";
import {ExpectedMapper} from "../util/mapper/ExpectedMapper";
import {PathGenerator} from "../util/KeyPath";
import {SessionConfig, SessionManager} from "./SessionManager";
import {TransactionManager} from "./TransactionManager";
import {TableDef} from "./TableConfig";
import {EntityType} from "./types/EntityType";
import {EntityNotFoundException} from "./EntityNotFoundException";
import {ResultSet} from "../util/ResultSet";
import {FacetTypeProxy} from "./types/FacetTypeProxy";
import {EntityManager} from "../EntityManager";
import {ViewTypeProxy} from "./types/ViewTypeProxy";
import {ViewType} from "./types/ViewType";
import {VIEW_DEF} from "../view/annotation/View";
import {EntityTypeProxy} from "./types/EntityTypeProxy";
import {ViewTypeQueryProxy} from "./types/ViewTypeQueryProxy";
import {ViewTypeSourceProxy} from "./types/ViewTypeSourceProxy";
import {EntityKey} from "./types/EntityKey";
import {EntityKeyProxy} from "./types/EntityKeyProxy";
import {DelegateType} from "./types/DelegateType";
import {ColumnDef} from "../annotation/Column";
import {KeyConditionMapper} from "../util/mapper/KeyConditionMapper";
import {IdColumnProperty} from "../util/property/IdColumnProperty";
import {EntityColumnProperty} from "../util/property/EntityColumnProperty";

/**
 * General config object for the EntityManager.
 */
export type EntityManagerConfig = {

    /** The table name. */
    readonly tableName: string,

    /** The table definition for the table targeted by this EntityManager. */
    readonly tableDef: TableDef,

    /** A map of (pre)loaded entity key definitions. */
    readonly entityKeyDef: Map<Function, EntityKey>

    /** A map of (pre)loaded entity definitions. Each loaded entity is described as an Entity Type. */
    readonly entityDef: Map<string, EntityType>

    readonly delegateDef: Map<Function, DelegateType>

    /** A map of (pre)loaded view definitions. Each loaded view is described as a View Type. */
    readonly viewDef: Map<string, ViewType>

    /** The default path generator for this entity manager. */
    readonly pathGenerator: PathGenerator,

};

/**
 * The EntityManager that provides CRUD operations on a managed entity.
 */
export class EntityManagerImpl implements EntityManager {

    /** The technical column that is used to match the db item with the model. */
    public static readonly TYPE_COLUMN: ColumnDef<string> = {
        propName: "$type", colName: "$type",
        required: true, internal: true,
        converter: StringConverter,
    };

    /** */
    public static readonly TYPE_COLUMN_REF = new EntityColumnProperty(EntityManagerImpl.TYPE_COLUMN);

    /** The config for this entity manager. */
    public readonly config: EntityManagerConfig;

    /**
     * The session keeps track of all the database calls made by this Entity manager instance.
     * The session is mapped one-to-one with the Entity manager instance, so if you want to execute operations
     * in a different session (e.g. with a different user), then you need to create a new EntityManager instance.
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

        console.debug("Created EntityManager with config", this.config);
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
        const keyRecord = new EntityKeyProxy(this.getEntityKey(entity.constructor), entity)

        // Compile the key paths into their id columns.
        keyRecord.compileKeys(this.config.pathGenerator);

        // Map the ID columns onto the DynamoDB request.
        keyRecord.forEachId((id, value) => {
            key.setValue(id, value);
        }, true);

        const result = await this.session.getItem({
            TableName: this.config.tableName,
            Key: key.toMap(),
        });

        // const result = await this.transactionManager.getItem({keyRecord, key});
        if (typeof result.Item !== "undefined") {
            const entityProxy = this.loadEntityFromDB<E>(result.Item);
            if (entityProxy.entityKey.keyType !== keyRecord.keyType) {
                console.warn("The returned entity type does not match with the key type.");
            }

            return entityProxy.entity;
        } else {
            throw new EntityNotFoundException(keyRecord.keyType.def.ctor.name, key.toMap())
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
    public queryFacet<E extends object>(entity: E, queryName?: string): ResultSet<E> {

        const mapper = new KeyConditionMapper();
        const facetProxy = new FacetTypeProxy(this.getEntityType(entity.constructor), entity, queryName);
        console.info(`Querying facet ${queryName} on entity ${facetProxy.entityType.def.name}.`);
        console.debug("Using entity type", facetProxy.entityType);
        console.debug("Using facet type", facetProxy.facetType);
        console.debug("Using facet data", facetProxy.entity);

        // Compile the table keys.
        facetProxy.compileKeys(this.config.pathGenerator);
        console.debug("Compiled facet keys", facetProxy.entity);

        // Extract the keys into a query condition.
        facetProxy.forEachId((id, value, valueIsSet) => {
            if (id.def.idType === "PK") {
                console.debug("Setting PK", id, value);
                mapper.eq(id, value)
            } else if (valueIsSet) {
                console.debug("Setting LSI", id, value);
                mapper.apply(req(facetProxy.facetType).def.operation, id, value);
            }
        }, false);

        const queryInput: DynamoDB.Types.QueryInput = {
            TableName: this.config.tableName,
            IndexName: facetProxy.facetType?.indexName,
            // KeyConditions: mapper.toMap(),
            KeyConditionExpression: mapper.expression,
            ExpressionAttributeNames: mapper.expressionAttributes.names,
            ExpressionAttributeValues: mapper.expressionAttributes.values,
        };

        console.debug("Creating result set for query input", queryInput);
        return new ResultSet(queryInput, this.session, (elt) => this.loadEntityFromDB<E>(/*facetProxy.entityType, */elt).entity);
    }

    /**
     * Queries a given facet query name.
     *
     * @param view
     * @param queryName If queryName is empty, then we perform a findAll query on the DEFAULT index.
     *
     * @return An iterable result set.
     */
    public queryView<E extends object>(view: E, queryName?: string, order?: "ASC" | "DESC"): ResultSet<E> {
        const mapper = new KeyConditionMapper();
        const viewProxy = new ViewTypeQueryProxy(this.getViewType(view.constructor), view, queryName);

        // Compile the table keys.
        viewProxy.compileKeys(this.config.pathGenerator);

        // Extract the keys into a query condition.
        viewProxy.forEachId((id, value, valueIsSet) => {
            if (id.def.idType === "PK") {
                mapper.eq(id, value)
            } else if (valueIsSet) {
                mapper.apply(req(viewProxy.query).operation, id, value);
            }
        }, false);

        const queryInput: DynamoDB.QueryInput = {
            TableName: this.config.tableName,
            IndexName: viewProxy.viewType.indexName,
            ScanIndexForward: order !== "DESC",
            // KeyConditions: mapper.toMap(),
            KeyConditionExpression: mapper.expression,
            ExpressionAttributeNames: mapper.expressionAttributes.names,
            ExpressionAttributeValues: mapper.expressionAttributes.values,
        };

        return new ResultSet(queryInput, this.session, (elt) => this.loadViewFromDB(viewProxy.viewType, elt).view);
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
        const record = new EntityTypeProxy(this.getEntityType(entity.constructor), entity)

        // Verify that none of the internal fields are set.
        record.forEachCol((col, value, valueIsSet) => {
            if (valueIsSet && col.def.internal) {
                throw new Error(`Not allowed to set internal field ${col.def.propName}.`);
            }
        }, false)

        // Generate default values before calling callbacks.
        record.forEachCol((col, value, valueIsSet) => {
            if (!valueIsSet && typeof col.def.defaultValue === "function") {
                // col.setColumnValue(record.entity, col.def.defaultValue());
                record.setValue(col, col.def.defaultValue());
            }
        }, false);

        // Execute callbacks before compiling the IDs.
        record.executeCallbacks("INSERT", this.session.config)

        // Compile the key paths into their ID columns.
        record.compileKeys(this.config.pathGenerator);

        // Extract the ID columns into the DB request.
        // Add the ID columns to the expected map to ensure they are unique/new.
        record.forEachId((id, value) => {
            item.setValue(id, value);
            expected.setExists(id, false);
        }, true);

        // Validates that the required columns have a value,
        // and extract the columns that contain a value.
        record.forEachCol((col, value, valueIsSet) => {
            if (valueIsSet) item.setValue(col, value);
        }, true);

        // Set the $type column
        item.setValue(EntityManagerImpl.TYPE_COLUMN_REF, record.entityType.def.name);

        console.log("PutItem", item.toMap());

        await this.session.putItem({
            TableName: this.config.tableName,
            Item: item.toMap(),
            // Expected: expected.toMap(),
            ConditionExpression: expected.expression,
            ExpressionAttributeNames: expected.expressionAttributes.names,
            ExpressionAttributeValues: expected.expressionAttributes.values,
        });

        // await this.transactionManager.putItem(record, item, expected);
        return this.loadEntityFromDB<E>(/*record.entityType, */item.toMap()).entity;
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
        const record = new EntityTypeProxy(this.getEntityType(entity.constructor), entity)
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

        const data = await this.session.deleteItem({
            TableName: this.config.tableName,
            Key: key.toMap(),
            ConditionExpression: expected.expression,
            ExpressionAttributeNames: expected.expressionAttributes.names,
            ExpressionAttributeValues: expected.expressionAttributes.values,
        })

        // const data = await this.transactionManager.deleteItem(record, key, expected)
        return this.loadEntityFromDB<E>(/*record.entityType,*/ req(data.Attributes)).entity;
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
        const record = new EntityTypeProxy(this.getEntityType(entity.constructor), entity)
        const expected = expectedEntity && new EntityTypeProxy(this.getEntityType(expectedEntity.constructor), expectedEntity)

        // Validate that record & expected are the same type.
        if (typeof expected !== "undefined" && record.entityType !== expected.entityType)
            throw new Error(`Inconsistent types.`);

        const item = new AttributeMapper();
        const exp = new ExpectedMapper();

        // Non-modifiable fields should not be manually changed by the client, so we verify it at DB level.
        // - If the client sends it as-is then it will not fail as an expected value.
        // - If the client modifies this field, then the expected map will reject the update.
        // Internal fields can still be modified internally, which will happen through the callbacks after this step.
        record.forEachCol((col, value, valueIsSet) => {
            if (valueIsSet && col.def.internal) exp.setValue(col, "EQ", value);
        }, false);

        // Mark the expected record's columns (if any) as expected.
        expected?.forEachCol((col, value, valueIsSet) => {
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

        // Include this entity in its resp. views by mapping the view index columns.
        for (let value of this.config.viewDef.values()) {
            const view = new ViewTypeSourceProxy(value, record.entityType)
            if (view.loadSource(record.entity, true, this.config.pathGenerator)) {
                view.forEachId((id: IdColumnProperty<any>, value: any, valueIsSet: boolean) => {
                    if (valueIsSet) item.setValue(id, value);
                }, true)
            }
        }

        // Set the $type column
        item.setValue(EntityManagerImpl.TYPE_COLUMN_REF, record.entityType.def.name);

        // As application evolve, items can be versioned (e.g. entity/v1, entity/v2).
        // The application can then decide to upgrade the item to a new version on demand.
        // TODO : We should foresee something in the framework to distinguish a version upgrade
        //        from an actualy potentially erronous override of an Item.
        const previousItem = await this.transactionManager.updateItem(record, item, exp);
        const previousItemType = new AttributeMapper(previousItem.Attributes).getRequiredValue(EntityManagerImpl.TYPE_COLUMN_REF)
        if (record.entityType.def.name !== previousItemType) {
            console.warn(`Item was updated with another entityType; old:${previousItemType} new:${record.entityType.def.name}.`);
        }

        return this.loadEntityFromDB<E>(/*record.entityType,*/ item.toMap()).entity;
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
    public loadEntityFromDB<E extends object>(/*entityType: EntityType<E>, */data: DynamoDB.AttributeMap): EntityTypeProxy<E> {
        console.debug("Loading dynamo attribute map", data);

        const item = new AttributeMapper(data);
        const entityType = this.getEntityType(item.getRequiredValue(EntityManagerImpl.TYPE_COLUMN_REF));
        // if (entityType.def.name !== item.getRequiredValue(EntityManagerImpl.TYPE_COLUMN)) {
        //     throw new Error(`Unexpected record type ${entityType}.`);
        // }

        const entity = new EntityTypeProxy(entityType)
        entity.forEachId((id) => {
            // id.setValue(entity.entity, item.getValue(id));
            entity.setValue(id, item.getRequiredValue(id));
        }, false);

        entity.forEachCol((col) => {
            const value = item.getValue(col);
            if (col.def.required && typeof value === "undefined") {
                // throw new Error(`Required field ${col.name} not found in database record.`)
                console.warn(`Database column ${col.def.colName} is required and no value was found. Loading will continue.`);
                console.debug("The missing entity column", col);
            }
            // col.setValue(entity.entity, value);
            entity.setValue(col, value);
        }, false);

        // Parse the key paths into their decomposed columns (if any).
        entity.parseKeys(this.config.pathGenerator);

        return entity;
    }

    public loadViewFromDB<V extends object>(viewType: ViewType<V>, data: DynamoDB.AttributeMap): ViewTypeProxy<V> {
        const item = new AttributeMapper(data);
        const view: ViewTypeProxy<V> = this._loadViewProxy(viewType, data);

        // We always load the keys regardless of projected attributes.
        view.forEachId((id) => {
            view.setValue(id, item.getRequiredValue(id));
        }, false);

        return view;
    }

    private _loadViewProxy<V extends object>(viewType: ViewType<V>, data: DynamoDB.AttributeMap): ViewTypeProxy<V> {
        if (viewType.indexProjections === "ALL") {
            // If all attributes are projected, we can load the entire source into the view.
            const entityType = this.getEntityType(data);
            const view = new ViewTypeSourceProxy(viewType, entityType);

            if (typeof view.sourceDefinitions === "undefined") {
                console.warn(`Entity type: ${entityType.def.name} not defined as a source on view: ${viewType.ctor.name}.`);
            } else {
                const entity = this.loadEntityFromDB(/*entityType,*/ data);
                if (!view.loadSource(entity, false, this.config.pathGenerator)) {
                    console.warn(`Unable to load entity ${entity.entityType.def.name} as a source on view ${viewType.ctor.name}.`);
                }
            }

            return view;
        }

        if (Array.isArray(viewType.indexProjections)) {
            // If only custom attributes are projected, then load in the attributes that are annotated.
            // TODO : Only read in the columns defined in TableDef (and preload them using ViewTypeLoader) ?
            const view = new ViewTypeProxy(viewType);
            const item = new AttributeMapper(data);

            view.forEachColumn((col => {
                view.setValue(col, item.getValue(col));
            }));

            return view
        }

        return new ViewTypeProxy(viewType);
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
            const type = item.getRequiredValue(EntityManagerImpl.TYPE_COLUMN_REF);
            return req(this.config.entityDef.get(type), `Invalid entity type name ${entity}.`);
        }
    }

    public getEntityKey<K extends object = any>(entity: Class | Function): EntityKey<K> {
        if (this.config.entityKeyDef.has(entity)) {
            return req(this.config.entityKeyDef.get(entity), `Invalid entity key type ${entity}.`);
        } else {
            return this.getEntityType(entity).key;
        }
    }

    public getViewType<E extends object = any>(entity: string | Class<E> | Function | DynamoDB.AttributeMap): ViewType<E> {
        if (typeof entity === "string") {
            return req(this.config.viewDef.get(entity), `Invalid entity type name ${entity}.`);
        } else if (typeof entity === "function") {
            return req(this.config.viewDef.get(req(VIEW_DEF.get(entity)).name), `Invalid view type ${entity}.`);
        } else {
            const item = new AttributeMapper(entity);
            const type = item.getRequiredValue(EntityManagerImpl.TYPE_COLUMN_REF);
            return req(this.config.viewDef.get(type), `Invalid entity type name ${entity}.`);
        }
    }

}