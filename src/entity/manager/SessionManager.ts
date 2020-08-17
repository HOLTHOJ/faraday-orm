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
 * Not you conventional DB session manager: this will not allow you to commit/rollback all operations in this "session" atomically.
 * The term "session" here is (currently) only used to log all requests that are executed in one "session".
 */
export class SessionManager implements Partial<DynamoDB> {

    private readonly db: DynamoDB;
    public readonly log = new Array<{ timestamp: Date, input: string, capacity: DynamoDB.ConsumedCapacity }>();

    constructor(options?: DynamoDB.Types.ClientConfiguration) {
        this.db = new DynamoDB({
            ...options,
            logger: {
                // write?: (chunk: any, encoding?: string, callback?: () => void) => void
                log: (...messages: any[]) => {
                    console.log("DYNAMODB", messages);
                }
            }
        });
    }

    get lastLog(): { timestamp: Date, input: string, capacity: DynamoDB.ConsumedCapacity } | undefined {
        return (this.log.length > 0) ? this.log[this.log.length - 1] : undefined;
    }

    getItem(callback?: (err: AWSError, data: DynamoDB.Types.GetItemOutput) => void): Request<DynamoDB.Types.GetItemOutput, AWSError>;
    getItem(params: DynamoDB.Types.GetItemInput, callback?: (err: AWSError, data: DynamoDB.Types.GetItemOutput) => void): Request<DynamoDB.Types.GetItemOutput, AWSError>;
    getItem(params?: DynamoDB.Types.GetItemInput | ((err: AWSError, data: DynamoDB.GetItemOutput) => void)): Request<DynamoDB.GetItemOutput, AWSError> {
        if (typeof params !== "object") throw new Error(`Unknown operation.`);

        const item = this.db.getItem(params);
        item.on("success", response => {
            const capacity = (response.data as DynamoDB.GetItemOutput).ConsumedCapacity!;
            this.log.push({timestamp: new Date(), input: JSON.stringify(params), capacity: capacity});
        });

        // item.promise = () => item.promise().then(data => {
        //     this.log.push({
        //         timestamp: new Date(),
        //         input: JSON.stringify(params),
        //         capacity: data.ConsumedCapacity!
        //     });
        //     return data;
        // })

        return item;

    }

    putItem(params: DynamoDB.Types.PutItemInput, callback?: (err: AWSError, data: DynamoDB.Types.PutItemOutput) => void): Request<DynamoDB.Types.PutItemOutput, AWSError>;
    putItem(callback?: (err: AWSError, data: DynamoDB.Types.PutItemOutput) => void): Request<DynamoDB.Types.PutItemOutput, AWSError>;
    putItem(params?: DynamoDB.PutItemInput | ((err: AWSError, data: DynamoDB.PutItemOutput) => void)): Request<DynamoDB.PutItemOutput, AWSError> {
        if (typeof params !== "object") throw new Error(`Unknown operation.`);

        const item = this.db.putItem(params);
        item.on("success", response => {
            const capacity = (response.data as DynamoDB.PutItemOutput).ConsumedCapacity!;
            this.log.push({timestamp: new Date(), input: JSON.stringify(params), capacity: capacity});
        });

        return item;
    }

    deleteItem(params: DynamoDB.DeleteItemInput, callback?: (err: AWSError, data: DynamoDB.DeleteItemOutput) => void): Request<DynamoDB.DeleteItemOutput, AWSError>;
    deleteItem(callback?: (err: AWSError, data: DynamoDB.DeleteItemOutput) => void): Request<DynamoDB.DeleteItemOutput, AWSError>;
    deleteItem(params?: DynamoDB.DeleteItemInput | ((err: AWSError, data: DynamoDB.DeleteItemOutput) => void)): Request<DynamoDB.DeleteItemOutput, AWSError> {
        if (typeof params !== "object") throw new Error(`Unknown operation.`);

        const item = this.db.deleteItem(params);
        item.on("success", response => {
            const capacity = (response.data as DynamoDB.PutItemOutput).ConsumedCapacity!;
            this.log.push({timestamp: new Date(), input: JSON.stringify(params), capacity: capacity});
        });

        return item;
    }
}