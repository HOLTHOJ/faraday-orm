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

import {UNDEFINED} from "../../../src/util";
import {NumberConverter, StringConverter} from "../../../src/converter";
import {Callback, CallbackOperation, Column, Entity, Id, Internal} from "../../../src/entity";
import {Editable} from "../../../src/entity/model/Editable";
import {Facet, FacetId} from "../../../src/facet";
import {EntityManagerConfig} from "../../../src/entity/manager/EntityManager";
import {Exposed} from "../../../src/entity/annotation/Exposed";

@Facet("LSI1", DBFile.QUERY.ORDER_BY_SIZE, "BEGINS_WITH", "file/")
@Facet("LSI1", DBFile.QUERY.FILTER_BY_SIZE, "BEGINS_WITH", "file/:size/")
@Facet("LSI2", DBFile.QUERY.ORDER_BY_MIME_TYPE, "BEGINS_WITH", "file/")
@Facet("LSI2", DBFile.QUERY.FILTER_BY_MIME_TYPE, "EQ", "file/:mimeType")

@Entity("file", {pkPath: ":account/:directory", skPath: "file/:fileName"})
export default class DBFile extends Editable {

    public static QUERY = {
        ORDER_BY_SIZE: "order-by-size",
        FILTER_BY_SIZE: "filter-by-size",
        ORDER_BY_MIME_TYPE: "order-by-mimetype",
        FILTER_BY_MIME_TYPE: "filter-by-mimetype",
    }

    @Exposed()
    public account: string = UNDEFINED

    @Exposed()
    public directory: string = UNDEFINED

    @Id("PK")
    public path: string = UNDEFINED

    @Id("SK")
    public fileName: string = UNDEFINED

    @FacetId("LSI2")
    @Column("mimeType", StringConverter)
    public mimeType: string = UNDEFINED

    @Column("size", NumberConverter)
    public size: number = UNDEFINED

    @Internal()
    @Exposed(false)
    @FacetId("LSI1")
    public sizeIndex: string = UNDEFINED // "file/{mimetype}/{filename}"

    @Callback()
    updateFacets(operation: CallbackOperation, config: EntityManagerConfig) {
        if (operation === "DELETE") return;
        if (this.size) this.sizeIndex = "file/" + this.size + "/" + this.fileName;
    }

}