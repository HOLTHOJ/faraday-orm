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
import {Converter as DynamodDBConverter} from "aws-sdk/clients/dynamodb";

/**
 * A serializer to store and load a DynamoDB AttributeMap into a Javascript object.
 */
export type ObjectSerializer<T extends object> = {
    load: (data: DynamoDB.Types.AttributeMap) => T
    save: (data: T) => DynamoDB.Types.AttributeMap
}

/**
 * The default DynamoDB Javascript converter.
 */
export const DEFAULT_SERIALIZER: ObjectSerializer<any> = {
    load: data => {
        return DynamodDBConverter.unmarshall(data)
    },
    save: data => {
        return DynamodDBConverter.marshall(data)
    }
}

/**
 * A DynamoDB converter for storing objects as M attributes.
 */
export const ObjectConverter = <T extends object>(type: ObjectSerializer<T> = DEFAULT_SERIALIZER): Converter<T> => {

    return {
        convertFrom(value: DynamoDB.AttributeValue | undefined): T | undefined {
            if (typeof value === "undefined") return undefined;
            if (value.M) return type.load(value.M);

            return undefined;
        },

        convertTo(value: T | undefined): DynamoDB.AttributeValue | undefined {
            if (typeof value === "undefined") return undefined;
            if (value === null) return undefined;

            return {M: type.save(value)};
        }
    }

};