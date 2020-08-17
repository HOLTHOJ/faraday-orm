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
import {DateNumberConverter} from "../../converter/DateNumberConverter";
import {StringConverter} from "../../converter/StringConverter";
import {UNDEFINED} from "../../util/Undefined";
import {Versionable} from "./Versionable";

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
    public $createTime: Date = UNDEFINED;

    @Internal("$cu", StringConverter, true)
    public $createUser: string = UNDEFINED;

    @Internal("$ut", DateNumberConverter, true)
    public $updateTime: Date = UNDEFINED;

    @Internal("$uu", StringConverter, true)
    public $updateUser: string = UNDEFINED;

    /**
     * The SUB (security subject) updating this record.
     * FIXME: There must be a "threadlocal" way of accessing the current user.
     */
    public $sub: string = UNDEFINED;

    @Callback()
    updateEditableInternalFields(operation: CallbackOperation): void {
        const now = new Date();
        switch (operation) {
            case "INSERT":
                this.$createTime = now;
                this.$createUser = this.$sub;
            case "UPDATE":
            case "DELETE":
                this.$updateTime = now;
                this.$updateUser = this.$sub;
        }
    }

}