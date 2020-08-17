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

import {EntityManager} from "./EntityManager";
import {EntityProxy} from "./EntityProxy";
import {AttributeMapper} from "../../util/AttributeMapper";
import {DynamoDB} from "aws-sdk";
import {req} from "../../util/Req";
import {ExpectedMapper} from "../../util/ExpectedMapper";

/**
 *
 */
export interface EntityManagerCallback {

    /**
     *
     * @param chain
     * @param manager
     * @param record
     * @param item
     */
    getItem<E extends object>(chain: EntityManagerCallbackChain, manager: EntityManager, record: EntityProxy<E>, item: AttributeMapper): Promise<E>;

    putItem<E extends object>(chain: EntityManagerCallbackChain, manager: EntityManager, record: EntityProxy<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<E>;

    deleteItem<E extends object>(chain: EntityManagerCallbackChain, manager: EntityManager, record: EntityProxy<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<E>;

    updateItem<E extends object>(chain: EntityManagerCallbackChain, manager: EntityManager, record: EntityProxy<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<E>

}

export interface EntityManagerCallbackChain {

    getItem<E extends object>(manager: EntityManager, record: EntityProxy<E>, item: AttributeMapper): Promise<E>;

    putItem<E extends object>(manager: EntityManager, record: EntityProxy<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<E>;

    deleteItem<E extends object>(manager: EntityManager, record: EntityProxy<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<E>;

    updateItem<E extends object>(manager: EntityManager, record: EntityProxy<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<E>;

}

export class EntityManagerCallbackNotifier implements EntityManagerCallbackChain {

    private readonly cb: EntityManagerCallback
    private readonly cbc: EntityManagerCallbackChain

    constructor(cb: EntityManagerCallback, cbc: EntityManagerCallbackChain) {
        this.cb = cb;
        this.cbc = cbc;
    }

    getItem<E extends object>(manager: EntityManager, record: EntityProxy<E>, item: AttributeMapper): Promise<E> {
        console.log("Getting item", this.cb, this.cbc);
        return this.cb.getItem(this.cbc, manager, record, item);
    }

    putItem<E extends object>(manager: EntityManager, record: EntityProxy<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<E> {
        return this.cb.putItem(this.cbc, manager, record, item, expected);
    }

    deleteItem<E extends object>(manager: EntityManager, record: EntityProxy<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<E> {
        return this.cb.deleteItem(this.cbc, manager, record, item, expected);
    }

    updateItem<E extends object>(manager: EntityManager, record: EntityProxy<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<E> {
        return this.cb.updateItem(this.cbc, manager, record, item, expected);
    }

}

export class DefaultEntityManagerCallback implements EntityManagerCallbackChain {

    async getItem<E extends object>(manager: EntityManager, record: EntityProxy<E>, item: AttributeMapper): Promise<E> {
        const input: DynamoDB.Types.GetItemInput = {
            TableName: manager.config.tableName,
            Key: item.toMap(),
            ReturnConsumedCapacity: "TOTAL",
        };

        const data = await manager.transactionManager.getItem(input).promise();
        return manager.loadFromDB(record.entityType, req(data.Item, `Item not found.`));
    }

    async putItem<E extends object>(manager: EntityManager, record: EntityProxy<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<E> {
        const input: DynamoDB.Types.PutItemInput = {
            TableName: manager.config.tableName,
            Item: item.toMap(),
            Expected: expected.toMap(),
            ReturnConsumedCapacity: "TOTAL",
        };

        const data = await manager.transactionManager.putItem(input).promise();
        return manager.loadFromDB(record.entityType, item.toMap());
    }

    async deleteItem<E extends object>(manager: EntityManager, record: EntityProxy<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<E> {
        const input: DynamoDB.Types.DeleteItemInput = {
            TableName: manager.config.tableName,
            Key: item.toMap(),
            Expected: expected.toMap(),
            ReturnValues: "ALL_OLD",
            ReturnConsumedCapacity: "TOTAL",
        };

        const data = await manager.transactionManager.deleteItem(input).promise();
        return manager.loadFromDB(record.entityType, req(data.Attributes, `Item not found.`));
    }

    async updateItem<E extends object>(manager: EntityManager, record: EntityProxy<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<E> {
        const input: DynamoDB.Types.PutItemInput = {
            TableName: manager.config.tableName,
            Item: item.toMap(),
            Expected: expected.toMap(),
            ReturnConsumedCapacity: "TOTAL",
        };

        const data = await manager.transactionManager.putItem(input).promise();
        return manager.loadFromDB(record.entityType, item.toMap());
    }
}
