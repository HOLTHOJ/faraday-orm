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

/**
 * A DynamoDB converter to convert javascript data types from/to DynamoDB Attribute types.
 * This will be used by the framework to read/write any database value into the Javascript model.
 *
 * This gives us more control over the data conversions than using the DynamoDB DocumentClient API.
 *
 * By default attributes that are found in the database that do not correspond to the expected type are ignored.
 */
export type Converter<T> = {

    /**
     * Reads the DynamoDB Attribute value into a Javascript data type.
     *
     * @param value The raw value as it was retrieved from the database.
     */
    convertFrom(value: DynamoDB.AttributeValue | undefined): T | undefined;

    /**
     * Writes the Javascript data type to a DynamoDB Attribute value.
     *
     * @param value The value from the Entity model.
     */
    convertTo(value: T | undefined): DynamoDB.AttributeValue | undefined;

}