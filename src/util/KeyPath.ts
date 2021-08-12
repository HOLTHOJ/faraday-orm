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
 *
 */
export type KeyPath = {

    /**
     * The PK path. This will be fed to the PathGenerator and used as the PK Id column value.
     */
    pkPath: string,

    /**
     * The SK path. This will be fed to the PathGenerator and used as the SK Id column value.
     * This is optional if the entity does not define a SK Id column.
     */
    skPath?: string,

    /**
     * Defaults to a PathGenerator based on "path-to-regexp".
     * @see PathToRegexpPathGenerator
     */
    pathGenerator?: PathGenerator
};

/**
 *
 */
export type Path = {

    /**
     * The path. This will be fed to the PathGenerator and used as the Id column value.
     */
    path: string,

    /**
     * Defaults to a PathGenerator based on "path-to-regexp".
     * @see PathToRegexpPathGenerator
     */
    pathGenerator?: PathGenerator
};

// TODO : return could be any "scalar" type.
export interface PathGenerator {
    compile(entity: object, key: string): string,

    parse(path: string, key: string): object,
}
