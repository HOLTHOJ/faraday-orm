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

import {Entity} from "../../../src/entity/annotation/Entity";
import {Callback, CallbackOperation} from "../../../src/entity/annotation/Callback";
import {UNDEFINED} from "../../../src/util/Undefined";
import {DateConverter} from "../../../src/converter/DBDateConverter";
import {Internal} from "../../../src/entity/annotation/Internal";

@Entity("file")
export class DBFile {

    @Internal({name: "ct", converter: DateConverter}, true)
    public createTime: Date = UNDEFINED;

    @Internal({name: "lut", converter: DateConverter}, true)
    public lastUpdateTime: Date = UNDEFINED;

    @Callback()
    updateTimestamp(operation: CallbackOperation) {
        if (operation !== "GET" && operation !== "LOAD") {
            this.lastUpdateTime = new Date();
            if (operation === "INSERT") {
                this.createTime = new Date();
            }
        }
    }
}