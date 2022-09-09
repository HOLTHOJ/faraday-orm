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

async function describeTable(tableName: string, config: string | TableConfig = "faraday.orm.json") {

    const dynamo = new DynamoDB();
    // const tableConfig = (typeof config === "string") ? loadTableConfig(config) : config
    // const tableDef = req(tableConfig[tableName], `Table def not found.`)

    const describeInput: DynamoDB.Types.DescribeTableInput = {
        TableName: tableName,
    };

    console.log("Request", describeInput);

    const table = await dynamo.describeTable(describeInput).promise();
    console.log("Table", table);

    return table;
}

process.env.AWS_REGION = "eu-west-1";

describeTable("pas-quote-v1.1").then(table => {
    console.log("Table", JSON.stringify(table));
})

export default describeTable;