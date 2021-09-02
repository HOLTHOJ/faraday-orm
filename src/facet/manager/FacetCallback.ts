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
import {ManagedEntity} from "../../manager/ManagedEntity";
import {EntityManagerConfig} from "../../manager/EntityManagerImpl";

export class FacetTransactionFactory implements TransactionFactory {

    createTransaction(session: EntityManagerConfig): TransactionCallback {
        return new FacetCallback(session);
    }

}

class FacetCallback implements TransactionCallback {

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

    deleteItem<E extends object>(chain: TransactionCallbackChain, record: ManagedEntity<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<DynamoDB.Types.DeleteItemOutput> {
        return chain.deleteItem(record, item, expected);
    }

    putItem<E extends object>(chain: TransactionCallbackChain, record: ManagedEntity<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<DynamoDB.Types.PutItemOutput> {
        this.setFacetIndexColumns(record, item, expected);
        return chain.putItem(record, item, expected);
    }

    updateItem<E extends object>(chain: TransactionCallbackChain, record: ManagedEntity<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<DynamoDB.Types.PutItemOutput> {
        this.setFacetIndexColumns(record, item, expected);
        return chain.updateItem(record, item, expected);
    }

    private setFacetIndexColumns<E extends object>(record: ManagedEntity<E>, item: AttributeMapper, expected: ExpectedMapper) {
        // const facetTypes = FacetManager.getFacetTypes(record.entityType.def.ctor);
        // facetTypes.forEach(facetType => {
        //     const facetPath = facetType.lsi.path;
        //     if (facetPath) {
        //         const facetPathGenerator = facetPath?.pathGenerator || manager.session.pathGenerator;
        //         const facetCol = single(record.entityType.cols.filter(elt => elt.propName ===
        // facetType.lsi.propName)); const facetValue = facetPathGenerator.compile(record, req(facetPath.path));  if
        // (item.hasValue(facetCol)) console.warn(`Column ${facetCol.name} will be overridden by Facet
        // ${facetType.lsi.facetName}.`);  item.setValue(facetCol, facetValue); } })
    }

}
