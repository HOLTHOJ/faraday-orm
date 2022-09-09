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
 * A View that lists all the files and folders inside a directory, ordered by mime type.
 * - Folders will all be shown at the top, and ordered by name.
 * - Files with the same mime type are ordered by name.
 */
@View("ExplorerByType", "gsi1-index")
@ViewQuery("list-all", ":account/:directory")
@ViewQuery("folder-only", ":account/:directory", "0/", "BEGINS_WITH")
@ViewQuery("file-only", ":account/:directory", "1/", "BEGINS_WITH")
@ViewQuery("file-mimetype", ":account/:directory", "1/:mimeType/", "BEGINS_WITH")
export default class DBExplorerByTypeView {

    public account: string = UNDEFINED

    public directory: string = UNDEFINED

    public name: string = UNDEFINED;

    public mimeType: string = UNDEFINED;

    @ViewId("PK")
    public parent: string = UNDEFINED;

    @ViewId("SK")
    public explorer: string = UNDEFINED;

    @ViewColumn()
    public file: DBFile = UNDEFINED;

    @ViewColumn()
    public folder: DBFolder = UNDEFINED;

    @ViewSource(DBFile, {pkPath: ":account/:directory", skPath: "1/:mimeType/:name"})
    public loadFile(value: DBFile) {
        this.file = value;
        this.account = value.account;
        this.directory = value.directory;
        this.mimeType = value.mimeType;
        this.name = value.fileName;
    }

    @ViewSource(DBFolder, {pkPath: ":account/:directory", skPath: "0/:name"})
    public loadFolder(value: DBFolder) {
        this.folder = value;
        this.account = value.account;
        this.directory = value.directory;
        this.name = value.folderName;
    }

}