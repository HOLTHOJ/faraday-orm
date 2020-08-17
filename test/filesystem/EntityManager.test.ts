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

import {EntityManager} from "../../src/entity";
import {DBFile} from "./model/DBFile";

describe("test/filesystem", () => {

    test("GET root/test-file", async () => {
        const rand = new Date().getTime().toString(36);
        const entityManager = EntityManager.get({tableName: "faraday-test"});

        const fileToCreate = EntityManager.load(DBFile);
        fileToCreate.account = "acme";
        fileToCreate.directory = "root";
        fileToCreate.fileName = "test-file-" + rand;

        const createdFile = await entityManager.createItem(fileToCreate);
        console.log("Created file", JSON.stringify(createdFile));
        console.log("Capacity", entityManager.transactionManager.lastLog?.capacity);

        const fileToGet = EntityManager.load(DBFile);
        fileToGet.account = "acme";
        fileToGet.directory = "root";
        fileToGet.fileName = "test-file-" + rand;

        const foundFile = await entityManager.getItem(fileToGet);
        console.log("Found file", JSON.stringify(foundFile));
        console.log("Capacity", entityManager.transactionManager.lastLog?.capacity);

        const fileToUpdate = EntityManager.load(DBFile);
        fileToUpdate.account = "acme";
        fileToUpdate.directory = "root";
        fileToUpdate.fileName = "test-file-" + rand;
        fileToUpdate.mimeType = "application/pdf";

        const updatedFile = await entityManager.updateItem(fileToUpdate);
        console.log("Updated file", JSON.stringify(updatedFile));
        console.log("Capacity", entityManager.transactionManager.lastLog?.capacity);
    })

})