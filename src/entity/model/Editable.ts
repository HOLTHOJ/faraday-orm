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

import {Callback, CallbackOperation, Internal} from "..";
import {DateNumberConverter, StringConverter} from "../../converter";
import {UNDEFINED} from "../../util";
import {Versionable} from "./Versionable";
import {EntityManagerConfig} from "../manager/EntityManager";

/**
 * An editable DB record.
 *
 * Editable records always have;
 * - createTime
 * - updateTime
 * - createUser
 * - updateUser
 * fields to enable tracing of edits.
 */
export abstract class Editable extends Versionable {

    @Internal("$ct", DateNumberConverter, true)
    public _createTime: Date = UNDEFINED;

    @Internal("$cu", StringConverter, true)
    public _createUser: string = UNDEFINED;

    @Internal("$ut", DateNumberConverter, true)
    public _updateTime: Date = UNDEFINED;

    @Internal("$uu", StringConverter, true)
    public _updateUser: string = UNDEFINED;

    @Callback()
    updateEditableInternalFields(operation: CallbackOperation, config: EntityManagerConfig): void {
        const now = new Date();
        switch (operation) {
            case "INSERT":
                this._createTime = now;
                this._createUser = config.userName;
            case "UPDATE":
            case "DELETE":
                this._updateTime = now;
                this._updateUser = config.userName;
        }
    }

}