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

import {CallbackOperation, ColumnDef, EntityType, IdColumnDef} from "..";
import {EntityProxy} from "./EntityProxy";
import {UNDEFINED} from "../../util/Undefined";

export function createEntityProxy(ctor: { new(...args: any[]): {} }, entityType: EntityType): { new(): EntityProxy } {

    const newCtor = class extends ctor implements EntityProxy {

        static create(): any {
            console.error("Creates new instance ?")
            return undefined;
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

        public forEachCol<E>(block: (col: ColumnDef, value: any | undefined, valueIsSet: boolean) => void, validateRequired: boolean = true): void {
            this.entityType.cols.forEach(col => {
                const value = this.getValue(col.propName);
                if (validateRequired && col.required && value === UNDEFINED) {
                    throw new Error(`Missing required field ${col.propName}.`);
                }

                block(col, value, value !== UNDEFINED);
            });
        }

        public executeCallbacks<E>(operation: CallbackOperation) {
            this.entityType.cback.forEach(cback => {
                this.getValue(cback.propName).call(this, operation);
            });
        }

        public toJSON(key ?: string): object {
            if (this.entityType.toJSON) {
                return this.entityType.toJSON.value.call(this, key);
            }

            return {};

            // const exposed = ExposedUtil.getAllExposedProps(this.entityType.def.ctor);
            // return exposed?.reduce((obj, elt) => {
            //     const value = this.getValue(elt.propName);
            //     obj[elt.name] = (typeof value !== "undefined" && elt.converter)
            //         ? elt.converter.toPrimitive(value) : value;
            //     return obj;
            // }, {} as any)
        }
    }

    Object.defineProperty(newCtor, "name", {value: ctor.name + "Proxy"});

    return newCtor;
}
