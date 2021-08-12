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
import {EntityManager, EntityManagerConfig} from "../entity/manager/EntityManager";
import {req} from "../util/Req";

export default async function (em: EntityManager) {

    const dynamo = new DynamoDB();
    const tableDef = req(em.config.tableDef, `Table def not found.`)

    const createTableInput: DynamoDB.Types.CreateTableInput = {
        TableName: em.config.tableName,
        AttributeDefinitions: [
            {AttributeName: tableDef.ids["PK"], AttributeType: "S"},
        ],
        KeySchema: [
            {KeyType: "HASH", AttributeName: tableDef.ids["PK"]},
        ],
    };

    if (typeof tableDef.ids["SK"] !== "undefined") {
        createTableInput.AttributeDefinitions.push({AttributeName: tableDef.ids["SK"], AttributeType: "S"});
        createTableInput.KeySchema.push({KeyType: "RANGE", AttributeName: tableDef.ids["SK"]});
    }

    if (Object.keys(tableDef.facets).length > 0) {
        Object.entries(tableDef.facets).forEach(([type, index]) => {
            createTableInput.AttributeDefinitions.push({AttributeName: index.column, AttributeType: "S"});
            createTableInput.LocalSecondaryIndexes?.push({
                IndexName: index.index, Projection: {ProjectionType: "ALL"}, KeySchema: [
                    {KeyType: "HASH", AttributeName: tableDef.ids["PK"]},
                    {KeyType: "RANGE", AttributeName: index.column},
                ]
            })
        })
    }

    await dynamo.createTable(createTableInput).promise();
}
