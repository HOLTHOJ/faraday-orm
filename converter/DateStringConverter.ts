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
 * The default DynamoDB converter for storing Date values as S attributes.
 * The ISO string value of the date will be stored as a String attribute.
 *
 * @see Date#toISOString()
 * @see DateConstructor
 */
export const DateStringConverter: Converter<Date> = {

    convertFrom(value: DynamoDB.AttributeValue | undefined): Date | undefined {
        if (typeof value === "undefined") return undefined;
        if (value.S) return new Date(value.S);

        return undefined;
    },

    convertTo(value: Date | undefined): DynamoDB.AttributeValue | undefined {
        if (typeof value === "undefined") return undefined;
        if (value === null) return undefined;

        return {S: new Date(value).toISOString()};
    }

};