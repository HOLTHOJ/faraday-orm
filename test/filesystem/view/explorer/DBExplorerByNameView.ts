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

import {View, ViewColumn, ViewId, ViewQuery, ViewSource} from "../../../../src/view";
import {UNDEFINED} from "../../../../src/util/Undefined";
import {DBFile} from "../../model/DBFile";
import {DBFolder} from "../../model/DBFolder";

/**
 * A View that lists all the files and folders inside a directory, ordered by name.
 * Folders and files are not separated and are all shown in the same ordering.
 *
 * Note: Filed and folders are already sorted by name using their SK,
 * this view merely merges them together in one single view.
 */
@View("default")
@ViewQuery("list-all", ":account/:directory")
@ViewQuery("filter-name", ":account/:directory", ":name", "BEGINS_WITH")
export class DBExplorerByNameView {

    public account: string = UNDEFINED

    public directory: string = UNDEFINED

    @ViewId("PK", "pk")
    public parent: string = UNDEFINED;

    @ViewId("SK", "sk")
    public name: string = UNDEFINED;

    @ViewColumn()
    @ViewSource(DBFile, {pkPath: ":account/:directory", skPath: ":fileName"})
    public file: DBFile = UNDEFINED;

    @ViewColumn()
    @ViewSource(DBFolder, {pkPath: ":account/:directory", skPath: ":folderName"})
    public folder: DBFolder = UNDEFINED;

}