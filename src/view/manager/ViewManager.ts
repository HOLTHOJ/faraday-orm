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
import {DynamoDB} from "aws-sdk";
import {ViewProxy} from "./ViewProxy";
import {AttributeMapper} from "../../util/mapper/AttributeMapper";
import {createViewProxy} from "./ViewProxyImpl";
import {VIEW_DEF, VIEW_SOURCE_ENTITIES, ViewType} from "../annotation/View";
import {VIEW_QUERY_DEF} from "../annotation/ViewQuery";
import {EntityManager} from "../../entity/manager/EntityManager";
import {Class} from "../../util/Class";
import {EntityType} from "../../entity";

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
     *
     * @return {EntityType<E>}
     * @param view
     */
    static getViewType<V extends object>(view: Class<V> | Function): ViewType<V> {
        return req(VIEW_DEF.get(view) as ViewType<V>, `Class ${view.name} is not a View class.`);
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
     * Queries the View. The query name is used to lookup the correct @ViewQuery configuration
     * which defines the PK and SK paths to use. The View instance itself contains the values to use in the query paths.
     *
     * @param view      The View instance that from which the values that are needed to generate the query will be read.
     * @param queryName The name of the query needed to lookup the correct @ViewQuery annotation.
     */
    public async queryView<V extends object>(view: ViewProxy<V>, queryName: string): Promise<V[]> {
        const viewType = view.viewType;
        const viewQuery = single(VIEW_QUERY_DEF.get(viewType.ctor)!.filter(elt => elt.name === queryName),
            `Invalid query name ${queryName}. Not found on ${viewType.ctor}.`);

        view.parseKeys(this.entityManager.config.pathGenerator, viewQuery.pk, viewQuery.sk);

        const queryInput: DynamoDB.QueryInput = {
            TableName: this.entityManager.config.tableName,
            IndexName: viewType.indexName,
            KeyConditions: {}
        }

        view.forEachId((id, value, valueIsSet) => {
            if (valueIsSet) {
                queryInput.KeyConditions![id.name] = {
                    ComparisonOperator: (id.idType === "PK") ? "EQ" : viewQuery.operation,
                    AttributeValueList: [req(id.converter.convertTo(value))]
                }
            }
        }, false);

        const data = await new DynamoDB().query(queryInput).promise();

        // TODO : Implement optional aggregator.
        return (data.Items || []).map(elt => this.loadFromDB(viewType, elt));
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
    getViewsForSource<E extends object>(entity: E, loadSource: boolean = true): ViewProxy<any>[] {
        const entityType = EntityManager.internal(entity).entityType;
        const entityViewTypes = VIEW_SOURCE_ENTITIES.get(entityType) || [];
        return entityViewTypes.map(elt => {
            const view = ViewManager.loadView(elt);
            if (loadSource) {
                view.loadSource(entity, false, true, this.entityManager.config.pathGenerator);
            }
            return view;
        });
    }

    getViewsForSourceType<E extends object>(entityType: EntityType<E>): ViewProxy<any>[] {
        const entityViewTypes = VIEW_SOURCE_ENTITIES.get(entityType) || [];
        return entityViewTypes.map(elt => {
            return ViewManager.loadView(elt);
        });
    }

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
            const entity = this.entityManager.loadFromDB(entityType, data);
            if (!view.canLoadSource(entity)) {
                throw new Error(`Unable to load entity ${entity.entityType.def.name} as a source on view ${viewType.ctor.name}.`);
            }
            view.loadSource(entity, true, false);
        }

        // If only custom attributes are projected, then load in the attributes that are annotated.
        if (view.viewType.indexProjections === "CUSTOM") {
            view.forEachColumn((col => {
                view.setValue(col.propName, item.getValue({name: col.name, converter: col.converter}));
            }));
        }

        return view;
    }

}