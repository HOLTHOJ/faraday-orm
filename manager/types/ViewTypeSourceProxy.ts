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

import {PathGenerator} from "../../util/KeyPath";
import {def, one, req} from "../../util/Req";
import {ViewType} from "./ViewType";
import {ViewSourceDef} from "../../view";
import {ViewTypeProxy} from "./ViewTypeProxy";
import {EntityType} from "./EntityType";
import {ObjectProperty} from "../../util/property/ObjectProperty";

/**
 * Creates a FacetProxy from an Facet/Entity class.
 * @param entityType The Entity type definition.
 */
export class ViewTypeSourceProxy<E extends object, S extends object> extends ViewTypeProxy<E> {

    public readonly sourceDefinitions?: ViewSourceDef<S>[]

    constructor(viewType: ViewType<E>, sourceEntityType: EntityType<S>, view?: E) {
        super(viewType, view);
        this.sourceDefinitions = viewType.sources.filter(elt => elt.entityType === sourceEntityType?.def)
    }

    loadSource<E extends object>(source: S, parseKeys: boolean = true, defaultPathGenerator: PathGenerator): boolean {
        if (typeof this.sourceDefinitions === "undefined") return false;

        const sourceDef = one(this.sourceDefinitions.filter(elt => this.canLoadSource(elt, source)));
        if (typeof sourceDef === "undefined") return false;

        if (parseKeys) {
            const pathGenerator = def(sourceDef.keyPath.pathGenerator, defaultPathGenerator);
            this._compileKeys(pathGenerator, sourceDef.keyPath.pkPath, sourceDef.keyPath.skPath);
        }

        return true;
    }

    private canLoadSource(sourceDef: ViewSourceDef, source: S): boolean {
        // Condition is valid - import source and parse keys (if requested).
        const sourceProp = new ObjectProperty<E, Function>({propName: sourceDef.propName});
        const sourceFunc = req(this.getValue(sourceProp),
            `Missing source function ${sourceDef.propName}.`);

        const loaded = sourceFunc.call(this, source);
        return (typeof loaded !== "boolean" || loaded);
    }

}