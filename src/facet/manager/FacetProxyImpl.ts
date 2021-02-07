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

import {FacetProxy, FacetProxyMethods} from "./FacetProxy";
import {EntityType, IdColumnDef} from "../../entity";
import {UNDEFINED} from "../../util";
import {PathGenerator} from "../../util/KeyPath";
import {DEFAULT, FacetType} from "../annotation/Facet";
import {req, single} from "../../util/Req";

/**
 * Creates a FacetProxy from an Facet/Entity class.
 * @param entityType The Entity type definition.
 */
export function createFacetProxy(entityType: EntityType): { new(): FacetProxy } {

    const newCtor = class extends entityType.def.ctor implements FacetProxyMethods {

        private _facetType ?: FacetType

        public get facetType(): FacetType {
            return req(this._facetType, `No facet was compiled yet.`);
        }

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

        forEachId(block: (id: IdColumnDef, value: any, valueIsSet: boolean) => void, validateRequired: boolean = true): void {
            const pk = this.entityType.pk;
            const pkValue = this.getValue(pk.propName);
            if (validateRequired && pkValue === UNDEFINED) {
                throw new Error(`Missing required field ${pk.propName}.`);
            }
            block(pk, pkValue, pkValue !== UNDEFINED);

            if (this.facetType.indexName === DEFAULT) {
                const sk = req(this.entityType.sk);
                const skValue = this.getValue(sk.propName);
                if (validateRequired && skValue === UNDEFINED) {
                    throw new Error(`Missing required field ${sk.propName}.`);
                }
                block(sk, skValue, skValue !== UNDEFINED);
            } else {
                const lsi = req(this.facetType.lsi);
                const sk = single(this.entityType.cols.filter(elt => elt.propName === lsi.propName));
                const skValue = this.getValue(sk.propName);
                if (validateRequired && skValue === UNDEFINED) {
                    throw new Error(`Missing required field ${sk.propName.toString()}.`);
                }
                block({idType: "SK", ...sk}, skValue, skValue !== UNDEFINED);
            }

        }

        compileKeys(defaultPathGenerator: PathGenerator, facetType: FacetType): void {
            this._facetType = facetType;

            // NOTE : This is a replication of EntityProxyImpl.
            const keyPath = this.entityType.keyPath;
            if (typeof keyPath !== "undefined") {
                const pkPath = req(keyPath.pkPath);
                const pathGenerator = keyPath.pathGenerator || defaultPathGenerator;

                const pkCol = this.entityType.pk;
                const pkValue = pathGenerator.compile(this, pkPath);
                this.setValue(pkCol.propName, pkValue);
            }

            if (typeof facetType.path !== "undefined") {
                const pathGenerator = facetType.pathGenerator || defaultPathGenerator;
                const lsiValue = pathGenerator.compile(this, facetType.path);
                if (facetType.indexName === DEFAULT) {
                    this.setValue(req(this.entityType.sk).propName, lsiValue);
                } else {
                    this.setValue(req(this.facetType.lsi).propName, lsiValue);
                }
            }
        }

    }

    Object.defineProperty(newCtor, "name", {value: entityType.def.ctor.name + "FacetProxy"});

    return newCtor;
}
