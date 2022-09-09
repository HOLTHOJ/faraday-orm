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

import {unique} from "../util/Req";

/** The definition. */
export type ExposedDef = {

    /** The property name. */
    propName: string,

    /** Exposes this property or not. */
    exposed: boolean,

};

/** @internal Repository of all exposed properties and the constructor function on which they are defined. */
export const ENTITY_EXPOSED = new Map<Function, ExposedDef[]>();

/**
 * Configures a property to be exposed  when calling JSON.stringify().
 *
 * By default;
 *  - all @Id and @Column properties are exposed
 *  - all other local class properties are not exposed
 *
 * These defaults can be overridden by applying this annotation with exposed TRUE/FALSE parameter.
 */
export function Exposed<T>(exposed: boolean = true) {
    return (target: any, propertyKey: string) => {

        const exposedDef: ExposedDef = {
            propName: propertyKey,
            exposed: exposed,
        };

        if (ENTITY_EXPOSED.has(target.constructor)) {
            const exposeds = ENTITY_EXPOSED.get(target.constructor)!.concat(exposedDef);
            unique(exposeds, elt => elt.propName, true);

            ENTITY_EXPOSED.set(target.constructor, exposeds);
        } else {
            ENTITY_EXPOSED.set(target.constructor, [exposedDef]);
        }
    }
}