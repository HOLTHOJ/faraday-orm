import {DynamoDB} from "aws-sdk";
import {TransactionManager} from "../entity/manager/TransactionManager";
import {QueryInput} from "../entity/manager/TransactionCallback";
import {AttributeMapper} from "./mapper/AttributeMapper";

export class ResultSet<T extends object> implements AsyncIterable<T> {

    private readonly _query: QueryInput;
    private readonly _tx: TransactionManager;
    private readonly _loader: (elt: DynamoDB.AttributeMap) => T;

    // TODO : provide a chunkSize/pageSize parameter.
    constructor(query: QueryInput, tx: TransactionManager,
                loader: (elt: DynamoDB.Types.AttributeMap) => T) {
        this._query = query;
        this._tx = tx;
        this._loader = loader;
    }

    [Symbol.asyncIterator](): AsyncIterableIterator<T> {
        return this.createGenerator();
    }

    /**
     * Returns if this result set contains any items.
     * 
     * @return {Promise<boolean>}
     */
    async hasElements(): Promise<boolean> {
        const query = {...this._query, limit: 1};
        const result = await this._tx.query(query);
        return result.Count ? result.Count > 0 : false;
    }

    /**
     * Returns a new array of all the results in this result set.
     * If necessary this function will continue querying the db using the LastEvaluatedKey.
     *
     * This does not affect the iterators created from this result set.
     *
     * !! USE WITH CAUTION !!
     * If no cap amount is provided then this function will continue until all records are retrieved from the DB.
     * This could potentially be a very log running (and costly) operation.
     *
     * @param limit Limits the amount of items that are returned.
     *
     * @return {Promise<T[]>}
     */
    async toArray(limit ?: number): Promise<T[]> {
        const items = new Array<T>();
        for await (const item of this) {
            items.push(item);
            if (typeof limit === "number" && items.length >= limit) break;
        }
        return items;
    }

    private async* createGenerator(): AsyncGenerator<T, any, undefined> {
        let query: QueryInput = this._query;
        let result: DynamoDB.Types.QueryOutput | undefined = undefined;

        do {
            if (result?.LastEvaluatedKey) query = {
                ...query, exclusiveStartKey: new AttributeMapper(result.LastEvaluatedKey)
            }

            result = await this._tx.query(query);

            if (typeof result.Count !== undefined && Number(result.Count) > 0)
                yield * result.Items!.map(elt => this._loader(elt));
        } while (result.LastEvaluatedKey);

        return {done: true};
    }

}