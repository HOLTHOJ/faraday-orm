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

import {DelegateDef, DelegateRef} from "../../annotation/Delegate";
import {ColumnProperty} from "../../util/property/ColumnProperty";
import {ObjectProperty} from "../../util/property/ObjectProperty";
import {EntityColumnProperty} from "../../util/property/EntityColumnProperty";

/** The full delegate type details. */
export type DelegateType<D extends object = any> = {

    /** The delegate class definition. */
    readonly def: DelegateDef<D>,

    /** All the columns defined on this entity type. */
    readonly cols: EntityColumnProperty<D, any>[],

    /** All the properties that will be exposed when calling JSON.stringify(). */
    readonly exposed: ObjectProperty<D, any>[],

    /** The callbacks defined on this entity. */
    readonly cbs: ObjectProperty<D, Function>[],

    /** References to other delegates. */
    readonly refs: DelegateRef[],

};