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

import {IdType} from "../annotation/Id";
import {FacetIdType} from "../annotation/FacetId";
import {Class} from "../util";
import * as fs from "fs";

export type TableConfig = { [tableName: string]: TableDef }

export interface TableDef {

    /** All managed classes. */
    entities: Class[],

    /** Mapping of id type and column name. */
    ids: { [id in IdType]: string }

    /** Mapping of facet id type and LSI index name. */
    facets: { [id in FacetIdType]: { index: string, column: string } }

}

export function loadTableConfig(file: string = "./faraday.orm.json", loader?: (file: string) => Class): TableConfig {
    const tableConfig = JSON.parse(fs.readFileSync(file, "utf8")) as TableConfig
    Object.values(tableConfig).forEach(elt => {
        if (typeof elt.ids === "undefined") {
            elt.ids = {PK: "$pk", SK: "$sk"}
        }
        if (typeof elt.facets === "undefined") {
            elt.facets = {
                LSI1: {index: "lsi1-index", column: "$lsi1"},
                LSI2: {index: "lsi2-index", column: "$lsi2"},
                LSI3: {index: "lsi3-index", column: "$lsi3"},
                LSI4: {index: "lsi4-index", column: "$lsi4"},
                LSI5: {index: "lsi5-index", column: "$lsi5"},
                LSI6: {index: "lsi6-index", column: "$lsi6"},
                LSI7: {index: "lsi7-index", column: "$lsi7"},
                LSI8: {index: "lsi8-index", column: "$lsi8"},
            }
        }

        if (typeof elt.entities !== "undefined") {
            // Load all entity annotations.
            elt.entities.forEach((entity, index) => {
                if (typeof entity === "string") {
                    elt.entities[index] = loader ? loader(entity as unknown as string) : require(entity as unknown as string).default
                }
            })
            // elt.entities = elt.entities.map(elt => loader ? loader(elt as unknown as string) : require(elt as unknown as string))
        }
    })

    return tableConfig
}