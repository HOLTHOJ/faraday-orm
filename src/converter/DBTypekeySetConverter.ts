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
import {DBConverter} from "./DBConverter";

export type DBTypekeySetLoader<T> = {
    load: (data: DynamoDB.Types.StringAttributeValue) => T | undefined
    save: (data: T) => DynamoDB.Types.StringAttributeValue | undefined
};

export const DBTypekeySetConverter = <T>(type: DBTypekeySetLoader<T>): DBConverter<T[]> => {
    return {
        convertFrom(value: DynamoDB.AttributeValue | undefined): T[] | undefined {
            // if (value && value.NULL) return null;
            if (value && value.SS) return value.SS.reduce((arr, elt) => {
                const tk = type.load(elt);
                return (tk) ? arr.concat(tk) : arr;
            }, new Array<T>());

            return undefined;
        },

        convertTo(value: T[] | undefined): DynamoDB.AttributeValue | undefined {
            // if (value === null) return {NULL: true};
            if (typeof value === "undefined") return undefined;

            const ss = value.reduce((arr, elt) => {
                const tk = type.save(elt);
                return (tk) ? arr.concat(tk) : arr;
            }, new Array<DynamoDB.Types.StringAttributeValue>());

            return {SS: ss};
        }
    }

};
