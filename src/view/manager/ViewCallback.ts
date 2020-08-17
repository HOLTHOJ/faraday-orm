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


import {EntityManager, IdColumnDef} from "../../entity";
import {EntityProxy} from "../../entity/manager/EntityProxy";
import {AttributeMapper} from "../../util/AttributeMapper";
import {ViewManager} from "./ViewManager";
import {ViewIdColumnDef} from "..";
import {EntityManagerCallback, EntityManagerCallbackChain} from "../../entity/manager/EntityManagerCallback";
import {ExpectedMapper} from "../../util/ExpectedMapper";

export class ViewCallback implements EntityManagerCallback {

    getItem<E extends object>(chain: EntityManagerCallbackChain, manager: EntityManager, record: EntityProxy<E>, item: AttributeMapper): Promise<E> {
        return chain.getItem(manager, record, item);
    }

    deleteItem<E extends object>(chain: EntityManagerCallbackChain, manager: EntityManager, record: EntityProxy<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<E> {
        return chain.deleteItem(manager, record, item, expected);
    }

    putItem<E extends object>(chain: EntityManagerCallbackChain, manager: EntityManager, record: EntityProxy<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<E> {
        ViewManager.get(manager).getViewsForSource(record, true).forEach(view => {
            view.forEachId((id: ViewIdColumnDef, value: any, valueIsSet: boolean) => {
                if (item.getValue(id) !== value) {
                    record.forEachId((recordId: IdColumnDef) => {
                        if (id.name === recordId.name) {
                            throw new Error(`View ${view.viewType.ctor.name} is not allowed to override the ID values of the Entity.`);
                        }
                    }, false);

                    console.warn(`Column ${id.name} will be overridden by View ${view.viewType.ctor.name}.`);
                }
                item.setValue({name: id.name, converter: id.converter}, value);
            }, true)
        });

        return chain.putItem(manager, record, item, expected);
    }

    updateItem<E extends object>(chain: EntityManagerCallbackChain, manager: EntityManager, record: EntityProxy<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<E> {
        return chain.updateItem(manager, record, item, expected);
    }

}
