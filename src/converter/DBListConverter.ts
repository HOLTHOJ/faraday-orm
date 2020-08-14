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

export type DBListLoader<T> = {
    load: (data: DynamoDB.Types.AttributeValue) => T
    save: (data: T) => DynamoDB.Types.AttributeValue
};

export const DBListConverter = <T>(type: DBListLoader<T>): DBConverter<T[]> => {

    return {
        convertFrom(value: DynamoDB.AttributeValue | undefined): T[] | undefined {
            // if (value && value.NULL) return null;
            if (value && value.L) return value.L.map((elt) => type.load(elt));

            return undefined;
        },

        convertTo(value: T[] | undefined): DynamoDB.AttributeValue | undefined {
            // if (value === null) return {NULL: true};
            if (typeof value === "undefined") return undefined;

            return {L: value.map((elt) => type.save(elt))};
        }

    }
};