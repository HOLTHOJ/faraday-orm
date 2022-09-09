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
import {ExpectedMapper} from "../../util/mapper/ExpectedMapper";
import {
    GetItemInput,
    QueryInput,
    TransactionCallback,
    TransactionCallbackChain
} from "../../manager/TransactionCallback";
import {DynamoDB} from "aws-sdk";
import {TransactionFactory} from "../../manager/TransactionFactory";
import {EntityTypeProxy} from "../../manager/types/EntityTypeProxy";
import {EntityManagerConfig} from "../../manager/EntityManagerImpl";
import {ViewTypeSourceProxy} from "../../manager/types/ViewTypeSourceProxy";
import {IdColumnProperty} from "../../util/property/IdColumnProperty";

export class ViewTransactionFactory implements TransactionFactory {

    createTransaction(session: EntityManagerConfig): TransactionCallback {
        return new ViewCallback(session);
    }

}

class ViewCallback implements TransactionCallback {

    private readonly config: EntityManagerConfig;

    constructor(config: EntityManagerConfig) {
        this.config = config;
    }

    getItem<E extends object>(chain: TransactionCallbackChain, input: GetItemInput<E>): Promise<DynamoDB.Types.GetItemOutput> {
        return chain.getItem(input);
    }

    query<E extends object>(chain: TransactionCallbackChain, input: QueryInput<E>): Promise<DynamoDB.Types.QueryOutput> {
        return chain.query(input);
    }

    deleteItem<E extends object>(chain: TransactionCallbackChain, record: EntityTypeProxy<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<DynamoDB.Types.DeleteItemOutput> {
        return chain.deleteItem(record, item, expected);
    }

    putItem<E extends object>(chain: TransactionCallbackChain, record: EntityTypeProxy<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<DynamoDB.Types.PutItemOutput> {
        // this.setViewIndexColumns(record, item, expected);
        return chain.putItem(record, item, expected);
    }

    updateItem<E extends object>(chain: TransactionCallbackChain, record: EntityTypeProxy<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<DynamoDB.Types.PutItemOutput> {
        // this.setViewIndexColumns(record, item, expected);
        return chain.updateItem(record, item, expected);
    }

    private setViewIndexColumns<E extends object>(record: EntityTypeProxy<E>, item: AttributeMapper, expected: ExpectedMapper) {
        // Include this entity in its resp. views by mapping the view index columns.
        for (let value of this.config.viewDef.values()) {
            const view = new ViewTypeSourceProxy(value, record.entityType)
            if (view.loadSource(record.entity, true, this.config.pathGenerator)) {
                view.forEachId((id: IdColumnProperty<any>, value: any, valueIsSet: boolean) => {
                    if (valueIsSet) item.setValue(id, value);
                }, true)
            }
        }
    }

}
