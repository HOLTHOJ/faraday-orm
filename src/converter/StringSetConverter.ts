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
 * A DynamoDB converter for storing an array of string values as SS attribute.
 *
 * The DynamoDB spec says that the SS attribute cannot be an empty array. This is, however,
 * not validated by this converter and will instead be reported as an error by the DynamoDB layer itself.
 */
export const StringSetConverter: Converter<string[]> = {

    convertFrom(value: DynamoDB.AttributeValue | undefined): string[] | undefined {
        if (typeof value === "undefined") return undefined;
        if (value.SS) return value.SS;

        return undefined;
    },

    convertTo(value: string[] | undefined): DynamoDB.AttributeValue | undefined {
        if (typeof value === "undefined") return undefined;
        if (value === null) return undefined;

        return {SS: value};
    }

};
