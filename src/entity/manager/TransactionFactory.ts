import {EntityManagerConfig} from "./EntityManager";
import {TransactionCallback} from "./TransactionCallback";

export interface TransactionFactory {

    /**
     * Creates a new transaction to execute a single database call within a given session.
     *
     * The transaction callbacks are generated when the Entity Manager is instantiated,
     * which means that any factories that are registered afterwards are not available
     * until a new Entity manager is instantiated.
     *
     * @param {EntityManagerConfig} session
     * @return {TransactionCallback}
     */
    createTransaction(session: EntityManagerConfig): TransactionCallback

}
