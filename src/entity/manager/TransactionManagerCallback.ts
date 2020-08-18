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

/**
 * The Transaction Manager Callback is part of a framework that allows to extend the Transaction Manager's functionality.
 *
 * The Entity Manager will transform the entity instances into an attribute map
 * and will then call a chain of Transaction Manager Callbacks to enhance this attribute map further,
 * and eventually send the request to the Dynamo DB table.
 *
 * This is the interface that needs to be implemented to add an extension to the Transaction Manager.
 * This extension can then be added to the Transaction Manager using the registerCallback function.
 *
 * Don't forget to call the same method again on the chain parameter,
 * otherwise the execution chain will stop and nothing will happen.
 *
 * @see TransactionManager#registerCallback
 */
export interface TransactionManagerCallback {

    getItem<E extends object>(chain: TransactionManagerCallbackChain, manager: EntityManager, record: EntityProxy<E>, item: AttributeMapper): Promise<E>;

    putItem<E extends object>(chain: TransactionManagerCallbackChain, manager: EntityManager, record: EntityProxy<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<E>;

    deleteItem<E extends object>(chain: TransactionManagerCallbackChain, manager: EntityManager, record: EntityProxy<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<E>;

    updateItem<E extends object>(chain: TransactionManagerCallbackChain, manager: EntityManager, record: EntityProxy<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<E>

}

/**
 * The Entity Manager Callback Chain is part of a framework that allows to extend the Entity Manager's functionality.
 *
 * This interface is a wrapper around the next Entity Manager Callback in the chain.
 */
export interface TransactionManagerCallbackChain {

    getItem<E extends object>(manager: EntityManager, record: EntityProxy<E>, item: AttributeMapper): Promise<E>;

    putItem<E extends object>(manager: EntityManager, record: EntityProxy<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<E>;

    deleteItem<E extends object>(manager: EntityManager, record: EntityProxy<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<E>;

    updateItem<E extends object>(manager: EntityManager, record: EntityProxy<E>, item: AttributeMapper, expected: ExpectedMapper): Promise<E>;

}