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
import {req} from "../util/Req";
import {loadTableConfig, TableConfig} from "../manager/TableConfig";

async function createTable(tableName: string, config: string | TableConfig = "faraday.orm.json") {

    const dynamo = new DynamoDB();
    const tableConfig = (typeof config === "string") ? loadTableConfig(config) : config
    const tableDef = req(tableConfig[tableName], `Table def not found.`)

    const createTableInput: DynamoDB.Types.CreateTableInput = {
        TableName: tableName,
        AttributeDefinitions: [
            {AttributeName: req(tableDef.ids["PK"]), AttributeType: "S"},
        ],
        KeySchema: [
            {KeyType: "HASH", AttributeName: req(tableDef.ids["PK"])},
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 1, WriteCapacityUnits: 1
        }
    };

    if (typeof tableDef.ids["SK"] !== "undefined") {
        createTableInput.AttributeDefinitions.push({AttributeName: tableDef.ids["SK"], AttributeType: "S"});
        createTableInput.KeySchema.push({KeyType: "RANGE", AttributeName: tableDef.ids["SK"]});
    }

    if (Object.keys(tableDef.facets).length > 0) {
        createTableInput.LocalSecondaryIndexes = [];
        Object.entries(tableDef.facets).forEach(([type, index]) => {
            const lsi: DynamoDB.Types.LocalSecondaryIndex = {
                IndexName: index.index,
                Projection: {
                    ProjectionType: (typeof index.projection === "string") ? index.projection : "INCLUDE",
                    NonKeyAttributes: (Array.isArray(index.projection)) ? index.projection : undefined,
                },
                KeySchema: [
                    {KeyType: "HASH", AttributeName: req(tableDef.ids["PK"])},
                    {KeyType: "RANGE", AttributeName: index.column},
                ]
            }
            createTableInput.AttributeDefinitions.push({
                AttributeName: index.column,
                AttributeType: (index.type === "string") ? "S" : "N"
            });
            createTableInput.LocalSecondaryIndexes!.push(lsi);
        })
    }

    console.log("Request", createTableInput);

    await dynamo.createTable(createTableInput).promise();
}


export default createTable;


async function newtable() {
    const input: DynamoDB.Types.CreateTableInput = {
        "TableName": "pas-quote-v1.2",
        "AttributeDefinitions": [
            {
                "AttributeName": "$gsi-account",
                "AttributeType": "S"
            },
            {
                "AttributeName": "$gsi-producer",
                "AttributeType": "S"
            },
            {
                "AttributeName": "$pk",
                "AttributeType": "S"
            },
            {
                "AttributeName": "$sk",
                "AttributeType": "S"
            },
            {
                "AttributeName": "$ut",
                "AttributeType": "N"
            },
            {
                "AttributeName": "client",
                "AttributeType": "S"
            },
            {
                "AttributeName": "quoteDate",
                "AttributeType": "N"
            },
            {
                "AttributeName": "quoteId",
                "AttributeType": "S"
            }
        ],
        "KeySchema": [
            {
                "AttributeName": "$pk",
                "KeyType": "HASH"
            }
        ],
        "ProvisionedThroughput": {
            "ReadCapacityUnits": 1,
            "WriteCapacityUnits": 1
        },
        "GlobalSecondaryIndexes": [
            {
                "IndexName": "gsi-quote-producer",
                "KeySchema": [
                    {
                        "AttributeName": "$gsi-producer",
                        "KeyType": "HASH"
                    },
                    {
                        "AttributeName": "$ut",
                        "KeyType": "RANGE"
                    }
                ],
                "Projection": {
                    "ProjectionType": "INCLUDE",
                    "NonKeyAttributes": [
                        "accountId",
                        "producerId",
                        "price",
                        "quoteDate",
                        "quoteId",
                        "client"
                    ]
                },
                "ProvisionedThroughput": {
                    "ReadCapacityUnits": 1,
                    "WriteCapacityUnits": 1
                },
            },
            {
                "IndexName": "gsi-quote-account",
                "KeySchema": [
                    {
                        "AttributeName": "$gsi-account",
                        "KeyType": "HASH"
                    },
                    {
                        "AttributeName": "$ut",
                        "KeyType": "RANGE"
                    }
                ],
                "Projection": {
                    "ProjectionType": "INCLUDE",
                    "NonKeyAttributes": [
                        "accountId",
                        "producerId",
                        "price",
                        "quoteDate",
                        "quoteId",
                        "client"
                    ]
                },
                "ProvisionedThroughput": {
                    "ReadCapacityUnits": 1,
                    "WriteCapacityUnits": 1
                }
            }
        ]
    }

    return new DynamoDB().createTable(input).promise();
}


process.env.AWS_REGION = "eu-west-1";

newtable().then((data) => console.log("DONE", data))