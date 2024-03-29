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

export function eq<T>(left: T, right: T, msg ?: string): void {
    if (left !== right) throw new Error(msg || "Not equal.");
}

export function neq<T>(left: T, right: T, msg ?: string): void {
    if (left === right) throw new Error(msg || "Not equal.");
}

/**
 * Ensures that the given value is not undefined, otherwise throwing an error.
 * This makes the variable effectively a required value.
 *
 * @param val The value to test.
 * @param msg The (optional) message that will be used as the Error's message.
 * @throws Error if the variable is undefined or null.
 */
export function req<T>(val: T | undefined | null, msg?: string): T {
    if (typeof val === "undefined") throw new Error(msg || "Missing required value.");
    if (val === null) throw new Error(msg || "Missing required value.");
    return val;
}

/**
 * Defaults the given variable to the given default value if the variable is undefined.
 *
 * @param val The value to test.
 * @param def The default value to use.
 */
export function def<T>(val: T | undefined | null, def: T): T {
    if (typeof val === "undefined") return def;
    if (val === null) return def;
    return val;
}

/**
 * Ensures that the given array only contains exactly one item, and returns that item.
 *
 * @param arr
 * @param msg
 * @param prepend
 * @throws Error if the array is undefined or null.
 * @throws Error if the array does not contain exactly one item.
 */
export function single<T>(arr: T[], msg?: string, prepend ?: boolean): T {
    const NOT_ARRAY = "Value is not an array";
    const NULL_VALUE = "Missing required value";
    const MISSING_VALUE = "Array is missing a value";
    const TOO_MANY_VALUES = "Array is having too many values";

    prepend = def(prepend, typeof msg !== "undefined");

    if (typeof arr === "undefined") throw new Error(def(msg, NOT_ARRAY + ".") + ((prepend) ? ` (${NOT_ARRAY}).` : ""));
    if (!Array.isArray(arr)) throw new Error(def(msg, NOT_ARRAY + ".") + ((prepend) ? ` (${NOT_ARRAY}).` : ""));
    if (arr === null) throw new Error(def(msg, NULL_VALUE + ".") + ((prepend) ? ` (${NULL_VALUE}).` : ""));
    if (arr.length < 1) throw new Error(def(msg, MISSING_VALUE + ".") + ((prepend) ? ` (${MISSING_VALUE}).` : ""));
    if (arr.length > 1) throw new Error(def(msg, TOO_MANY_VALUES + ".") + ((prepend) ? ` (${TOO_MANY_VALUES}).` : ""));
    return arr[0];
}

/**
 * Ensures that the given array only contains max one item, and returns that item if the array is not empty.
 *
 * @param val
 * @param msg
 * @throws Error if the array is undefined or null.
 * @throws Error if the array contains more than 1 item.
 */
export function one<T>(val: T[], msg?: string): T | undefined {
    if (typeof val === "undefined") throw new Error(msg || "Missing required value.");
    if (val === null) throw new Error(msg || "Missing required value.");
    if (val.length > 1) throw new Error(msg || "Array is having too many values.");
    return (val.length === 0) ? undefined : val[0];
}

/**
 * Ensures that the given array is empty.
 *
 * @param val
 * @param msg
 * @throws Error if the array is undefined or null.
 * @throws Error if the array contains more than 1 item.
 */
export function none<T>(val: T[], msg?: string) {
    if (typeof val === "undefined") throw new Error(msg || "Missing required value.");
    if (val === null) throw new Error(msg || "Missing required value.");
    if (val.length > 0) throw new Error(msg || "Array is not empty.");
}

/**
 * Ensures the given list is unique.
 * @param cols
 * @param keyExtractor (optional) Function that extracts the unique key from the given list of values.
 *                     If not provided, the element itself will be used.
 * @param {boolean} throwIfNotUnique (optional) Determines if a duplicate value throws an exception
 *                                   or is simply filtered out.
 * @param msg (option) Error message to throw. Only used if throwIfNotUnique is TRUE.
 */
export function unique<T, K>(cols: T[],
                             keyExtractor: (elt: T) => K = (elt => elt as unknown as K),
                             throwIfNotUnique: boolean = false,
                             msg ?: (name: K) => string): T[] {
    const names = new Set<K>();
    return cols.filter(elt => {
        const key = keyExtractor(elt);
        if (names.has(key)) {
            if (throwIfNotUnique) {
                throw new Error(msg ? msg(key) : `Duplicate element found: ${key}`)
            } else {
                return false;
            }
        }
        names.add(key);
        return true;
    });
}