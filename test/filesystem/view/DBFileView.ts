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

import {View, ViewColumn, ViewId, ViewQuery, ViewSource} from "../../../src/view";
import {UNDEFINED} from "../../../src/util";
import DBFile from "../model/DBFile";

@View("default")
@ViewQuery("listAll", ":account/:directory", "file/", "BEGINS_WITH")
export class DBFileView {

    public account: string = UNDEFINED

    public directory: string = UNDEFINED

    @ViewId("PK", "pk")
    public parent: string = UNDEFINED

    @ViewId("SK", "sk")
    public fileId: string = UNDEFINED;

    @ViewColumn()
    public file: DBFile = UNDEFINED;

    @ViewSource(DBFile, {pkPath: ":account/:directory", skPath: "file/"})
    public loadFile(value: DBFile): boolean {
        this.file = value;
        this.account = value.account;
        this.directory = value.directory;
        return true;
    }

}