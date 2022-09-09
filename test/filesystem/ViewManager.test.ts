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

import {ViewManager} from "../../view";
import {DBFileView} from "./view/DBFileView";
import {DBFolderView} from "./view/DBFolderView";
import {DBExplorerByNameView} from "./view/explorer/DBExplorerByNameView";
import {DBExplorerByTypeView} from "./view/explorer/DBExplorerByTypeView";
import {EntityManagerFactory} from "../../EntityManagerFactory";
import {EntityManagerImpl} from "../../manager/EntityManagerImpl";

describe("test/filesystem", () => {

    EntityManagerFactory.GLOBAL_CONFIG = {
        userName: "owner",
        tableName: "faraday-test",
    }

    test("view/file", async () => {
        const entityManager = EntityManagerFactory.load();
        const viewManager = ViewManager.get(entityManager as EntityManagerImpl);

        const view = ViewManager.loadView(DBFileView);
        view.account = "acme";
        view.directory = "root";

        const views = viewManager.queryView(view, "listAll");
        console.log("Views", await views.hasElements(), JSON.stringify(await views.toArray()));
        console.log("Capacity", entityManager.session.lastLog?.queryOutput?.ConsumedCapacity);
    })

    test("view/folder", async () => {
        const entityManager = EntityManagerFactory.load();
        const viewManager = ViewManager.get(entityManager as EntityManagerImpl);

        const view = ViewManager.loadView(DBFolderView);
        view.account = "acme";
        view.directory = "root";

        const views = viewManager.queryView(view, "listAll");
        console.log("Views", await views.hasElements(), JSON.stringify(await views.toArray()));
        console.log("Capacity", entityManager.session.lastLog?.queryOutput?.ConsumedCapacity);
    })

    test("view/explorer/name/all", async () => {
        const entityManager = EntityManagerFactory.load();
        const viewManager = ViewManager.get(entityManager as EntityManagerImpl);

        const view = ViewManager.loadView(DBExplorerByNameView);
        view.account = "acme";
        view.directory = "root";

        const views = viewManager.queryView(view, "list-all");
        console.log("Views", await views.hasElements(), JSON.stringify(await views.toArray()));
        console.log("Capacity", entityManager.session.lastLog?.queryOutput?.ConsumedCapacity);
    })

    test("view/explorer/name?test-file", async () => {
        const entityManager = EntityManagerFactory.load();
        const viewManager = ViewManager.get(entityManager as EntityManagerImpl);

        const view = ViewManager.loadView(DBExplorerByNameView);
        view.account = "acme";
        view.directory = "root";
        view.name = "test-file";

        const views = viewManager.queryView(view, "list-all");
        console.log("Views", await views.hasElements(), JSON.stringify(await views.toArray()));
        console.log("Capacity", entityManager.session.lastLog?.queryOutput?.ConsumedCapacity);
    })


    test("view/explorer/type/all", async () => {
        const entityManager = EntityManagerFactory.load();
        const viewManager = ViewManager.get(entityManager as EntityManagerImpl);

        const view = ViewManager.loadView(DBExplorerByTypeView);
        view.account = "acme";
        view.directory = "root";

        const views = viewManager.queryView(view, "list-all");
        console.log("Views", await views.hasElements(), JSON.stringify(await views.toArray()));
        console.log("Capacity", entityManager.session.lastLog?.queryOutput?.ConsumedCapacity);
    })

})