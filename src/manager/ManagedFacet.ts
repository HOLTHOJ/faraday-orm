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

import {UNDEFINED} from "../util";
import {PathGenerator} from "../util/KeyPath";
import {one, req, single} from "../util/Req";
import {IdColumnDef} from "../annotation/Id";
import {FacetType} from "./FacetType";
import {EntityType} from "./EntityType";

/**
 * Creates a FacetProxy from an Facet/Entity class.
 * @param entityType The Entity type definition.
 */
export class ManagedFacet<E extends object> {

    /** The entity instance that is managed. */
    public readonly entity: E

    /** The entity type configuration. */
    public readonly entityType: EntityType

    /** The facet type used to compile the keys in this instance. */
    public readonly facetType ?: FacetType

    constructor(entityType: EntityType<E>, entity: E, query ?: string) {
        this.entity = entity
        this.entityType = entityType
        this.facetType = entityType.facets && one(entityType.facets?.filter(elt => elt.def.queryName === query))
    }

    public getValue(propName: PropertyKey): any {
        return (this.entity as any)[propName];
    };

    public setValue(propName: PropertyKey, value: any): void {
        (this.entity as any)[propName] = value;
    }

    /**
     * Reads the Id properties and returns their column definition and value.
     *
     * @param block             Block to iterate over each Id.
     * @param validateRequired  If TRUE then the value will be first validated against the column definition. Default
     *     is TRUE.
     */
    forEachId(block: (id: IdColumnDef, value: any, valueIsSet: boolean) => void, validateRequired: boolean = true): void {
        const pk = this.entityType.pk;
        const pkValue = this.getValue(pk.propName);
        if (validateRequired && pkValue === UNDEFINED) {
            throw new Error(`Missing required field ${pk.propName}.`);
        }
        block(pk, pkValue, pkValue !== UNDEFINED);

        if (this.facetType?.lsi) {
            const lsi = req(this.facetType.lsi);
            const sk = single(this.entityType.cols.filter(elt => elt.propName === lsi.propName));
            const skValue = this.getValue(sk.propName);
            if (validateRequired && skValue === UNDEFINED) {
                throw new Error(`Missing required field ${sk.propName.toString()}.`);
            }
            block({idType: "SK", ...sk}, skValue, skValue !== UNDEFINED);
        } else {
            const sk = req(this.entityType.sk);
            const skValue = this.getValue(sk.propName);
            if (validateRequired && skValue === UNDEFINED) {
                throw new Error(`Missing required field ${sk.propName}.`);
            }
            block(sk, skValue, skValue !== UNDEFINED);
        }
    }

    /**
     * Parses the key properties using this Facet instance.
     *
     * @param defaultGenerator Default generator used when the @Facet definition contains no generator.
     * @param queryName The query name defined on the @Facet definition.
     */
    compileKeys(defaultPathGenerator: PathGenerator): void {
        // NOTE : This is a replication of EntityProxyImpl.
        const keyPath = this.entityType.keyPath;
        if (typeof keyPath !== "undefined") {
            const pkPath = req(keyPath.pkPath);
            const pathGenerator = keyPath.pathGenerator || defaultPathGenerator;

            const pkCol = this.entityType.pk;
            const pkValue = pathGenerator.compile(this.entity, pkPath);
            this.setValue(pkCol.propName, pkValue);
        }

        if (typeof this.facetType?.def?.path !== "undefined") {
            const pathGenerator = this.facetType.def.pathGenerator || defaultPathGenerator;
            const lsiValue = pathGenerator.compile(this.entity, this.facetType.def.path);
            if (this.facetType?.lsi) {
                this.setValue(req(this.facetType.lsi).propName, lsiValue);
            } else {
                this.setValue(req(this.entityType.sk).propName, lsiValue);
            }
        }
    }

}