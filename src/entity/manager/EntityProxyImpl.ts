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

import {CallbackOperation, ColumnDef, EntityType} from "..";
import {EntityProxy, EntityProxyMethods} from "./EntityProxy";
import {UNDEFINED} from "../../util";
import {one, req} from "../../util/Req";
import {PathGenerator} from "../../util/KeyPath";
import {FACET_REPO, FacetType} from "../../facet/annotation/Facet";
import {SessionConfig} from "./SessionManager";
import {IdColumnDef} from "../annotation/Id";

/**
 * @internal Implementation of the EntityProxyMethods.
 *
 * Currently there is no clear need to create a subclass and force the user to first load the entity before
 * being able to use it. But this is already part of a preliminary architecture where we will need to override
 * the default functions on an object;
 *  - retrieve the EntityType configuration on the instance itself
 *  - toJSON should not by default export all public properties (e.g. decomposed key properties)
 *  - toJSON needs to export the entity type (if enabled)
 *  - toJSON needs to include delegate entities on the same level
 *  - resolve/lazy-load references
 *  - track changed properties for dynamodb update operations
 *  - ...
 *
 * Currently the user is required to create the proxy before populating any properties,
 * this could be perceived as cumbersome; maybe we should only wrap it into a proxy
 * for entities that are managed (returned) by the entity manager ?
 *
 *  NOTE: Subject to change in the future.
 */
export function createEntityProxy(entityType: EntityType<{}>): { new(): EntityProxy } {

    const newCtor = class extends entityType.def.ctor implements EntityProxyMethods {

        public get entityType(): EntityType {
            return entityType;
        }

        public getValue(propName: PropertyKey): any {
            // @ts-ignore
            return this[propName];
        };

        public setValue(propName: PropertyKey, value: any): void {
            // @ts-ignore
            this[propName] = value;
        }

        public getFacet(queryName: string): Readonly<FacetType> | undefined {
            const entityFacets = FACET_REPO.get(this.entityType.def.ctor);
            return entityFacets && one(entityFacets.filter(elt => elt.queryName === queryName));
        }

        public forEachId(block: (id: IdColumnDef, value: any, valueIsSet: boolean) => void, validateRequired: boolean = true): void {
            const pk = this.entityType.pk;
            const pkValue = this.getValue(pk.propName);
            if (validateRequired && pkValue === UNDEFINED) {
                throw new Error(`Missing required field ${pk.propName}.`);
            }
            block(pk, pkValue, pkValue !== UNDEFINED);

            const sk = this.entityType.sk;
            if (sk) {
                const skValue = this.getValue(sk.propName);
                if (validateRequired && skValue === UNDEFINED) {
                    throw new Error(`Missing required field ${sk.propName}.`);
                }
                block(sk, skValue, skValue !== UNDEFINED);
            }
        };

        public forEachCol<E>(block: (col: ColumnDef, value: any | undefined, valueIsSet: boolean) => void | boolean, validateRequired: boolean = true): void {
            this.entityType.cols.some(col => {
                const value = this.getValue(col.propName);
                if (validateRequired && col.required && value === UNDEFINED) {
                    throw new Error(`Missing required field ${col.propName}.`);
                }

                return block(col, value, value !== UNDEFINED);
            });
        }

        public executeCallbacks<E>(operation: CallbackOperation, config: SessionConfig) {
            this.entityType.cbs.forEach(cback => {
                this.getValue(cback.propName).call(this, operation, config);
            });
        }

        compileKeys(defaultPathGenerator: PathGenerator): void {
            if (typeof this.entityType.keyPath === "undefined") return;

            const pkPath = this.entityType.keyPath.pkPath;
            const skPath = this.entityType.keyPath.skPath;
            const pathGenerator = this.entityType.keyPath.pathGenerator || defaultPathGenerator;

            const pkCol = this.entityType.pk;
            const pkValue = pathGenerator.compile(this, req(pkPath));
            this.setValue(pkCol.propName, pkValue);

            if (this.entityType.sk) {
                const skCol = this.entityType.sk;
                const skValue = pathGenerator.compile(this, req(skPath));
                this.setValue(skCol.propName, skValue);
            }
        }

        parseKeys(defaultPathGenerator: PathGenerator): void {
            if (!this.entityType.keyPath) return;

            const pkPath = this.entityType.keyPath.pkPath;
            const skPath = this.entityType.keyPath.skPath;
            const pathGenerator = this.entityType.keyPath.pathGenerator || defaultPathGenerator;

            if (this.entityType.pk) {
                const pkCol = this.entityType.pk;
                const pkValue = this.getValue(pkCol.propName);
                const decompiledFields = pathGenerator.parse(pkValue, req(pkPath));
                Object.entries(decompiledFields).forEach(([key, val]) => {
                    this.setValue(key, val);
                })
            }

            if (this.entityType.sk) {
                const skCol = req(this.entityType.sk);
                const skValue = this.getValue(skCol.propName);
                const decompiledFields = pathGenerator.parse(skValue, req(skPath));
                Object.entries(decompiledFields).forEach(([key, val]) => {
                    this.setValue(key, val);
                })
            }
        }

        public toJSON(key ?: string): object {
            const json = {} as any

            this.entityType.exposed.forEach(elt => {
                if (elt.exposed) json[elt.propName] = this.getValue(elt.propName)
            })

            // this.forEachId((id, value, valueIsSet) => {
            //     if (id.exposed) json[id.propName] = value
            // })
            // this.forEachCol((col, value, valueIsSet) => {
            //     if (col.exposed) json[col.propName] = value
            // })

            return json;
        }
    }

    Object.defineProperty(newCtor, "name", {value: entityType.def.ctor.name + "Proxy"});

    return newCtor;
}
