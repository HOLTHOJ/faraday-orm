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
import {UNDEFINED} from "../../util/Undefined";
import {NumberConverter} from "../../converter/NumberConverter";
import {Keyable} from "./Keyable";

/**
 * An versionable DB record.
 *
 * Versionable records always have a version field the ensure optimistic locking at DB level.
 */
export abstract class Versionable extends Keyable {

    @Internal("$v", NumberConverter, true)
    public $version: number = UNDEFINED;

    @Callback()
    updateVersion(operation: CallbackOperation): void {
        const now = new Date();
        switch (operation) {
            case "INSERT":
                this.$version = 1;
                break;
            case "UPDATE":
                this.$version += 1;
                break;
        }
    }

    @Callback()
    validateVersion(action: CallbackOperation) {
        if (action === "DELETE" && this.$version < 1)
            throw new Error(`Require a valid version.`);
    }
}