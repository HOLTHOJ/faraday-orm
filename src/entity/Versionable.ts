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

import {Callback, CallbackOperation, Column, Internal} from "./index";
import {UNDEFINED} from "../util";
import {NumberConverter} from "../converter";
import {Keyable, KeyableOptions} from "./Keyable";
import {def} from "../util/Req";

/** */
export type VersionableOptions = KeyableOptions & {

    /** The version number to use for new records. */
    versionNew?: number,

    /** The increment for updated records. */
    versionIncrement?: number,

};

/**
 * An versionable record.
 *
 * Versionable records always have a version field the enable optimistic locking at database level. This model class
 * takes care of setting the initial version number for INSERT operations, as well as incrementing the version number
 * for UPDATE operations.
 *
 * This model class makes use of the @Internal column functionality to enforce optimistic locking. i.e. the _version
 * column will always be included as an "Expected" parameter in the DynamoDB requests so you can only update a record
 * if your version matches the one in the database.
 *
 * @see Internal
 */
export abstract class Versionable extends Keyable {

    private readonly versionNew: number;
    private readonly versionIncrement: number;

    constructor(options?: VersionableOptions) {
        super(options);
        this.versionNew = def(options?.versionNew, 1);
        this.versionIncrement = def(options?.versionIncrement, 1);
    }

    @Internal()
    @Column("$v", NumberConverter, true)
    public _version: number = UNDEFINED;

    @Callback()
    updateVersion(operation: CallbackOperation): void {
        switch (operation) {
            case "INSERT":
                this._version = this.versionNew;
                break;
            case "UPDATE":
                this._version += this.versionIncrement;
                break;
        }
    }

    @Callback()
    validateVersion(action: CallbackOperation) {
        if (action === "DELETE" && (Number.isNaN(Number(this._version)) || Number(this._version) < this.versionNew)) {
            throw new Error(`Deleting a Versionable entity requires a version.`);
        }
    }
}