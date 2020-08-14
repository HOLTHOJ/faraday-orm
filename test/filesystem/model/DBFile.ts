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

import {UNDEFINED} from "../../../src/util/Undefined";
import {StringConverter} from "../../../src/converter/StringConverter";
import {DateNumberConverter} from "../../../src/converter/DateNumberConverter";
import {Callback, CallbackOperation, Column, Entity, Id, Internal} from "../../../src/entity";

@Entity("file")
export class DBFile {

    @Id("PK", "dir")
    public dirId: string = UNDEFINED

    @Id("SK", "id")
    public fileId: string = UNDEFINED

    @Column({name: "fileName", converter: StringConverter})
    public fileName: string = UNDEFINED

    @Column({name: "mimeType", converter: StringConverter})
    public mimeType: string = UNDEFINED

    @Internal({name: "ct", converter: DateNumberConverter}, true)
    public createTime: Date = UNDEFINED;

    @Internal({name: "lut", converter: DateNumberConverter}, true)
    public lastUpdateTime: Date = UNDEFINED;

    @Callback()
    updateTimestamp(operation: CallbackOperation) {
        switch (operation) {
            case "INSERT":
                this.createTime = new Date();
            case "UPDATE":
            case "DELETE":
                this.lastUpdateTime = new Date();
        }
    }
}