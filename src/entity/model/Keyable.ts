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

import {Callback, CallbackOperation} from "..";
import {UNDEFINED} from "../../util/Undefined";

/**
 * A keyable DB record.
 *
 * All entities need to have an id in order for it to be retrievable and updateable.
 * But because every DynamoDB database can have a different PK/SK configuration,
 * we cannot provide a generic way to represent this ID.
 *
 * Instead this base class will generate a near-perfect UUID and store it in an instance property.
 * Subclasses can then use this field as their Id or as a part of their composite Id.
 *
 * The generated Id will start with a Time-based component which provides a natural ordering if it used as SK.
 * The default Id generator function can be overridden by providing a custom generator in the constructor.
 */
export abstract class Keyable {

    /**
     * The unique internal id of this record.
     */
    public $id: string = UNDEFINED;

    private readonly _generator: () => string;

    public constructor(generator?: () => string) {
        this._generator = generator || (() => Keyable.generateUUID());
    }

    @Callback()
    generateId(operation: CallbackOperation): void {
        if (operation === "INSERT" && this.$id === UNDEFINED) {
            this.$id = Keyable.generateUUID();
        }
    }

    public static generateUUID(): string {
        return new Date().getTime().toString(36) + Math.random().toString(36).substr(2, 9);
    }

}