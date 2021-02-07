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
import {PromiseResult} from "aws-sdk/lib/request";

/**
 * REQ_ONLY = logs only the request and timestamps (minimum level)
 * STATS = logs the request and response stats (e.g. consumed capacity)
 */
export type LogLevel = "REQ_ONLY" | "STATS" | "FULL";

/**
 *
 */
export type SessionLog = {
    timestamp: Date,
    input: string,
    getItemOutput?: DynamoDB.Types.GetItemOutput,
    putItemOutput?: DynamoDB.PutItemOutput,
    deleteItemOutput?: DynamoDB.DeleteItemOutput,
    queryOutput?: DynamoDB.Types.QueryOutput,
    error?: any
}

/**
 * The default session manager that flushes each operation immediately to the DB.
 *
 * @todo Make a separate implementation that makes use of the DynamoDB Transact API.
 */
export class SessionManager {

    private readonly db: DynamoDB;
    private readonly level: LogLevel;
    public readonly log = new Array<SessionLog>();

    constructor(options?: DynamoDB.Types.ClientConfiguration, level: LogLevel = "STATS") {
        this.level = level;
        this.db = new DynamoDB(options);
    }

    get lastLog(): SessionLog | undefined {
        return (this.log.length > 0) ? this.log[this.log.length - 1] : undefined;
    }

    async getItem(params: DynamoDB.Types.GetItemInput): Promise<PromiseResult<DynamoDB.Types.GetItemOutput, AWSError>> {
        try {
            if (this.level === "REQ_ONLY") {
                params.ReturnConsumedCapacity = undefined;
            } else {
                params.ReturnConsumedCapacity = "TOTAL";
            }

            const result = await this.db.getItem(params).promise();

            // remove memory-heavy result data.
            const {$response, ...logResult} = result;
            if (this.level !== "FULL") delete logResult.Item;
            this.log.push(SessionManager.createLog(params, {getItemOutput: logResult}));

            return result;
        } catch (ex) {
            this.log.push(SessionManager.createLog(params, {error: ex}));
            throw ex;
        }
    }

    async putItem(params: DynamoDB.PutItemInput): Promise<PromiseResult<DynamoDB.PutItemOutput, AWSError>> {
        try {
            if (this.level === "REQ_ONLY") {
                params.ReturnConsumedCapacity = undefined;
                params.ReturnItemCollectionMetrics = undefined;
            } else {
                params.ReturnConsumedCapacity = "TOTAL";
                params.ReturnItemCollectionMetrics = "SIZE";
            }

            const result = await this.db.putItem(params).promise();

            // remove memory-heavy result data.
            const {$response, ...logResult} = result;
            if (this.level !== "FULL") delete logResult.Attributes;
            this.log.push(SessionManager.createLog(params, {putItemOutput: logResult}));

            return result;
        } catch (ex) {
            this.log.push(SessionManager.createLog(params, {error: ex}));
            throw ex;
        }
    }

    async deleteItem(params: DynamoDB.DeleteItemInput): Promise<PromiseResult<DynamoDB.DeleteItemOutput, AWSError>> {
        try {
            if (this.level === "REQ_ONLY") {
                params.ReturnConsumedCapacity = undefined;
                params.ReturnItemCollectionMetrics = undefined;
            } else {
                params.ReturnConsumedCapacity = "TOTAL";
                params.ReturnItemCollectionMetrics = "SIZE";
            }

            const result = await this.db.deleteItem(params).promise();

            // remove memory-heavy result data.
            const {$response, ...logResult} = result;
            if (this.level !== "FULL") delete logResult.Attributes;
            this.log.push(SessionManager.createLog(params, {deleteItemOutput: logResult}));

            return result;
        } catch (ex) {
            this.log.push(SessionManager.createLog(params, {error: ex}));
            throw ex;
        }
    }

    async query(params: DynamoDB.Types.QueryInput): Promise<PromiseResult<DynamoDB.Types.QueryOutput, AWSError>> {
        try {
            if (this.level === "REQ_ONLY") {
                params.ReturnConsumedCapacity = undefined;
            } else {
                params.ReturnConsumedCapacity = "TOTAL";
            }

            const result = await this.db.query(params).promise();

            // remove memory-heavy result data.
            const {$response, ...logResult} = result;
            if (this.level !== "FULL") delete logResult.Items;
            this.log.push(SessionManager.createLog(params, {queryOutput: logResult}));

            return result;
        } catch (ex) {
            this.log.push(SessionManager.createLog(params, {error: ex}));
            throw ex;
        }
    }

    private static createLog(params: any, partial: Partial<SessionLog>): SessionLog {
        return {...partial, timestamp: new Date(), input: JSON.stringify(params)};
    }
}