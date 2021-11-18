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
import {def, one, req} from "../util/Req";
import {ViewType} from "./ViewType";
import {ViewColumnDef, ViewIdColumnDef, ViewQueryDef, ViewSourceDef} from "../view";
import {EntityDef} from "../annotation/Entity";

/**
 * Creates a FacetProxy from an Facet/Entity class.
 * @param entityType The Entity type definition.
 */
export class ViewTypeProxy<E extends object> {

    /** The view instance that is managed. */
    public readonly view: E

    /** The entity type configuration. */
    public readonly viewType: ViewType

    public readonly query?: ViewQueryDef

    constructor(viewType: ViewType<E>, view?: E, query ?: string) {
        this.view = def(view, new viewType.ctor())
        this.viewType = viewType
        this.query = one(viewType.queries.filter(elt => elt.name === query))
    }

    public getValue(propName: PropertyKey): any {
        return (this.view as any)[propName];
    };

    public setValue(propName: PropertyKey, value: any): void {
        (this.view as any)[propName] = value;
    }

    /**
     * Reads the Id properties and returns their column definition and value.
     *
     * @param block             Block to iterate over each Id.
     * @param validateRequired  If TRUE then the value will be first validated against the column definition. Default
     *     is TRUE.
     */
    forEachId(block: (id: ViewIdColumnDef, value: any, valueIsSet: boolean) => void, validateRequired: boolean = true): void {
        const pk = this.viewType.pk;
        const pkValue = this.getValue(pk.propName);
        if (validateRequired && pkValue === UNDEFINED) {
            throw new Error(`Missing required field ${pk.propName}.`);
        }
        block(pk, pkValue, pkValue !== UNDEFINED);

        if (this.viewType.sk) {
            const sk = this.viewType.sk;
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

    /**
     * Parses the key properties using this Facet instance.
     *
     * @param defaultPathGenerator Default generator used when the @Facet definition contains no generator.
     */
    compileKeys(defaultPathGenerator: PathGenerator): void {
        if (typeof this.query === "undefined") return;

        const pathGenerator = this.query.pathGenerator || defaultPathGenerator;

        const pkPath = req(this.query.pkPath);
        const pkCol = req(this.viewType.pk);
        const pkValue = pathGenerator.compile(this.view, pkPath);
        this.setValue(pkCol.propName, pkValue);

        if (typeof this.query.skPath === "string") {
            const skPath = req(this.query.skPath);
            const skCol = req(this.viewType.sk);
            const skValue = pathGenerator.compile(this.view, skPath);
            this.setValue(skCol.propName, skValue);
        }
    }

    getViewSource<E extends object>(entityType: EntityDef<E>): ViewSourceDef<E> | undefined {
        return one(this.viewType.sources.filter(elt => elt.entityType === entityType),
            `Missing source configuration for ${entityType}.`);
    }

    loadSource<E extends object>(source: ViewSourceDef<E>, entity: E, parseKeys: boolean = true, generator?: PathGenerator): boolean {
        // If source is not valid, then nothing to load
        // if (source.cond && !source.cond(entity)) return false;

        // Condition is valid - import source and parse keys (if requested).
        const sourceFunc = req(this.getValue(source.propName),
            `Missing source function ${source.propName}.`);

        const loaded = sourceFunc.call(this, entity);
        if (typeof loaded === "boolean" && !loaded) return false;

        if (parseKeys) {
            // this.compileKeys(req(generator), source.keyPath.pkPath, source.keyPath.skPath);
        }

        return true;
    }

}