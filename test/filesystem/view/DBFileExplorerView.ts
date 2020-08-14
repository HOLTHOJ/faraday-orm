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
import {UNDEFINED} from "../../../src/util/Undefined";
import {DBFile} from "../model/DBFile";
import {DBFolder} from "../model/DBFolder";

@View("GSI", "explorer-index")
@ViewQuery("list-all", ":dirId")
@ViewQuery("filter-name", ":dirId", ":name", "BEGINS_WITH")
export class DBFileExplorerView {

    @ViewId("PK", "dir")
    public dirId: string = UNDEFINED;

    @ViewId("SK", "explorer")
    public explorer: string = UNDEFINED;

    @ViewColumn()
    public file: DBFile = UNDEFINED;

    @ViewColumn()
    public folder: DBFolder = UNDEFINED;

    public id: string = UNDEFINED;
    public name: string = UNDEFINED;

    @ViewSource(DBFile, ":dirId", ":name/:id")
    public loadFile(value: DBFile) {
        this.file = value;
        this.dirId = value.dirId;
        this.id = value.fileId;
        this.name = value.fileName;
    }

    @ViewSource(DBFolder, ":dirId", ":name/:id")
    public loadFolder(value: DBFolder) {
        this.folder = value;
        this.dirId = value.dirId;
        this.id = value.folderId;
        this.name = value.folderName;
    }

}