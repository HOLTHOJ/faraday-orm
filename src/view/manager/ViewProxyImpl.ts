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
import {ViewColumnDef, ViewIdColumnDef, ViewQueryDef, ViewSourceDef, ViewType} from "..";
import {EntityManager, EntityType} from "../../entity";
import {one, req, single} from "../../util/Req";
import {UNDEFINED} from "../../util";
import {PathGenerator} from "../../util/KeyPath";
import {VIEW_QUERY_DEF} from "../annotation/ViewQuery";

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

        // canLoadSource(entity: object): boolean {
        //     const source = this.getViewSource(entity);
        //     if (typeof source === "undefined") return false;
        //
        //     const sourceFunc = req(this.getValue(source.propName),
        //         `Missing source function ${source.propName}.`);
        //
        //     const loaded = sourceFunc.call(this, entity);
        //     return (typeof loaded === "boolean") ? loaded : false;
        //     // const entityProxy = EntityManager.internal(entity);
        //     // const sourceDefs = this.viewType.sources
        //     //     .filter(elt => elt.entityType === entityProxy.entityType)
        //     //     .filter(elt => elt.cond ? elt.cond(entityProxy) : true);
        //     // return (sourceDefs.length === 1);
        // }

        loadSource<E extends object>(source: ViewSourceDef<E>, entity: E, parseKeys: boolean = true, generator?: PathGenerator): boolean {
            // If source is not valid, then nothing to load
            // if (source.cond && !source.cond(entity)) return false;

            // Condition is valid - import source and parse keys (if requested).
            const sourceFunc = req(this.getValue(source.propName),
                `Missing source function ${source.propName}.`);

            const loaded = sourceFunc.call(this, entity);
            if (typeof loaded === "boolean" && !loaded) return false;

            if (parseKeys) {
                this._compileKeys(req(generator), source.keyPath.pkPath, source.keyPath.skPath);
            }

            return true;
        }

        getViewQuery(queryName: string): ViewQueryDef {
            return single(VIEW_QUERY_DEF.get(this.viewType.ctor)!.filter(elt => elt.name === queryName),
                `Invalid query name ${queryName}. Not found on ${viewType.ctor}.`);
        }

        getViewSource<E extends object>(entityType: EntityType<E>): ViewSourceDef<E> | undefined {
            return one(this.viewType.sources.filter(elt => elt.entityType === entityType),
                // .filter(elt => elt.cond ? elt.cond(sourceEntity) : true),
                `Missing source configuration for ${entityType}.`);
        }

        compileKeys(generator: PathGenerator, query: ViewQueryDef): void {
            this._compileKeys(generator, req(query.pk), query.sk);
        }

        _compileKeys(generator: PathGenerator, pkPath: string, skPath ?: string): void {
            const pk = generator.compile(this, pkPath);
            const pkCol = this.viewType.pk;
            this.setValue(pkCol.propName, pk);

            if (this.viewType.sk && skPath) {
                const sk = generator.compile(this, skPath);
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
