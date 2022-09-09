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

import {View, ViewColumn, ViewId, ViewQuery, ViewSource} from "../../../../view";
import {UNDEFINED} from "../../../../util";
import DBFile from "../../model/DBFile";
import DBFolder from "../../model/DBFolder";

/**
 * A View that lists all the files and folders inside a directory, ordered by name.
 * Folders and files are not separated and are all shown in the same ordering.
 *
 * Note: Files and folders are already sorted by name using their SK,
 * this view simply merges them together in one single ordered view.
 */
@View("ExplorerByName", "gsi2-index")
@ViewQuery("list-all", ":account/:directory")
@ViewQuery("filter-name", ":account/:directory", ":name", "BEGINS_WITH")
export default class DBExplorerByNameView {

    public account: string = UNDEFINED

    public directory: string = UNDEFINED

    @ViewId("PK")
    public parent: string = UNDEFINED;

    @ViewId("SK")
    public name: string = UNDEFINED;

    @ViewColumn()
    public file: DBFile = UNDEFINED;

    @ViewColumn()
    public folder: DBFolder = UNDEFINED;

    @ViewSource(DBFile, {pkPath: ":account/:directory", skPath: ":name"})
    public loadFile(value: DBFile) {
        this.file = value;
        this.account = value.account;
        this.directory = value.directory;
        this.name = value.fileName;
    }

    @ViewSource(DBFolder, {pkPath: ":account/:directory", skPath: ":name"})
    public loadFolder(value: DBFolder) {
        this.folder = value;
        this.account = value.account;
        this.directory = value.directory;
        this.name = value.folderName;
    }
}