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
import {ViewManager} from "./ViewManager";
import {ViewIdColumnDef} from "..";
import {ExpectedMapper} from "../../util/mapper/ExpectedMapper";
import {
    GetItemInput,
    QueryInput,
    TransactionCallback,
    TransactionCallbackChain
} from "../../manager/TransactionCallback";
import {DynamoDB} from "aws-sdk";
import {ViewProxy} from "./ViewProxy";
import {VIEW_SOURCE_ENTITIES} from "../annotation/View";
import {TransactionFactory} from "../../manager/TransactionFactory";
import {req} from "../../util/Req";
import {EntityTypeProx} from "../../manager/ManagedEntity";
import {EntityManagerConfig} from "../../manager/EntityManagerImpl";

export class ViewTransactionFactory implements TransactionFactory {

    createTransaction(session: EntityManagerConfig): TransactionCallback {
        return new ViewCallback(session);
    }

}

class ViewCallback implements TransactionCallback {

    private readonly session: EntityManagerConfig;

    constructor(session: EntityManagerConfig) {
        this.session = session;
    }

    getItem<E extends object>(chain: TransactionCallbackChain, input: GetItemInput<E>): Promise<DynamoDB.Types.GetItemOutput> {
        return chain.getItem(input);
    }

    query<E extends object>(chain: TransactionCallbackChain, input: QueryInput<E>): Promise<DynamoDB.Types.QueryOutput> {
        return chain.query(input);
    }

    deleteItem<E extends object>(chain: TransactionCallbackChain, record: EntityTypeProx<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<DynamoDB.Types.DeleteItemOutput> {
        return chain.deleteItem(record, item, expected);
    }

    putItem<E extends object>(chain: TransactionCallbackChain, record: EntityTypeProx<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<DynamoDB.Types.PutItemOutput> {
        this.setViewIndexColumns(record, item, expected);
        return chain.putItem(record, item, expected);
    }

    updateItem<E extends object>(chain: TransactionCallbackChain, record: EntityTypeProx<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<DynamoDB.Types.PutItemOutput> {
        this.setViewIndexColumns(record, item, expected);
        return chain.updateItem(record, item, expected);
    }

    private setViewIndexColumns<E extends object>(record: EntityTypeProx<E>, item: AttributeMapper, expected: ExpectedMapper) {
        const entityType = record.entityType;
        const entityViewTypes = VIEW_SOURCE_ENTITIES.get(entityType.def) || [];
        entityViewTypes.forEach(elt => {
            const view = ViewManager.loadView(elt);
            const viewSource = req(view.getViewSource(record.entityType.def));
            if (view.loadSource(viewSource, record.entity, true, this.session.pathGenerator)) {
                // Source is loaded and the keys are set..
                ViewCallback.addViewIdsToItem(view, record, item);
            } else {
                // Source could not be loaded - reset keys.
                item.setValue(elt.pk, undefined);
                if (elt.sk) item.setValue(elt.sk, undefined);
            }

            return view;
        });
    }

    private static addViewIdsToItem(view: ViewProxy, record: EntityTypeProx<{}>, item: AttributeMapper) {
        view.forEachId((id: ViewIdColumnDef, value: any, valueIsSet: boolean) => {
            if (item.getValue(id) !== value) {
                record.forEachId(recordId => {
                    if (id.name === recordId.name) {
                        throw new Error(`View ${view.viewType.ctor.name} is not allowed to override the ID values of the Entity.`);
                    }
                }, false);

                console.warn(`Column ${id.name} will be overridden by View ${view.viewType.ctor.name}.`);
            }
            item.setValue({name: id.name, converter: id.converter}, value);
        }, true)
    }

}
