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

import {Callback, CallbackOperation} from "..";
import {UNDEFINED} from "../../util";
import {def} from "../../util/Req";

/** */
export type KeyGenerator = () => string;

/** */
export type KeyableOptions = {

    /** The key generator. */
    generator?: KeyGenerator
};

/** */
export const DEFAULT_KEY_GENERATOR = () => Keyable.generateUUID();

/**
 * A keyable record.
 *
 * All records need to have an id in order for it to be retrievable and updateable.
 * But because every DynamoDB database can have a different PK/SK configuration,
 * we cannot provide a generic way to represent this ID.
 *
 * Instead this base class will generate a near-perfect UUID and store it in an instance property.
 * Subclasses can then use this field as their Id or as a part of their composite Id.
 *
 * The generated Id will start with a Time-based component which provides a natural ordering if it is used as SK.
 * The default Id generator function can be overridden by providing a custom generator in the constructor.
 *
 * Example of using the ID in a record;
 * <pre>
 *     @Entity("Article", {pkPath: ":account/article", skPath: ":_id"})
 *     export class DBArticle extends Keyable {}
 * </pre>
 *
 * Example of using the ID as a composite key;
 * <pre>
 *     @Entity("Article", {pkPath: ":account/news", skPath: "article/:_id"})
 *     export class DBArticle extends Keyable {}
 *
 *     @Entity("Blog", {pkPath: ":account/news", skPath: "blog/:_id"})
 *     export class DBBlog extends Keyable {}
 * </pre>
 *
 */
export abstract class Keyable {

    /**
     * The unique internal id of this record.
     * This field is not by default included in the database record.
     */
    public _id: string = UNDEFINED;

    private readonly _generator: KeyGenerator;

    protected constructor(options?: KeyableOptions) {
        this._generator = def(options?.generator, DEFAULT_KEY_GENERATOR);
    }

    @Callback()
    generateId(operation: CallbackOperation): void {
        if (operation === "INSERT" && this._id === UNDEFINED) {
            this._id = Keyable.generateUUID();
        }
    }

    /**
     * Generates a near-perfect UUID composed of a time component and a random string.
     * The generated Id will start with a Time-based component which provides a natural ordering.
     *
     * @return {string}
     */
    public static generateUUID(): string {
        return new Date().getTime().toString(36) + Math.random().toString(36).substr(2, 9);
    }

}