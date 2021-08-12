# View

## View datamodel

**Views** are items that can be retrieved using queries. Views itself cannot be stored in the database. They are
represented by a plain old javascript class and a Typescript annotation (decorator). The view defines the index type and
index name (if any) so that the framework knows how to construct the query to retrieve the items.

Technically queries can return any type of item from the database, so this makes if very difficult to create a
strongly-typed model for queries. Views solve this by defining the underlying **source** entity types that are included
in this view. Everytime a source entity is updated, the view index columns will be recalculated. Everytime a view is
queried, all the database items will be loaded in their respective entity model classes.

**ViewColumns** are the properties that are returned in the reponse to the client. You can choose to either send the
entire entity, or you can first denormalize the fields from the sources into properties on the view itself, and expose
those to create a stable view model.

**ViewQueries** are configurations that compose the queries. They define the variable names to use for PK and SK values.
The variable names are evaluates against an instance of this view.

```typescript
@View("LSI", "pk-lsi1-index")
@ViewQuery("list-all", ":account/:directory")
@ViewQuery("folder-only", ":account/:directory", "0/", "BEGINS_WITH")
@ViewQuery("file-only", ":account/:directory", "1/", "BEGINS_WITH")
@ViewQuery("file-mimetype", ":account/:directory", "1/:mimeType/", "BEGINS_WITH")
export class DBExplorerByTypeView {

    public account: string = UNDEFINED

    public directory: string = UNDEFINED

    public name: string = UNDEFINED;

    public mimeType: string = UNDEFINED;

    @ViewId("PK", "pk")
    public parent: string = UNDEFINED;

    @ViewId("SK", "lsi1")
    public explorer: string = UNDEFINED;

    @ViewColumn()
    public file: DBFile = UNDEFINED;

    @ViewColumn()
    public folder: DBFolder = UNDEFINED;

    @ViewSource(DBFile, {pkPath: ":account/:directory", skPath: "1/:mimeType/:name"})
    public loadFile(value: DBFile) {
        this.file = value;
        this.account = value.account;
        this.directory = value.directory;
        this.mimeType = value.mimeType;
        this.name = value.fileName;
    }

    @ViewSource(DBFolder, {pkPath: ":account/:directory", skPath: "0/:name"})
    public loadFolder(value: DBFolder) {
        this.folder = value;
        this.account = value.account;
        this.directory = value.directory;
        this.name = value.folderName;
    }

}
```

## View manager

::todo