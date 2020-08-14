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

/**
 * The default DynamoDB converter for storing typekey values as S attributes.
 *
 * Typekeys are TypeScript string union types; e.g.
 * <pre>
 * export type Status = "ON" | "OFF";
 * </pre>
 */
export const TypekeyConverter = <T extends string>(types: T[]): Converter<T> => {

    return {
        convertFrom(value: DynamoDB.AttributeValue | undefined): T | undefined {
            if (typeof value === "undefined") return undefined;
            if (value.S && types.includes(value.S as T)) return value.S as T;

            return undefined;
        },

        convertTo(value: T | undefined): DynamoDB.AttributeValue | undefined {
            if (typeof value === "undefined") return undefined;
            if (value === null) return undefined;

            return (types.includes(value)) ? {S: value} : undefined;
        }
    }

};