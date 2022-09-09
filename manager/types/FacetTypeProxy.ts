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

import {UNDEFINED} from "../../util";
import {PathGenerator} from "../../util/KeyPath";
import {one, req, single} from "../../util/Req";
import {FacetType} from "./FacetType";
import {EntityType} from "./EntityType";
import {IdColumnProperty} from "../../util/property/IdColumnProperty";
import {Property} from "../../util/property/Property";
import {OBJECT_DIM} from "../../util/property/ObjectProperty";

/**
 * Creates a FacetProxy from an Facet/Entity class.
 * @param entityType The Entity type definition.
 */
export class FacetTypeProxy<E extends object> {

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

    public setValue<T>(prop: Property<E, T>, value: T) {
        prop.evaluate(this.entity, OBJECT_DIM).set(value, {generate: true, throwIfNotFound: false});
    }

    public getValue<T>(prop: Property<E, T>): T {
        return prop.evaluate(this.entity, OBJECT_DIM).get({generate: false, throwIfNotFound: false});
    }

    /**
     * Reads the Id properties and returns their column definition and value.
     *
     * @param block             Block to iterate over each Id.
     * @param validateRequired  If TRUE then the value will be first validated against the column definition. Default
     *     is TRUE.
     */
    forEachId(block: (id: IdColumnProperty<E>, value: any, valueIsSet: boolean) => void, validateRequired: boolean = true): void {
        const pk = this.entityType.key.pk;
        // const pkValue = pk.getPropertyValue(this.entity);
        const pkValue = this.getValue(pk);
        if (validateRequired && pkValue === UNDEFINED) {
            throw new Error(`Missing required field ${pk.def.propName}.`);
        }
        block(pk, pkValue, pkValue !== UNDEFINED);

        if (this.facetType?.lsi) {
            const lsi = req(this.facetType.lsi);
            // const sk = single(this.entityType.cols.filter(elt => elt.def.propName === lsi.def.propName));
            // const skValue = sk.getPropertyValue(this.entity);
            const skValue = this.getValue(lsi);
            if (validateRequired && skValue === UNDEFINED) {
                throw new Error(`Missing required field ${lsi.def.propName.toString()}.`);
            }
            block(lsi, skValue, skValue !== UNDEFINED);
        } else {
            const sk = req(this.entityType.key.sk);
            // const skValue = sk.getPropertyValue(this.entity);
            const skValue = this.getValue(sk);
            if (validateRequired && skValue === UNDEFINED) {
                throw new Error(`Missing required field ${sk.def.propName}.`);
            }
            block(sk, skValue, skValue !== UNDEFINED);
        }
    }

    /**
     * Parses the key properties using this Facet instance.
     *
     * @param defaultPathGenerator Default generator used when the @Facet definition contains no generator.
     */
    compileKeys(defaultPathGenerator: PathGenerator): void {
        // NOTE : This is a replication of EntityProxyImpl.
        const keyPath = this.entityType.key.keyPath;
        if (typeof keyPath !== "undefined") {
            const pkPath = req(keyPath.pkPath);
            const pathGenerator = keyPath.pathGenerator || defaultPathGenerator;

            const pkCol = this.entityType.key.pk;
            const pkValue = pathGenerator.compile(this.entity, pkPath);
            // pkCol.setPropertyValue(this.entity, pkValue);
            this.setValue(pkCol, pkValue);
        }

        if (typeof this.facetType?.def?.path !== "undefined") {
            const pathGenerator = this.facetType.def.pathGenerator || defaultPathGenerator;
            const lsiValue = pathGenerator.compile(this.entity, this.facetType.def.path);
            if (this.facetType?.lsi) {
                // TODO : refactor to use references.
                this.setValue(req(this.facetType.lsi), lsiValue);
            } else {
                // req(this.entityType.key.sk).setPropertyValue(this.entity, lsiValue);
                this.setValue(req(this.entityType.key.sk), lsiValue);
            }
        }
    }

}