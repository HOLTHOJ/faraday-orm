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

import {DynamoDB} from "aws-sdk";
import {EntityManager} from "../entity/manager/EntityManager";
import {eq, req, single} from "../util/Req";

/**
 * Validates the immutable table configuration.
 *
 * @param em
 */
export default async function (em: EntityManager) {

    const dynamo = new DynamoDB();
    const tableDefinition = await dynamo.describeTable({
        TableName: req(em.config.tableName, `Missing table name.`)
    }).promise()

    console.log("Table description", JSON.stringify(tableDefinition));

    const table = req(tableDefinition.Table, `Table not found.`)
    const tableDef = req(em.config.tableDef, `Table def not found.`)

    const keySchema = req(table.KeySchema, `Table key schema not found.`);
    eq(keySchema.length, Object.keys(req(tableDef.ids)).length, `Table key schema is invalid.`);

    keySchema.forEach(value => {
        switch (value.KeyType) {
            case "HASH":
                eq(tableDef.ids["PK"], value.AttributeName, `Table key schema is invalid.`)
                break
            case "RANGE":
                eq(tableDef.ids["SK"], value.AttributeName, `Table key schema is invalid.`)
                break
        }
    })

    if (table.LocalSecondaryIndexes?.length || Object.keys(tableDef.facets || {}).length) {
        const lsi = req(table.LocalSecondaryIndexes, `Facet key schema is invalid.`);
        eq(lsi.length, Object.keys(req(tableDef.facets)).length, `Facet key schema is invalid.`);

        lsi.forEach(value => {
            const facet = single(Object.entries(req(tableDef.facets)).filter(elt => elt[1].index === value.IndexName), "Facet key schema is invalid.");
            req(value.KeySchema).forEach(value => {
                switch (value.KeyType) {
                    case "HASH":
                        eq(tableDef.ids["PK"], value.AttributeName, `Facet key schema is invalid.`)
                        break
                    case "RANGE":
                        eq(facet[1].column, value.AttributeName, `Facet key schema is invalid.`)
                        break
                }
            })
        })
    }
}