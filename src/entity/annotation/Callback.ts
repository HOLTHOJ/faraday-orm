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

/** */
export type CallbackOperation = "LOAD" | "GET" | "INSERT" | "UPDATE" | "DELETE";

/** */
export type CallbackDef = { propName: string, descriptor: PropertyDescriptor };

/** */
export const ENTITY_CALLBACKS = new Map<Function, CallbackDef[]>();

/**
 * Configures a function to be a Callback function. Callback functions are triggered by the EntityManager.
 *
 * <todo>
 */
export function Callback() {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {

        const callbackDef: CallbackDef = {
            propName: propertyKey,
            descriptor: descriptor,
        };

        if (ENTITY_CALLBACKS.has(target.constructor)) {
            ENTITY_CALLBACKS.get(target.constructor)!.push(callbackDef);
        } else {
            ENTITY_CALLBACKS.set(target.constructor, [callbackDef]);
        }
    }
}
