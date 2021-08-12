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

import {EntityManager, EntityManagerConfig} from "./EntityManager";
import {loadTableConfig, TableConfig} from "./TableConfig";
import {PathGenerator} from "../../util/KeyPath";
import {LogLevel, SessionConfig} from "./SessionManager";
import {req} from "../../util/Req";
import {PathToRegexpPathGenerator} from "../../util/PathToRegexpPathGenerator";
import {loadEntityDefs} from "./EntityTypeLoader";
import {Class} from "../../util";

export type EntityManagerFactoryInput = {

    /** A username to identify who is making the updates. */
    readonly userName: string,

    /** The table name. This needs to match with a table definition in the TableConfig. */
    readonly tableName: string,

    /** Table config file. If not specified the "faraday.orm.json" file will be loaded from the project root. */
    readonly tableConfig: string | TableConfig,

    readonly entityLoader: (file: string) => Class

    /** The default path generator for this entity manager. */
    readonly pathGenerator: PathGenerator,

    readonly logLevel: LogLevel;

}

export class EntityManagerFactory {

    /** Global config as a fallback for creating Entity manager instances. */
    public static GLOBAL_CONFIG: Partial<EntityManagerFactoryInput> = {
        logLevel: "STATS",
        pathGenerator: new PathToRegexpPathGenerator(),
        entityLoader: file => require(file).default,
    }

    public static load(input?: Partial<EntityManagerFactoryInput>): EntityManager {
        const mergedInput = {...EntityManagerFactory.GLOBAL_CONFIG, ...input};

        const tableName = req(mergedInput.tableName, `Missing table name in config.`);
        const tableConfig = (typeof mergedInput.tableConfig === "object") ? mergedInput.tableConfig : loadTableConfig(mergedInput.tableConfig, mergedInput.entityLoader)
        const tableDef = req(tableConfig[tableName], `Table name ${tableName} not found in table config.`);

        const entityManagerConfig: EntityManagerConfig = {
            tableName: tableName,
            tableDef: tableDef,
            entityDef: loadEntityDefs(tableDef),
            pathGenerator: req(mergedInput.pathGenerator, `Missing path generator in config.`),
        }

        const sessionConfig: SessionConfig = {
            user: req(mergedInput.userName, `Missing user name in config.`),
            level: req(mergedInput.logLevel, `Missing logLevel in config.`),
        };

        return new EntityManager(entityManagerConfig, sessionConfig)
    }

}