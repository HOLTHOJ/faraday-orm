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
import {def, one, req, single, unique} from "../../util/Req";
import {TableDef} from "../TableConfig";
import {ViewType} from "./ViewType";
import {VIEW_IDS} from "../../view/annotation/ViewId";
import {VIEW_SOURCE_DEF} from "../../view/annotation/ViewSource";
import {VIEW_COLUMN_DEFS} from "../../view/annotation/ViewColumn";
import {VIEW_DEF, ViewDef} from "../../view/annotation/View";
import {VIEW_QUERY_DEF} from "../../view/annotation/ViewQuery";
import {ViewColumnProperty} from "../../util/property/ViewColumnProperty";
import {IdColumnProperty} from "../../util/property/IdColumnProperty";
import {ENTITY_EXPOSED} from "../../annotation/Exposed";
import {ObjectProperty} from "../../util/property/ObjectProperty";

export function loadViewTypes(tableName: string, tableDef: TableDef): Map<string, ViewType> {
    return tableDef.views.reduce((map, elt) => {
        const viewDef = req(VIEW_DEF.get(elt));

        if (map.has(viewDef.name))
            throw new Error(`Duplicate view type ${viewDef.name}.`);

        // try {
        const viewType = loadView(viewDef, tableDef, elt);

        // Enhance classes with ToJSON override (need to do this after loading facets).
        viewType.ctor.prototype.toJSON = function (key ?: string) {
            const json = {} as any

            // TODO : This can only control the exposure of properties on the entity itself.
            //        Referenced objects are exposed by the default stringify rules.
            viewType.exposed.forEach(elt => {
                // if (elt.exposed) {
                // @ts-ignore
                json[elt.def.propName] = this[elt.def.propName]
                // }
            })

            if (viewDef.options.exportTypeName) {
                json["_type"] = viewDef.name;
            }

            return json;
        }

        return map.set(viewDef.name, viewType);
        // } catch (e: any) {
        //     throw new Error(`Error loading views for ${tableName}: ${e.message}`);
        // }
    }, new Map<string, ViewType>())
}

export function loadView<E extends object>(viewDef: ViewDef, tableDef: TableDef, ctor: Class<E>): ViewType {
    const i = VIEW_IDS.get(ctor)?.slice() || [];
    const s = VIEW_SOURCE_DEF.get(ctor)?.slice() || [];
    const c = VIEW_COLUMN_DEFS.get(ctor)?.slice() || [];
    const q = VIEW_QUERY_DEF.get(ctor)?.slice() || [];
    const ex = ENTITY_EXPOSED.get(ctor)?.slice() || [];

    let proto = Object.getPrototypeOf(ctor);
    while (proto) {
        i.push(...(VIEW_IDS.get(proto) || []));
        s.push(...(VIEW_SOURCE_DEF.get(proto) || []));
        c.push(...(VIEW_COLUMN_DEFS.get(proto) || []));
        q.push(...(VIEW_QUERY_DEF.get(proto) || []));
        ex.push(...(ENTITY_EXPOSED.get(proto) || []));

        proto = Object.getPrototypeOf(proto);
    }

    const indexName = req(viewDef.indexName, `Missing required view index name: ${viewDef.indexName}.`)
    const index = req(tableDef.indexes[indexName], `Unable to find GSI: ${indexName}.`)

    const pkId = single(i.filter(elt => elt.idType === "PK"), `Missing required view PK column.`);
    const pkIndex = req(index.ids["PK"], `Missing required PK index on ${index.ids}.`);
    const pk = {...pkId, colName: pkIndex, exposed: true, internal: false, required: true};

    const skId = one(i.filter(elt => elt.idType === "SK"), `Illegal view SK column configuration.`);
    const skIndex = req(index.ids["SK"], `Missing required SK index on ${index.ids}.`);
    const sk = skId && {...skId, colName: skIndex, exposed: true, internal: false, required: true};

    if (viewDef.options.exportKeys) ex.push({propName: pkId.propName, exposed: true})
    if (viewDef.options.exportKeys && skId) ex.push({propName: skId.propName, exposed: true})

    unique(c, col => col.colName, true, (key) => `Duplicate column name ${key} not allowed. All columns: ${c.map(elt => elt.propName + "-" + elt.colName)}.`)
        .forEach(col => {
            // Set the internal flag
            // col.internal = int.findIndex(elt => elt.propName === col.propName) >= 0

            // Mark all columns that are not explicitly annotated as exposed by default
            if (ex.findIndex(elt => elt.propName === col.propName) < 0) {
                ex.push({propName: col.propName, exposed: true})
            }
        })

    return {
        ctor: ctor,
        indexProjections: def(index.projection, "ALL"),
        indexName: indexName,
        sources: s,
        columns: c.map(elt => new ViewColumnProperty(elt)),
        exposed: ex.filter(elt => elt.exposed).map(elt => new ObjectProperty(elt)),
        queries: q,
        pk: new IdColumnProperty(pk),
        sk: sk && new IdColumnProperty(sk),
    };

    // TODO : override the constructor prototype ?
}