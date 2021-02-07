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

import {EntityManagerConfig} from "./EntityManager";
import {EntityProxy} from "./EntityProxy";
import {AttributeMapper} from "../../util/mapper/AttributeMapper";
import {ExpectedMapper} from "../../util/mapper/ExpectedMapper";
import {DynamoDB} from "aws-sdk";
import {GetItemInput, QueryInput, TransactionCallback, TransactionCallbackChain} from "./TransactionCallback";
import {SessionManager} from "./SessionManager";
import {TransactionFactory} from "./TransactionFactory";

/**
 *
 */
export class TransactionManager {

    private static readonly CUSTOM_FACTORIES: Array<TransactionFactory> = [];

    private readonly chain: TransactionCallbackChain;

    /**
     * Registers a callback in the callback chain.
     * This is designed to be used by other frameworks to extend the entity manager.
     *
     * The transaction callbacks are generated when the Entity Manager is instantiated,
     * which means that any factories that are registered afterwards are not available
     * until a new Entity manager is instantiated.
     */
    public static registerCallback(handler: TransactionFactory) {
        this.CUSTOM_FACTORIES.push(handler);
    }

    /**
     * Initialize the chain of transactions.
     *
     * @param {SessionManager} session
     * @param {EntityManagerConfig} config
     */
    constructor(session: SessionManager, config: EntityManagerConfig) {
        this.chain = TransactionManager.CUSTOM_FACTORIES.reduce((chain, elt) => {
            return new TransactionManagerNotifier(elt.createTransaction(config), chain);
        }, new DefaultTransaction(session, config) as TransactionCallbackChain);
    }

    getItem<E extends object>(input: GetItemInput<E>): Promise<DynamoDB.GetItemOutput> {
        return this.chain.getItem(input);
    }

    deleteItem<E extends object>(record: EntityProxy<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<DynamoDB.DeleteItemOutput> {
        return this.chain.deleteItem(record, item, expected);
    }

    putItem<E extends object>(record: EntityProxy<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<DynamoDB.PutItemOutput> {
        return this.chain.putItem(record, item, expected);
    }

    query<E extends object>(input: QueryInput<E>): Promise<DynamoDB.QueryOutput> {
        return this.chain.query(input);
    }

    updateItem<E extends object>(record: EntityProxy<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<DynamoDB.UpdateItemOutput> {
        return this.chain.updateItem(record, item, expected);
    }

}

/**
 * The Entity Manager Callback Chain is part of a framework that allows to extend the Entity Manager's functionality.
 * Notifier class that starts the callback chain and delegates the functions to the extension implementations.
 */
class TransactionManagerNotifier implements TransactionCallbackChain {

    private readonly cb: TransactionCallback
    private readonly cbc: TransactionCallbackChain

    constructor(cb: TransactionCallback, cbc: TransactionCallbackChain) {
        this.cb = cb;
        this.cbc = cbc;
    }

    getItem<E extends object>(input: GetItemInput<E>): Promise<DynamoDB.Types.GetItemOutput> {
        return this.cb.getItem(this.cbc, input);
    }

    query<E extends object>(input: QueryInput<E>): Promise<DynamoDB.QueryOutput> {
        return this.cb.query(this.cbc, input);
    }

    putItem<E extends object>(record: EntityProxy<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<DynamoDB.Types.PutItemOutput> {
        return this.cb.putItem(this.cbc, record, item, expected);
    }

    deleteItem<E extends object>(record: EntityProxy<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<DynamoDB.Types.DeleteItemOutput> {
        return this.cb.deleteItem(this.cbc, record, item, expected);
    }

    updateItem<E extends object>(record: EntityProxy<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<DynamoDB.Types.PutItemOutput> {
        return this.cb.updateItem(this.cbc, record, item, expected);
    }

}

/**
 * The default transaction. This transaction callback will make the actual DynamoDB call.
 * This default implementation should always be the inner-most manager to be executed.
 */
class DefaultTransaction implements TransactionCallbackChain {

    private readonly session: SessionManager;
    private readonly config: EntityManagerConfig;

    constructor(session: SessionManager, config: EntityManagerConfig) {
        this.session = session;
        this.config = config;
    }

    async getItem<E extends object>(input: GetItemInput<E>): Promise<DynamoDB.Types.GetItemOutput> {
        return this.session.getItem({
            TableName: this.config.tableName,
            Key: input.key.toMap(),
        });
    }

    async query<E extends object>(input: QueryInput<E>): Promise<DynamoDB.Types.QueryOutput> {
        return this.session.query({
            TableName: this.config.tableName,
            IndexName: input.indexName,
            KeyConditions: input.item.toMap(),
            ExclusiveStartKey: input.exclusiveStartKey?.toMap(),
            Limit: input.limit,
        });
    }

    async putItem<E extends object>(record: EntityProxy<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<DynamoDB.Types.PutItemOutput> {
        return this.session.putItem({
            TableName: this.config.tableName,
            Item: item.toMap(),
            Expected: expected.toMap(),
        });
    }

    async deleteItem<E extends object>(record: EntityProxy<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<DynamoDB.Types.DeleteItemOutput> {
        return this.session.deleteItem({
            TableName: this.config.tableName,
            Key: item.toMap(),
            Expected: expected.toMap(),
            ReturnValues: "ALL_OLD",
        });
    }

    async updateItem<E extends object>(record: EntityProxy<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<DynamoDB.Types.PutItemOutput> {
        return this.session.putItem({
            TableName: this.config.tableName,
            Item: item.toMap(),
            Expected: expected.toMap(),
        });
    }
}