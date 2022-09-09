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

import {UNDEFINED} from "../../util/index";
import {PathGenerator} from "../../util/KeyPath";
import {def, one, req} from "../../util/Req";
import {ViewType} from "./ViewType";
import {ViewColumnDef, ViewIdColumnDef, ViewQueryDef, ViewSourceDef} from "../../view/index";
import {EntityDef} from "../../annotation/Entity";
import {ViewTypeProxy} from "./ViewTypeProxy";

/**
 * @param entityType The Entity type definition.
 */
export class ViewTypeQueryProxy<E extends object> extends ViewTypeProxy<E>{

    public readonly query?: ViewQueryDef

    constructor(viewType: ViewType<E>, view?: E, query ?: string) {
        super(viewType, view)
        this.query = one(viewType.queries.filter(elt => elt.name === query))
    }

    /**
     * Parses the key properties using this Facet instance.
     *
     * @param defaultPathGenerator Default generator used when the @Facet definition contains no generator.
     */
    compileKeys(defaultPathGenerator: PathGenerator): void {
        if (typeof this.query === "undefined") return;

        const pathGenerator = this.query.pathGenerator || defaultPathGenerator;
        this._compileKeys(pathGenerator, req(this.query.pkPath), this.query.skPath);

        // const pkPath = req(this.query.pkPath);
        // const pkCol = req(this.viewType.pk);
        // const pkValue = pathGenerator.compile(this.view, pkPath);
        // this.setValue(pkCol.propName, pkValue);
        //
        // if (typeof this.query.skPath === "string") {
        //     const skPath = req(this.query.skPath);
        //     const skCol = req(this.viewType.sk);
        //     const skValue = pathGenerator.compile(this.view, skPath);
        //     this.setValue(skCol.propName, skValue);
        // }
    }

}