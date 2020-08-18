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
import {AttributeMapper} from "../../util/mapper/AttributeMapper";
import {ExpectedMapper} from "../../util/mapper/ExpectedMapper";
import {DynamoDB} from "aws-sdk";
import {req} from "../../util/Req";
import {TransactionManagerCallback, TransactionManagerCallbackChain} from "./TransactionManagerCallback";

/**
 * The default transaction manager. This will always be the inner-most manager to be executed.
 * This manager will make the actual DynamoDB call and parses the result back into an entity instance.
 */
export class DefaultTransactionManager implements TransactionManagerCallbackChain {

    async getItem<E extends object>(manager: EntityManager, record: EntityProxy<E>, item: AttributeMapper): Promise<E> {
        const input: DynamoDB.Types.GetItemInput = {
            TableName: manager.config.tableName,
            Key: item.toMap(),
            ReturnConsumedCapacity: "TOTAL",
        };

        const data = await manager.sessionManager.getItem(input).promise();
        return manager.loadFromDB(record.entityType, req(data.Item, `Item not found.`));
    }

    async putItem<E extends object>(manager: EntityManager, record: EntityProxy<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<E> {
        const input: DynamoDB.Types.PutItemInput = {
            TableName: manager.config.tableName,
            Item: item.toMap(),
            Expected: expected.toMap(),
            ReturnConsumedCapacity: "TOTAL",
        };

        const data = await manager.sessionManager.putItem(input).promise();
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

        const data = await manager.sessionManager.deleteItem(input).promise();
        return manager.loadFromDB(record.entityType, req(data.Attributes, `Item not found.`));
    }

    async updateItem<E extends object>(manager: EntityManager, record: EntityProxy<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<E> {
        const input: DynamoDB.Types.PutItemInput = {
            TableName: manager.config.tableName,
            Item: item.toMap(),
            Expected: expected.toMap(),
            ReturnConsumedCapacity: "TOTAL",
        };

        const data = await manager.sessionManager.putItem(input).promise();
        return manager.loadFromDB(record.entityType, item.toMap());
    }
}

/**
 *
 */
export class TransactionManager {

    private static CB: TransactionManagerCallbackChain = new DefaultTransactionManager();

    /**
     * Registers a callback in the callback chain.
     * This is designed to be used by other frameworks to extend the entity manager.
     */
    public static registerCallback(handler: TransactionManagerCallback) {
        this.CB = new TransactionManagerNotifier(handler, this.CB);
    }

    static getItem<E extends object>(manager: EntityManager, record: EntityProxy<E>, item: AttributeMapper): Promise<E> {
        return this.CB.getItem(manager, record, item);
    }

    static putItem<E extends object>(manager: EntityManager, record: EntityProxy<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<E> {
        return this.CB.putItem(manager, record, item, expected);
    }

    static deleteItem<E extends object>(manager: EntityManager, record: EntityProxy<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<E> {
        return this.CB.deleteItem(manager, record, item, expected);
    }

    static updateItem<E extends object>(manager: EntityManager, record: EntityProxy<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<E> {
        return this.CB.updateItem(manager, record, item, expected);
    }
}

/**
 * The Entity Manager Callback Chain is part of a framework that allows to extend the Entity Manager's functionality.
 *
 * Notifier class that starts the callback chain and delegates the functions to the extension implementations.
 */
export class TransactionManagerNotifier implements TransactionManagerCallbackChain {

    private readonly cb: TransactionManagerCallback
    private readonly cbc: TransactionManagerCallbackChain

    constructor(cb: TransactionManagerCallback, cbc: TransactionManagerCallbackChain) {
        this.cb = cb;
        this.cbc = cbc;
    }

    getItem<E extends object>(manager: EntityManager, record: EntityProxy<E>, item: AttributeMapper): Promise<E> {
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
