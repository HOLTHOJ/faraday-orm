import {DynamoDB} from "aws-sdk";
// import {QueryInput} from "../manager/TransactionCallback";
import {SessionManager} from "../manager/SessionManager";

export class ResultSet<T extends object> implements AsyncIterable<T> {

    private readonly query: DynamoDB.Types.QueryInput;
    private readonly session: SessionManager;
    private readonly loader: (elt: DynamoDB.AttributeMap) => T;

    // TODO : provide a chunkSize/pageSize parameter.
    constructor(query: DynamoDB.Types.QueryInput, session: SessionManager,
                loader: (elt: DynamoDB.Types.AttributeMap) => T) {
        this.query = query;
        this.session = session;
        this.loader = loader;
    }

    [Symbol.asyncIterator](): AsyncIterableIterator<T> {
        return this.createGenerator();
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
        // TODO : Optimize further to avoid retrieving records that won't be needed.
        const items = new Array<T>();
        for await (const item of this) {
            if (typeof limit === "number" && items.length >= limit) break;
            items.push(item);
        }
        return items;
    }

    private async* createGenerator(): AsyncGenerator<T, any, undefined> {
        console.debug("Creating new generator", this.query);

        let query: DynamoDB.QueryInput = this.query;
        let result: DynamoDB.Types.QueryOutput | undefined = undefined;

        do {
            if (result?.LastEvaluatedKey) query = {
                ...query, ExclusiveStartKey: result.LastEvaluatedKey
            }

            result = await this.session.query(query);

            if (typeof result.Count !== undefined && Number(result.Count) > 0) {
                yield* result.Items!.map(elt => this.loader(elt));
            }

        } while (result.LastEvaluatedKey);

        return {done: true};
    }

}