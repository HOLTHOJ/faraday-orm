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

export type DBTypekeyLoader<T> = {
    load: (data: string) => T | undefined
    save: (data: T) => string | undefined
};

export const DBTypekeyConverter = <T>(type: DBTypekeyLoader<T>): DBConverter<T> => {

    return {
        convertFrom(value: DynamoDB.AttributeValue | undefined): T | undefined {
            // if (value && value.NULL) return null;
            if (value && value.S) return type.load(value.S);

            return undefined;
        },

        convertTo(value: T | undefined): DynamoDB.AttributeValue | undefined {
            // if (value === null) return {NULL: true};
            if (typeof value === "undefined") return undefined;

            const val = type.save(value);
            return (val) ? {S: val} : undefined;
        }
    }

};

export const DBTypekeyConverter2 = <T extends string>(types: T[]): DBConverter<T> => {

    return {
        convertFrom(value: DynamoDB.AttributeValue | undefined): T | undefined {
            // if (value && value.NULL) return null;
            if (value && value.S && types.includes(value.S as T)) return value.S as T;

            return undefined;
        },

        convertTo(value: T | undefined): DynamoDB.AttributeValue | undefined {
            // if (value === null) return {NULL: true};
            if (typeof value === "undefined") return undefined;
            if (!types.includes(value)) return undefined;

            return {S: value};
        }
    }

};