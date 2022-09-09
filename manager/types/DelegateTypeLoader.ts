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

import {Class} from "../../util";
import {def, req, unique} from "../../util/Req";
import {ENTITY_COLS} from "../../annotation/Column";
import {ENTITY_INTERNAL} from "../../annotation/Internal";
import {ENTITY_CALLBACKS} from "../../annotation/Callback";
import {TableDef} from "../TableConfig";
import {ENTITY_EXPOSED} from "../../annotation/Exposed";
import {EntityType} from "./EntityType";
import {DELEGATE_DEF, DELEGATE_REF, DelegateDef, DelegateRef, FLATTEN} from "../../annotation/Delegate";
import {EntityManagerConfig} from "../EntityManagerImpl";
import {DelegateType} from "./DelegateType";
import {ObjectConverter} from "../../converter";
import {ColumnProperty} from "../../util/property/ColumnProperty";
import {EntityColumnProperty} from "../../util/property/EntityColumnProperty";
import {ObjectProperty} from "../../util/property/ObjectProperty";
import {Property} from "../../util/property/Property";

/**
 * Loads all the entity types defined in the given table definition.
 *
 * @param tableDef
 */
export function loadDelegateTypes(tableDef: TableDef): Map<Function, DelegateType> {
    return tableDef.delegates.reduce((map, elt) => {
        const delegateDef = req(DELEGATE_DEF.get(elt));

        if (map.has(delegateDef.ctor))
            throw new Error(`Duplicate delegate type ${delegateDef.name}.`);

        const delegateType = loadDelegateType(delegateDef, tableDef, elt);

        return map.set(delegateDef.ctor, delegateType);
    }, new Map<Function, DelegateType>())
}

/**
 * Loads a given delegate definition for a given table definition.
 *
 * @param delegateDef
 * @param tableDef
 * @param ctor
 */
export function loadDelegateType<E extends object>(delegateDef: DelegateDef, tableDef: TableDef, ctor: Class<E>): DelegateType {
    const cols = ENTITY_COLS.get(ctor)?.slice() || [];
    const int = ENTITY_INTERNAL.get(ctor)?.slice() || [];
    const ex = ENTITY_EXPOSED.get(ctor)?.slice() || [];
    const cb = ENTITY_CALLBACKS.get(ctor)?.slice() || [];
    const ref = DELEGATE_REF.get(ctor)?.slice() || [];

    // Collect all entity annotations in the constructor hierarchy.
    let proto = Object.getPrototypeOf(ctor);
    while (proto) {
        cols.push(...(ENTITY_COLS.get(proto) || []));
        int.push(...(ENTITY_INTERNAL.get(proto) || []));
        ex.push(...(ENTITY_EXPOSED.get(proto) || []));
        cb.push(...(ENTITY_CALLBACKS.get(proto) || []));
        ref.push(...(DELEGATE_REF.get(proto) || []));
        proto = Object.getPrototypeOf(proto);
    }

    unique(cols, col => col.colName, true, (key) => `Duplicate column name ${key} not allowed.`);
    cols.forEach(col => {
        // Set the internal flag
        col.internal = int.findIndex(elt => elt.propName === col.propName) >= 0

        // Mark all columns that are not explicitly annotated as exposed by default
        if (ex.findIndex(elt => elt.propName === col.propName) < 0) {
            ex.push({propName: col.propName, exposed: true})
        }
    })

    return {
        def: delegateDef,
        cols: cols.map(elt => new EntityColumnProperty(elt)),
        exposed: ex.map(elt => new ObjectProperty(elt)),
        cbs: cb.map(elt => new ObjectProperty(elt)),
        refs: ref,
    };
}

export function linkReferences(cf: EntityManagerConfig, entityType: EntityType, ctor: Class) {
    const refs = DELEGATE_REF.get(ctor) || [];

    // Collect all reference annotations in the constructor hierarchy.
    let proto = Object.getPrototypeOf(ctor);
    while (proto) {
        refs.push(...(DELEGATE_REF.get(proto) || []));
        proto = Object.getPrototypeOf(proto);
    }

    refs.forEach(ref => {
        linkRef(cf, entityType, entityType.def.ctor, ref);
    });

    //TODO : If references are flattened they could cause column name collisions.
}

export function linkRef(cf: EntityManagerConfig, entityType: EntityType, ctor: Class, ref: DelegateRef, root?: Property<any, any>) {
    const delegate = req(cf.delegateDef.get(ref.delegateType));
    const referenceRoot1: ObjectProperty<any, any> = ref.columnName === FLATTEN
        ? new ObjectProperty({propName: ref.propName}, root)
        : new ColumnProperty({
            propName: ref.propName,
            colName: def(ref.columnName, ref.propName),
            converter: ObjectConverter<any>()
        }, root);
    // const referenceRoot: IColumnReference<any, any, any> = ref.columnName === FLATTEN
    //     ? new IDColumnReference(ctor, {propName: ref.propName})
    //     : new ColumnReference(ctor, {
    //         propName: ref.propName,
    //         colName: def(ref.columnName, ref.propName),
    //         converter: ObjectConverter<any>()
    //     });

    linkDelegate(cf, entityType, delegate, referenceRoot1);
}

export function linkDelegate(cf: EntityManagerConfig, entityType: EntityType, delegate: DelegateType, root: Property<any, any>) {
    delegate.cols.forEach(col => entityType.cols.push(new EntityColumnProperty(col.def, root)));
    delegate.exposed.forEach(col => entityType.exposed.push(new ObjectProperty(col.def, root)));
    delegate.cbs.forEach(col => entityType.cbs.push(new ObjectProperty(col.def, root)));
    delegate.refs.forEach(ref => {
        linkRef(cf, entityType, delegate.def.ctor, ref);
    })
}
