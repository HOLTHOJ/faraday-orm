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

import {SessionManager} from "./manager/SessionManager";
import {TransactionManager} from "./manager/TransactionManager";
import {EntityTypeProxy} from "./manager/EntityTypeProxy";
import {ResultSet} from "./util/ResultSet";
import {EntityType} from "./manager/EntityType";
import {DynamoDB} from "aws-sdk";
import {Class} from "./util";
import {ENTITY_DEF} from "./annotation/Entity";

export interface EntityManager {

    /** The technical column that is used to match the db item with the model. */
    // public static readonly TYPE_COLUMN = {name: "$type", converter: StringConverter};

    /** The config for this entity manager. */
    // readonly config: EntityManagerConfig;

    /**
     * The session keeps track of all the database calls made by this Entity manager instance.
     * The session is mapped one-to-one with the Entity manager instance, so if you want to execute operations
     * in a different session (e.g. with a different user), then you need to create a new Entity manager instance.
     *
     * @quote Hibernate (documentation/src/main/asciidoc/userguide/chapters/architecture/Architecture.adoc)
     *        "In JPA nomenclature, the Session is represented by an EntityManager."
     * */
    readonly session: SessionManager;

    /** An extendable manager that is responsible for translating the CRUD requests to raw DynamoDB requests. */
    readonly transactionManager: TransactionManager;


    /**
     * @private Only create an EntityManager using the EntityManagerFactory.
     * @see EntityManagerFactory
     */
// public static get(entityManagerConfig: EntityManagerConfig, sessionConfig: SessionConfig): EntityManagerImpl {
//     return new EntityManagerImpl(entityManagerConfig, sessionConfig);
// }

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
    getItem<E extends object>(entity: E): Promise<E>

    /**
     * Queries a given facet query name.
     *
     * @param entity
     * @param queryName If queryName is empty, then we perform a findAll query on the DEFAULT index.
     *
     * @return An iterable result set.
     */
    queryFacet<E extends object>(entity: E, queryName?: string): ResultSet<E>

    /**
     * Queries a given view query name.
     *
     * @param view
     * @param queryName
     */
    queryView<E extends object>(view: E, queryName?: string): ResultSet<E>

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
    createItem<E extends object>(entity: E): Promise<E>

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
    deleteItem<E extends object>(entity: E): Promise<E>

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
    updateItem<E extends object>(entity: E, expectedEntity ?: E): Promise<E>

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
    loadEntityFromDB<E extends object>(entityType: EntityType<E>, data: DynamoDB.AttributeMap): EntityTypeProxy<E>

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
    getEntityType<E extends object = any>(entity: string | Class<E> | Function | DynamoDB.AttributeMap): EntityType<E>

}