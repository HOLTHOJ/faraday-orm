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

import {Entity, Id} from "../../../src/entity";
import {UNDEFINED} from "../../../src/util";
import {Versionable} from "../../../src/entity/Versionable";

@Entity("folder", {pkPath: ":account/:directory", skPath: "folder/:folderName"})
export default class DBFolder extends Versionable {

    public account: string = UNDEFINED

    public directory: string = UNDEFINED

    @Id("PK")
    public parent: string = UNDEFINED

    @Id("SK")
    public folderName: string = UNDEFINED

}