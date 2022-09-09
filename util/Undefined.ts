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

/**
 * Constant that marks a field as undefined without needing to make it optional in TS.
 * Warning: Do not rely on the actual value of this constant as it may change without notice,
 * instead only use it to test if a value is set or not (by using it as the operand).
 */
// NOTE: If this field is not undefined or null, then Optional chaining (?.) will not work as expected.
//       We could investigate using a proxy with no-op handlers that return undefined.
//       Currently it can remain as NULL as we don't use the DynamoDB {NULL:true} attribute
//       in our reference project.
export const UNDEFINED: any = null;