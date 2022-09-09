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
 * A DynamoDB converter for storing boolean values as B attributes.
 *
 * This is a strict boolean converter; it only accepts and writes to B attributes.
 * Boolean values could also be stored as number values or string values,
 * but you will have to write a custom converter for this.
 *
 * @see BooleanConstructor
 */
export const BooleanConverter: Converter<boolean> = {

    convertFrom(value?: DynamoDB.AttributeValue | undefined): boolean | undefined {
        if (typeof value === "undefined") return undefined;
        if (value.BOOL) return value.BOOL;

        return undefined;
    },

    convertTo(value: boolean | undefined): DynamoDB.AttributeValue | undefined {
        if (typeof value === "undefined") return undefined;
        if (value === null) return undefined;

        return {BOOL: value};
    }

};
