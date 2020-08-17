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
import {Column, Entity, Id} from "../../../src/entity";
import {Versionable} from "../../../src/entity/model/Versionable";
import {NumberConverter} from "../../../src/converter/NumberConverter";

@Entity("file", {pkPath: ":account/:directory", skPath: "file/:fileName"})
export class DBFile extends Versionable {

    public account: string = UNDEFINED

    public directory: string = UNDEFINED

    @Id("PK", "pk")
    public parent: string = UNDEFINED

    @Id("SK", "sk")
    public fileName: string = UNDEFINED

    @Column("mimeType", StringConverter)
    public mimeType: string = UNDEFINED

    @Column("size", NumberConverter)
    public size: number = UNDEFINED

}