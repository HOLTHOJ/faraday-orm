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

import {ViewProxy, ViewProxyMethods} from "./ViewProxy";
import {ViewColumnDef, ViewIdColumnDef, ViewType} from "..";
import {EntityManager} from "../../entity";
import {one, req} from "../../util/Req";
import {UNDEFINED} from "../../util/Undefined";
import {compile} from "path-to-regexp";
import {PathGenerator} from "../../util/KeyPath";

/**
 * Creates a ViewProxy from a View class.
 * @param viewType The View type definition.
 */
export function createViewProxy(viewType: ViewType): { new(): ViewProxy } {

    const newCtor = class extends viewType.ctor implements ViewProxyMethods {

        public get viewType(): ViewType {
            return viewType;
        }

        public getValue(propName: PropertyKey): any {
            // @ts-ignore
            return this[propName];
        };

        public setValue(propName: PropertyKey, value: any): void {
            // @ts-ignore
            this[propName] = value;
        }

        forEachId(block: (id: ViewIdColumnDef, value: any, valueIsSet: boolean) => void, validateRequired: boolean = true): void {
            const pk = this.viewType.pk;
            const pkValue = this.getValue(pk.propName);
            if (validateRequired && pkValue === UNDEFINED) {
                throw new Error(`Missing required field ${pk.propName}.`);
            }
            block(pk, pkValue, pkValue !== UNDEFINED);

            const sk = this.viewType.sk;
            if (sk) {
                const skValue = this.getValue(sk.propName);
                if (validateRequired && skValue === UNDEFINED) {
                    throw new Error(`Missing required field ${sk.propName}.`);
                }
                block(sk, skValue, skValue !== UNDEFINED);
            }
        }

        forEachColumn(block: (col: ViewColumnDef, value: any, valueIsSet: boolean) => void, validateRequired: boolean = true): void {
            this.viewType.columns.forEach(col => {
                const value = this.getValue(col.propName);
                if (validateRequired && col.required && value === UNDEFINED) {
                    throw new Error(`Missing required field ${col.propName}.`);
                }
                block(col, value, value !== UNDEFINED);
            });
        }

        canLoadSource(entity: object): boolean {
            const entityProxy = EntityManager.internal(entity);
            const sourceDefs = this.viewType.sources
                .filter(elt => elt.entityType === entityProxy.entityType)
                .filter(elt => elt.cond ? elt.cond(entityProxy) : true);
            return (sourceDefs.length === 1);
        }

        loadSource(entity: object, validateCondition: boolean = false, parseSk: boolean = true, generator?: PathGenerator): void {
            const entityProxy = EntityManager.internal(entity);
            const entityType = entityProxy.entityType;
            const sourceDef = one(this.viewType.sources
                    .filter(elt => elt.entityType === entityProxy.entityType)
                    .filter(elt => elt.cond ? elt.cond(entity) : true),
                `Missing source configuration for ${entityType}.`);

            if (validateCondition && typeof sourceDef === "undefined") {
                throw new Error(`Entity ${entityProxy.entityType.def.ctor.name} cannot be loaded into view ${this.viewType.ctor.name}.`);
            }

            // No source definition found, or condition failed, so nothing to load.
            if (typeof sourceDef === "undefined") return;

            const sourceFunc = req(this.getValue(sourceDef.propName),
                `Missing source function ${sourceDef.propName}.`);
            sourceFunc.call(this, entity);

            if (parseSk) {
                this.parseKeys(req(generator), sourceDef.keyPath.pkPath, sourceDef.keyPath.skPath);
            }
        }

        parseKeys(generator: PathGenerator, pkPath: string, skPath ?: string): void {
            const pk = compile(pkPath)(this);
            const pkCol = this.viewType.pk;
            this.setValue(pkCol.propName, pk);

            if (this.viewType.sk && skPath) {
                const sk = compile(skPath)(this);
                const skCol = this.viewType.sk;
                this.setValue(skCol.propName, sk);
            }
        }

        toJSON(): object {
            switch (this.viewType.indexProjections) {
                case "KEYS_ONLY":
                    const ids = {} as Record<string, any>;
                    this.forEachId((id, value, valueIsSet) => {
                        if (valueIsSet) ids[id.propName] = value;
                    });
                    return ids;
                default:
                    const cols = {} as Record<string, any>;
                    this.forEachColumn((col, value, valueIsSet) => {
                        if (valueIsSet) cols[col.propName] = value;
                    })
                    return cols;
            }

            throw new Error(`Invalid Index Projections definition.`);
        }
    }

    Object.defineProperty(newCtor, "name", {value: viewType.ctor.name + "Proxy"});

    return newCtor;
}
