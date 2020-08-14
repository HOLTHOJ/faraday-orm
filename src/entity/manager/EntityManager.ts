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

import {AttributeMapper} from "../../util/AttributeMapper";
import {DBStringConverter} from "../../converter/DBStringConverter";
import {DynamoDB} from "aws-sdk";
import {req} from "../../util/Req";
import {ENTITY_DEF, ENTITY_REPO, EntityType} from "../annotation/Entity";
import {EntityProxy} from "./EntityProxy";
import {createEntityProxy} from "./EntityProxyImpl";
import {ColumnDescription} from "..";
import {Class} from "../../util/Class";
import {ExpectedMapper} from "../../util/ExpectedMapper";

/**
 *
 */
export class EntityManager<E extends object> {

    private readonly _tableName: string = "";
    private readonly _transactionLog = new Proxy(new DynamoDB(), {}); // TODO : log all request/responses.

    public static CBACK_BEFORE_COMMIT = new Array<(record: EntityProxy, item: AttributeMapper) => void>();
    public static CBACK_AFTER_COMMIT = new Array<(record: EntityProxy, item: AttributeMapper) => void>();

    public static TYPE_COLUMN: ColumnDescription<string> = {name: "$type", converter: DBStringConverter};


    /***************************************************************************************
     * CRUD OPERATIONS
     ***************************************************************************************/

    /**
     *
     *
     *
     * @param getInput
     */
    public async getItem<E extends object>(getInput: E): Promise<E> {
        const key = new AttributeMapper();
        const record = EntityManager.internal(getInput);

        // Call the GET callback to allow the entity to populate any composed index columns.
        record.executeCallbacks("GET");

        // Map the ID columns onto the DynamoDB request.
        record.forEachId((id, value) => {
            key.setValue(id, value);
        }, true);

        const input: DynamoDB.Types.GetItemInput = {
            TableName: this._tableName,
            Key: key.toMap(),
            ReturnConsumedCapacity: "TOTAL",
        };

        const data = await this._transactionLog.getItem(input).promise();
        return EntityManager.loadFromDB(record.entityType, req(data.Item, `Item not found.`));
    }

    /**
     *
     *
     *
     * @param createInput
     */
    public async createItem<E extends object>(createInput: E): Promise<E> {
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
        record.executeCallbacks("INSERT")

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

        EntityManager.CBACK_BEFORE_COMMIT.forEach(cback => cback(record, item));

        // Set the $type column
        item.setValue(EntityManager.TYPE_COLUMN, record.entityType.def.name);

        const input: DynamoDB.Types.PutItemInput = {
            TableName: this._tableName,
            Item: item.toMap(),
            Expected: expected.toMap(),
            ReturnConsumedCapacity: "TOTAL",
        };

        const data = await this._transactionLog.putItem(input).promise();
        return EntityManager.loadFromDB(record.entityType, item.toMap());
    }

    /**
     *
     *
     *
     */
    public async deleteItem<E extends object>(deleteInput: E): Promise<E> {
        const key = new AttributeMapper();
        const expected = new ExpectedMapper();
        const record = EntityManager.internal(deleteInput);

        // Set all provided fields as expected.
        record.forEachCol((col, value, valueIsSet) => {
            if (valueIsSet) expected.setValue(col, "EQ", value);
        }, true);

        // Run callbacks because they could generate ID columns.
        record.executeCallbacks("DELETE");

        // Extract the ID columns into the DB request.
        record.forEachId((id, value) => {
            key.setValue(id, value);
        }, true);

        const input: DynamoDB.Types.DeleteItemInput = {
            TableName: this._tableName,
            Key: key.toMap(),
            Expected: expected.toMap(),
            ReturnValues: "ALL_OLD",
            ReturnConsumedCapacity: "TOTAL",
        };

        const data = await this._transactionLog.deleteItem(input).promise();
        return EntityManager.loadFromDB(record.entityType, req(data.Attributes, `Item not found.`));
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

        // Maps the entity IDs and verifies that an existing DB row exists.
        record.forEachId((id, value) => {
            item.setValue(id, value);
            exp.setValue(id, "EQ", value);
        }, true);

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
        record.executeCallbacks("UPDATE");

        // Maps the column values to update the DB row.
        record.forEachCol((col, value, valueIsSet) => {
            if (valueIsSet) item.setValue(col, value);
        }, true);

        EntityManager.CBACK_BEFORE_COMMIT.forEach(cback => cback(record, item));

        // Set the $type column
        item.setValue(EntityManager.TYPE_COLUMN, record.entityType.def.name);

        const input: DynamoDB.Types.PutItemInput = {
            TableName: this._tableName,
            Item: item.toMap(),
            Expected: exp.toMap(),
            ReturnConsumedCapacity: "TOTAL",
        };

        const data = await this._transactionLog.putItem(input).promise();
        return EntityManager.loadFromDB(record.entityType, item.toMap());
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

    public static load<X extends object>(entityType: string | Class<X> | EntityType<X>): EntityProxy<X> {
        const type = (typeof entityType === "function" || typeof entityType === "string")
            ? this.getEntityType2(entityType) : entityType;
        return new (createEntityProxy(type.def.ctor, type))();
    }

    public static isManaged<E extends object>(entity: E): entity is EntityProxy<E> {
        return (entity as EntityProxy<E>).entityType !== undefined;
    }

    public static internal<X extends object>(entity: X): EntityProxy<X> {
        if (this.isManaged(entity)) return entity;
        throw new Error(`Entity ${entity.constructor} is not a managed entity. Load it in the entity manager first.`);
    }

    public static loadFromDB2(data: DynamoDB.AttributeMap): EntityProxy<object> {
        const item = new AttributeMapper(data);
        const type = item.getRequiredValue(this.TYPE_COLUMN);
        return this.loadFromDB(this.getEntityType2(type), data);
    }

    /**
     * Loads the given DynamoDB Attribute map into a managed entity of the given type.
     *
     * NOTE : This is a low-level internal function. It is therefore advised to use getItem() instead.
     *
     * @param entityType
     * @param data
     * @throws Error if the DB Row type and Entity type don't match.
     */
    public static loadFromDB<E extends object>(entityType: EntityType<E>, data: DynamoDB.AttributeMap): EntityProxy<E> {
        const item = new AttributeMapper(data);
        if (entityType.def.name !== item.getRequiredValue(this.TYPE_COLUMN)) {
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

        entity.executeCallbacks("LOAD");
        return entity;
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