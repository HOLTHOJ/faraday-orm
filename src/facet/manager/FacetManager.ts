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

import {req, single} from "../../util/Req";
import {Class} from "../../util";
import {EntityManager, EntityType} from "../../entity";
import {DEFAULT, FACET_REPO, FacetType} from "../annotation/Facet";
import {ConditionMapper} from "../../util/mapper/ConditionMapper";
import {TransactionManager} from "../../entity/manager/TransactionManager";
import {FacetProxy} from "./FacetProxy";
import {createFacetProxy} from "./FacetProxyImpl";
import {ResultSet} from "../../util/ResultSet";
import {QueryInput} from "../../entity/manager/TransactionCallback";

/**
 *
 */
export class FacetManager {

    public readonly entityManager: EntityManager;
    private readonly transactionManager: TransactionManager;

    private constructor(entityManager: EntityManager) {
        this.entityManager = entityManager;
        this.transactionManager = new TransactionManager(entityManager.session, entityManager.config);
    }

    static get(entityManager: EntityManager): FacetManager {
        return new FacetManager(entityManager);
    }

    public query<F extends object>(entity: F /*| EntityProxy<F>[]*/, queryName?: string): ResultSet<F> {
        const mapper = new ConditionMapper();
        const defaultPathGenerator = this.entityManager.config.pathGenerator;

        const facetProxy = FacetManager.internal(entity);
        const facetType = (typeof queryName !== "undefined")
            ? FacetManager.getFacetType(facetProxy.entityType, queryName)
            : FacetManager.getDefaultFacetType(facetProxy.entityType);

        // Compile the table keys.
        facetProxy.compileKeys(defaultPathGenerator, facetType);

        // Extract the keys into a query condition.
        facetProxy.forEachId((id, value, valueIsSet) => {
            if (id.idType === "PK") {
                mapper.eq(id, value)
            } else if (valueIsSet) {
                mapper.apply(facetType.operation, id, value);
            }
        }, false);

        const indexName = (facetType.indexName === DEFAULT) ? undefined : facetType.indexName;
        const queryInput: QueryInput = {indexName: indexName, record: facetProxy, item: mapper};

        return new ResultSet(queryInput, this.transactionManager,
            (elt) => this.entityManager.loadFromDB(facetProxy.entityType, elt));
    }


    /***************************************************************************************
     * STATIC UTIL FUNCTIONS
     ***************************************************************************************/

    /**
     * Tests if the given facet is a managed facet.
     * A managed facet is an facet that is first loaded by the FacetManager,
     * and is enhanced with some additional technical methods needed by the FacetManager.
     *
     * @param facet The facet instance to test.
     *
     * @see FacetManager#load
     * @return The same facet type-casted as FacetProxy if managed.
     */
    // public static isManaged<E extends object>(facet: E): facet is FacetProxy<E> {
    //     return facet instanceof createFacetProxy;
    // return (facet as FacetProxy<E>).facetType !== undefined;
    // }

    /**
     * Casts the given facet to a managed facet, if the facet instance is actually managed.
     *
     * @param facet The facet instance to cast.
     *
     * @throws Error if the given facet instance is not a managed instance.
     *
     * @see FacetManager#load
     * @see FacetManager#isManaged
     *
     * @return The same facet type-casted as FacetProxy if managed.
     */
    public static internal<X extends object>(facet: X): FacetProxy<X> {
        return facet as FacetProxy;
        // if (this.isManaged(facet)) return facet;
        // throw new Error(`Facet ${facet.constructor} is not a managed facet. Load it in the FacetManager first.`);
    }

    /**
     * Loads the given entity type into a managed entity instance.
     * Every entity type should first be loaded before it can be used in any of the Entity Manager's CRUD operations.
     *
     * @param entityType The entity type or class to load.
     *
     * @see EntityManager#getEntityType
     * @see FacetManager#getFacetType
     *
     * @return A new managed facet instance.
     */
    public static load<X extends object>(entityType: string | Class<X> | EntityType<X>): FacetProxy<X> {
        const eType = (typeof entityType === "function" || typeof entityType === "string")
            ? EntityManager.getEntityType(entityType) : entityType;
        return new (createFacetProxy(eType))();
    }

    /**
     * @param entity
     * @param queryName
     *
     * @return {EntityType<E>}
     */
    static getFacetType<F extends object>(entity: string | Class<F> | EntityType<F>, queryName: string): FacetType<F> {
        const entityType = (typeof entity === "function" || typeof entity === "string")
            ? EntityManager.getEntityType(entity) : entity;
        const entityFacets = req(FACET_REPO.get(entityType.def.ctor));
        return single(entityFacets.filter(elt => elt.queryName === queryName));
    }

    private static getDefaultFacetType<F extends object>(entityType: EntityType<F>): FacetType<F> {
        return {
            ctor: entityType.def.ctor,
            indexName: DEFAULT,
            operation: "EQ",
            queryName: "__default__",
        }
    }

}