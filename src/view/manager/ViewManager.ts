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

import {req} from "../../util/Req";
import {DynamoDB} from "aws-sdk";
import {ViewProxy} from "./ViewProxy";
import {AttributeMapper} from "../../util/mapper/AttributeMapper";
import {createViewProxy} from "./ViewProxyImpl";
import {VIEW_DEF, ViewType} from "../annotation/View";
import {EntityManager, EntityType} from "../../entity";
import {Class} from "../../util";
import {ConditionMapper} from "../../util/mapper/ConditionMapper";
import {QueryInput} from "../../entity/manager/TransactionCallback";
import {ResultSet} from "../../util/ResultSet";

/**
 * View manager.
 */
export class ViewManager {

    public readonly entityManager: EntityManager;

    private constructor(entityManager: EntityManager) {
        this.entityManager = entityManager;
    }

    static get(entityManager: EntityManager) {
        return new ViewManager(entityManager);
    }

    /**
     * Queries the View. The query name is used to lookup the correct @ViewQuery configuration
     * which defines the PK and SK paths to use. The View instance itself contains the values to use in the query
     * paths.
     *
     * @param view The View instance that from which the values that are needed to generate the query will be read.
     * @param queryName The name of the query needed to lookup the correct @ViewQuery annotation.
     */
    public queryView<V extends object>(view: V, queryName: string): ResultSet<V> {
        const mapper = new ConditionMapper();
        const defaultPathGenerator = this.entityManager.config.pathGenerator;

        const viewProxy = ViewManager.internal(view);
        const viewType = viewProxy.viewType;
        const viewQuery = viewProxy.getViewQuery(queryName);

        // Compile keys into their resp properties.
        viewProxy.compileKeys(defaultPathGenerator, viewQuery);

        // Extract the keys into a query condition.
        viewProxy.forEachId((id, value, valueIsSet) => {
            if (id.idType === "PK") {
                mapper.eq(id, value)
            } else if (valueIsSet) {
                mapper.apply(viewQuery.operation, id, value);
            }
        }, false);

        const queryInput: QueryInput = {indexName: viewType.indexName, record: viewProxy, item: mapper};

        return new ResultSet(queryInput, this.entityManager.transactionManager,
            (elt) => this.loadFromDB(viewType, elt));
    }

    /**
     * Creates a ViewProxy for every View this entity is defined on as a @ViewSource.
     * The ViewProxies will by default already load the sources into the View. Otherwise use the ViewProxy#loadSource
     * function to load the source into the View yourself.
     *
     * @param entity The entity for which to lookup Views.
     * @param loadSource If TRUE the given entity will immediately be loaded into the View. Default is TRUE.
     * @see ViewProxy#loadSource
     */
    // getViewsForSource<E extends object>(entity: E, loadSource: boolean = true): ViewProxy<any>[] {
    //     const entityType = EntityManager.internal(entity).entityType;
    //     const entityViewTypes = VIEW_SOURCE_ENTITIES.get(entityType) || [];
    //     return entityViewTypes.map(elt => {
    //         const view = ViewManager.loadView(elt);
    //         if (loadSource) {
    //             view.loadSource(entity, false, true, this.entityManager.config.pathGenerator);
    //         }
    //         return view;
    //     });
    // }

    // getViewsForSourceType<E extends object>(entityType: EntityType<E>): ViewProxy<any>[] {
    //     const entityViewTypes = VIEW_SOURCE_ENTITIES.get(entityType) || [];
    //     return entityViewTypes.map(elt => {
    //         return ViewManager.loadView(elt);
    //     });
    // }

    /**
     * Loads the View from the Dynamo DB AttributeMap.
     *
     * @param viewType
     * @param data
     */
    public loadFromDB<V extends object>(viewType: ViewType<V>, data: DynamoDB.AttributeMap): V {
        const view = ViewManager.loadView(viewType);
        const item = new AttributeMapper(data);

        // We always load the keys regardless of projected attributes.
        view.forEachId((id) => {
            view.setValue(id.propName, item.getRequiredValue(id));
        }, false);

        // If we are sure that all attributes are projected, we can create an Entity instance.
        // In order to create the entity instance we require the $type column, which is only guaranteed
        // to be present for PROJECTED_ALL. Next we load the source into the view.
        if (view.viewType.indexProjections === "PROJECTED_ALL") {
            const entityType = EntityManager.getEntityType(data);
            const viewSource = view.getViewSource(entityType);

            if (typeof viewSource === "undefined") {
                console.warn(`Entity type ${entityType.def.name} not defined as a source on view ${viewType.ctor.name}.`);
            } else {
                const entity = this.entityManager.loadFromDB(entityType, data);
                if (!view.loadSource(viewSource, entity, false)) {
                    console.warn(`Unable to load entity ${entity.entityType.def.name} as a source on view ${viewType.ctor.name}.`);
                }
            }
        }

        // If only custom attributes are projected, then load in the attributes that are annotated.
        if (view.viewType.indexProjections === "CUSTOM") {
            view.forEachColumn((col => {
                view.setValue(col.propName, item.getValue({name: col.name, converter: col.converter}));
            }));
        }

        return view;
    }

    /**
     *
     * @return {EntityType<E>}
     * @param view
     */
    static getViewType<V extends object>(view: Class<V> | Function): ViewType<V> {
        return req(VIEW_DEF.get(view) as ViewType<V>, `Class ${view} is not a View class.`);
    }

    /**
     * Creates a new View Proxy instance for the given View class.
     *
     * @param viewType The view class constructor or view type.
     * @throws Error If the given class is not a View class.
     */
    static loadView<V extends object>(viewType: ViewType<V> | Class<V> | Function): ViewProxy<V> {
        const type = (typeof viewType === "function") ? this.getViewType(viewType) : viewType;
        return new (createViewProxy(type))() as ViewProxy<V>;
    }

    /**
     * Tests if the given view is a managed view.
     * A managed view is a view that is first loaded by the View Manager,
     * and is enhanced with some additional technical methods needed by the View Manager.
     *
     * @param view The view instance to test.
     *
     * @see ViewManager#load
     * @return The same view type-casted as View Proxy if managed.
     */
    public static isManaged<E extends object>(view: E | ViewProxy<E>): view is ViewProxy<E> {
        return typeof (view as ViewProxy<E>).viewType !== "undefined";
    }

    /**
     * Casts the given view to a managed view, if the view instance is actually managed.
     *
     * @param view The view instance to cast.
     *
     * @throws Error if the given view instance is not a managed instance.
     *
     * @see ViewManager#load
     * @see ViewManager#isManaged
     * @return The same view type-casted as Entity Proxy if managed.
     */
    public static internal<X extends object>(view: X): ViewProxy<X> {
        if (this.isManaged(view)) return view;
        throw new Error(`View ${view.constructor} is not a managed view. Load it in the view manager first.`);
    }


}