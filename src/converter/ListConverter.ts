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

import {DynamoDB} from "aws-sdk";
import {Converter} from "./Converter";
import {AttributeValue} from "aws-sdk/clients/dynamodb";

/**
 * The default DynamoDB converter for storing a List of values as a L attribute.
 *
 * @param converter The converter used to convert each individual item of the collection.
 *                  If the converter returns UNDEFINED, then the item will be ignored.
 */
export const ListConverter = <T>(converter: Converter<T>): Converter<T[]> => {

    return {
        convertFrom(value: DynamoDB.AttributeValue | undefined): T[] | undefined {
            if (typeof value === "undefined") return undefined;

            if (value.L) return value.L.reduce((list, elt) => {
                const val = converter.convertFrom(elt);
                return (typeof val === "undefined") ? list : list.concat(val);
            }, new Array<T>());

            return undefined;
        },

        convertTo(value: T[] | undefined): DynamoDB.AttributeValue | undefined {
            if (value === null) return undefined;
            if (typeof value === "undefined") return undefined;

            return {
                L: value.reduce((list, elt) => {
                    const val = converter.convertTo(elt);
                    return (typeof val === "undefined") ? list : list.concat(val);
                }, new Array<AttributeValue>())
            };
        }

    }
};
