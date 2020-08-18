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

import {AWSError, DynamoDB} from "aws-sdk";
import {Request} from "aws-sdk/lib/request";

/**
 * The default session manager that flushes each operation immediately to the DB.
 *
 * @todo Make a separate implementation that makes use of the DynamoDB Transact API.
 */
export class SessionManager {

    private readonly db: DynamoDB;
    public readonly log = new Array<{ timestamp: Date, input: string, capacity?: DynamoDB.ConsumedCapacity }>();

    constructor(options?: DynamoDB.Types.ClientConfiguration) {
        this.db = new DynamoDB(options);
    }

    get lastLog(): { timestamp: Date, input: string, capacity?: DynamoDB.ConsumedCapacity } | undefined {
        return (this.log.length > 0) ? this.log[this.log.length - 1] : undefined;
    }

    getItem(params: DynamoDB.Types.GetItemInput): Request<DynamoDB.Types.GetItemOutput, AWSError> {
        const item = this.db.getItem(params);
        item.on("success", response => {
            const capacity = (typeof response.data == "object") ? response.data?.ConsumedCapacity : undefined;
            this.log.push({timestamp: new Date(), input: JSON.stringify(params), capacity: capacity});
        });

        return item;
    }

    putItem(params: DynamoDB.PutItemInput): Request<DynamoDB.PutItemOutput, AWSError> {
        if (typeof params !== "object") throw new Error(`Unknown operation.`);

        const item = this.db.putItem(params);
        item.on("success", response => {
            const capacity = (typeof response.data == "object") ? response.data?.ConsumedCapacity : undefined;
            this.log.push({timestamp: new Date(), input: JSON.stringify(params), capacity: capacity});
        });

        return item;
    }

    deleteItem(params: DynamoDB.DeleteItemInput): Request<DynamoDB.DeleteItemOutput, AWSError> {
        if (typeof params !== "object") throw new Error(`Unknown operation.`);

        const item = this.db.deleteItem(params);
        item.on("success", response => {
            const capacity = (typeof response.data == "object") ? response.data?.ConsumedCapacity : undefined;
            this.log.push({timestamp: new Date(), input: JSON.stringify(params), capacity: capacity});
        });

        return item;
    }
}