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
import {def, req} from "../../util/Req";
import {ViewType} from "./ViewType";
import {IdColumnProperty} from "../../util/property/IdColumnProperty";
import {OBJECT_DIM, ObjectProperty} from "../../util/property/ObjectProperty";
import {ColumnProperty} from "../../util/property/ColumnProperty";
import {ViewColumnProperty} from "../../util/property/ViewColumnProperty";

/**
 * Creates a FacetProxy from an Facet/Entity class.
 * @param entityType The Entity type definition.
 */
export class ViewTypeProxy<E extends object> {

    /** The view instance that is managed. */
    public readonly view: E

    /** The entity type configuration. */
    public readonly viewType: ViewType

    constructor(viewType: ViewType<E>, view?: E) {
        this.view = def(view, new viewType.ctor())
        this.viewType = viewType
    }

    public setValue<T>(prop: ObjectProperty<E, T>, value: T) {
        prop.evaluate(this.view, OBJECT_DIM).set(value, {generate: true, throwIfNotFound: false});
    }

    public getValue<T>(prop: ObjectProperty<E, T>): T {
        return prop.evaluate(this.view, OBJECT_DIM).get({generate: false, throwIfNotFound: false});
    }

    /**
     * Reads the Id properties and returns their column definition and value.
     *
     * @param block             Block to iterate over each Id.
     * @param validateRequired  If TRUE then the value will be first validated against the column definition. Default
     *     is TRUE.
     */
    forEachId(block: (id: IdColumnProperty<E>, value: any, valueIsSet: boolean) => void, validateRequired: boolean = true): void {
        const pk = this.viewType.pk;
        const pkValue = this.getValue(pk);
        if (validateRequired && pkValue === UNDEFINED) {
            throw new Error(`Missing required field ${pk.def.propName}.`);
        }
        block(pk, pkValue, pkValue !== UNDEFINED);

        if (this.viewType.sk) {
            const sk = this.viewType.sk;
            const skValue = this.getValue(sk);
            if (validateRequired && skValue === UNDEFINED) {
                throw new Error(`Missing required field ${sk.def.propName}.`);
            }
            block(sk, skValue, skValue !== UNDEFINED);
        }
    }

    forEachColumn(block: (col: ViewColumnProperty<E, any>, value: any, valueIsSet: boolean) => void, validateRequired: boolean = true): void {
        this.viewType.columns.forEach(col => {
            const value = this.getValue(col);
            if (validateRequired && col.def.required && value === UNDEFINED) {
                throw new Error(`Missing required field ${col.def.propName}.`);
            }
            block(col, value, value !== UNDEFINED);
        });
    }

    protected _compileKeys(pathGenerator: PathGenerator, pkPath: string, skPath ?: string): void {
        const pkCol = req(this.viewType.pk);
        const pkValue = pathGenerator.compile(this.view, pkPath);
        this.setValue(pkCol, pkValue);

        if (typeof skPath === "string") {
            const skCol = req(this.viewType.sk);
            const skValue = pathGenerator.compile(this.view, skPath);
            this.setValue(skCol, skValue);
        }
    }

}