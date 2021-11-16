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


import {Class} from "../util";
import {one, req, single} from "../util/Req";
import {TableDef} from "./TableConfig";
import {ViewType} from "./ViewType";
import {VIEW_IDS} from "../view/annotation/ViewId";
import {VIEW_SOURCE_DEF} from "../view/annotation/ViewSource";
import {VIEW_COLUMN_DEFS} from "../view/annotation/ViewColumn";
import {VIEW_DEF, ViewDef} from "../view/annotation/View";
import {VIEW_QUERY_DEF} from "../view/annotation/ViewQuery";

export function loadViewTypes(tableDef: TableDef): Map<string, ViewType> {
    return tableDef.views.reduce((map, elt) => {
        const viewDef = req(VIEW_DEF.get(elt));

        if (map.has(viewDef.name))
            throw new Error(`Duplicate view type ${viewDef.name}.`);

        const viewType = loadView(viewDef, tableDef, elt);
        return map.set(viewType.indexName, viewType);
    }, new Map<string, ViewType>())
}

export function loadView<E extends object>(viewDef: ViewDef, tableDef: TableDef, ctor: Class<E>): ViewType {
    const i = VIEW_IDS.get(ctor) || [];
    const s = VIEW_SOURCE_DEF.get(ctor) || [];
    const c = VIEW_COLUMN_DEFS.get(ctor) || [];
    const q = VIEW_QUERY_DEF.get(ctor) || [];

    let proto = Object.getPrototypeOf(ctor);
    while (proto) {
        i.push(...(VIEW_IDS.get(proto) || []));
        s.push(...(VIEW_SOURCE_DEF.get(proto) || []));
        c.push(...(VIEW_COLUMN_DEFS.get(proto) || []));
        q.push(...(VIEW_QUERY_DEF.get(proto) || []));

        proto = Object.getPrototypeOf(proto);
    }

    const indexName = req(viewDef.indexName)
    const index = req(tableDef.indexes[indexName])

    return {
        ctor: ctor,
        indexProjections: req(index.projection),
        indexName: indexName,
        sources: s,
        columns: c,
        queries: q,
        pk: single(i.filter(elt => elt.idType === "PK")),
        sk: one(i.filter(elt => elt.idType === "SK")),
    };

    // TODO : override the constructor prototype ?
}