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

import {View, ViewColumn, ViewId, ViewQuery, ViewSource} from "../../../view";
import {UNDEFINED} from "../../../util";
import DBFolder from "../model/DBFolder";

/**
 * The folder view lists all the Folder entities of a given directory,
 * ordered by their internal ID (which is create-time based).
 */
@View("FolderView", "gsi-index-2")
@ViewQuery("listAll", ":account/:directory", "folder/", "BEGINS_WITH")
export class DBFolderView {

    public account: string = UNDEFINED

    public directory: string = UNDEFINED

    @ViewId("PK")
    public parentId: string = UNDEFINED

    @ViewId("SK")
    public folderId: string = UNDEFINED

    @ViewColumn()
    public folder: DBFolder = UNDEFINED;

    @ViewSource(DBFolder, {pkPath: ":account/:directory", skPath: "folder/"})
    public loadFolder(value: DBFolder) {
        this.folder = value;
        this.account = value.account;
        this.directory = value.directory;
    }

}