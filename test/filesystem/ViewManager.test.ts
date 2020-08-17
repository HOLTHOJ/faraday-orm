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
import {ViewManager} from "../../src/view";
import {DBFileView} from "./view/DBFileView";
import {DBFolderView} from "./view/DBFolderView";
import {DBExplorerByNameView} from "./view/explorer/DBExplorerByNameView";
import {DBExplorerByTypeView} from "./view/explorer/DBExplorerByTypeView";

describe("test/filesystem", () => {

    EntityManager.GLOBAL_CONFIG = {
        userName: "owner",
        tableName: "faraday-test",
    }

    test("view/file", async () => {
        const entityManager = EntityManager.get();
        const viewManager = ViewManager.get(entityManager);

        const view = ViewManager.loadView(DBFileView);
        view.account = "acme";
        view.directory = "root";

        const views = await viewManager.queryView(view, "listAll");
        console.log("Views", views.length, JSON.stringify(views));
        console.log("Capacity", entityManager.transactionManager.lastLog?.capacity);
    })

    test("view/folder", async () => {
        const entityManager = EntityManager.get();
        const viewManager = ViewManager.get(entityManager);

        const view = ViewManager.loadView(DBFolderView);
        view.account = "acme";
        view.directory = "root";

        const views = await viewManager.queryView(view, "listAll");
        console.log("Views", views.length, JSON.stringify(views));
        console.log("Capacity", entityManager.transactionManager.lastLog?.capacity);
    })

    test("view/explorer/name/all", async () => {
        const entityManager = EntityManager.get();
        const viewManager = ViewManager.get(entityManager);

        const view = ViewManager.loadView(DBExplorerByNameView);
        view.account = "acme";
        view.directory = "root";

        const views = await viewManager.queryView(view, "list-all");
        console.log("Views", views.length, JSON.stringify(views));
        console.log("Capacity", entityManager.transactionManager.lastLog?.capacity);
    })

    test("view/explorer/name?test-file", async () => {
        const entityManager = EntityManager.get();
        const viewManager = ViewManager.get(entityManager);

        const view = ViewManager.loadView(DBExplorerByNameView);
        view.account = "acme";
        view.directory = "root";
        view.name = "test-file";

        const views = await viewManager.queryView(view, "listAll");
        console.log("Views", views.length, JSON.stringify(views));
        console.log("Capacity", entityManager.transactionManager.lastLog?.capacity);
    })


    test("view/explorer/type/all", async () => {
        const entityManager = EntityManager.get();
        const viewManager = ViewManager.get(entityManager);

        const view = ViewManager.loadView(DBExplorerByTypeView);
        view.account = "acme";
        view.directory = "root";

        const views = await viewManager.queryView(view, "list-all");
        console.log("Views", views.length, JSON.stringify(views));
        console.log("Capacity", entityManager.transactionManager.lastLog?.capacity);
    })

})