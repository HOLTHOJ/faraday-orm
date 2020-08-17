STATUS: in development (no release yet)

# Faraday-orm
DynamoDB is a noSQL database, which means its data consists of "documents". 
Documents do not have a strongly defined structure, and apart from the indexable columns, 
no other columns are defined at database level.

The Faraday-ORM project makes use of Typescript classes and decorators to create strongly typed models 
that represent the data stored in the DynamoDB noSQL database. 
This allows the developers to validate that the data stored and retrieved is consistent with the desired datamodel.

* [Entity datamodel](#entity-datamodel)
* [Entity manager](#entity-manager)
* [View datamodel](#view-datamodel)
* [View manager](#view-manager)
* [About](#about)

## Entity datamodel

Full documentation : [here](src/entity#entity-datamodel)

**Entities** are the items that are stored in the database. 
They are represented by a plain old javascript class and a Typescript annotation (decorator).
The Entity name parameter is stored in each item and allows the framework 
to identify which model the items needs to be loaded into.

Entities are required to have an **Id**, so the items can be stored and retrieved.
Having exactly one PK (partition key) is required, defining a SK (sort key) is optional and depends on your database setup.

**Columns** represent the attributes that are stored and retrieved from the DB. 
A column is defined by its database name and converter. 
Converters are used instead of the DynamoDB.DocumentClient API to allow greater control over 
the conversion between datamodel values and their DynamoDB Attribute values.

**Internal** columns are fields that can only be updated internally using a Callback.
This means that client applications ARE allowed to set this value directly when PUTTING or UPDATING an item,
but its value can never differ from the value already existing in the DB. 
This ensures that client applications have not modified this field between consecutive GET and PUT requests.

**Callbacks** are functions that are called during the process of retrieving or updating an item.
They can modify internal and non-internal fields of the entity. Common use cases are;
- Setting internal fields
- Composing or destructing composite database fields (e.g. splitting a value on "/")
- Validating fields 

The **UNDEFINED** value is a constant that marks the fields as not initialised yet. 
This is necessary to differentiate fields that are not set from fields that are deliberatily set to `undefined`.
It also avoids having to add the `| undefined` union type each field. 

The full version of this example can be found in the test cases: [DBFile.ts](test/filesystem/model/DBFile.ts).
```typescript
@Entity("file")
export class DBFile {
    
    public account: string = UNDEFINED

    public directory: string = UNDEFINED

    @Id("PK", "pk")
    public parentId: string = UNDEFINED

    @Id("SK", "sk")
    public fileId: string = UNDEFINED

    @Column("fileName", StringConverter, true)
    public fileName: string = UNDEFINED

    @Column("mimeType", StringConverter)
    public mimeType: string = UNDEFINED

    @Internal("ct", DateNumberConverter, true)
    public createTime: Date = UNDEFINED;

    @Internal("ut", DateNumberConverter, true)
    public updateTime: Date = UNDEFINED;

    @Callback()
    updateTimestamp(operation: CallbackOperation) {
        const now = new Date();
        switch (operation) {
            case "INSERT":
                this.createTime = now;
            case "UPDATE":
                this.updateTime = now;
        }
    }

    @Callback()
    compositeIds(operation: CallbackOperation) {
        switch (operation) {
            case "LOAD":
                const [account, directory] = this.parentId.split("/")
                this.account = account;
                this.directory = directory;
                break;
            default:
                this.parentId = [this.account, this.directory].join("/");
                break;
        }
    }
}
``` 

## Entity manager

Full documentation : [here](src/entity#entity-manager)

The entity manager provides the database operations to execute on our model entities.
All operations only work on entity instance that are **loaded** by the EntityManager. 
That is why it is important to always use EntityManager#load(EntityClass) first.

The **GetItem** operation uses the Id values of the provided entity instance to lookup the entire entity from the database.
Before the item is retrieved the PK and SK paths are compiled. 
This makes it easier to lookup an entity, because the user does not need to be aware of how the Ids are composed.  

The **CreateItem** operation creates the provided entity in the database. 
This is an exclusive create operation, meaning the action will fail if the item already exists.

The **UpdateItem** operation updates the provided entity in the database.
An optional expected entity of the same type can also be provided.
All properties from the expected entity are used as DynamoDB expected attribute values.
This is helpful to enforce state transitions; 
e.g. you can "close" an item only if the expected status is currently "open".

The **DeleteItem** operation deletes the provided entity from the database.
The optional entity can again be used to validate the current state in the database.

```typescript
const entityManager = EntityManager.get({tableName: "faraday-test"});

const fileToCreate = EntityManager.load(DBFile);
fileToCreate.account = "acme";
fileToCreate.directory = "root";
fileToCreate.fileName = "test-file";

const createdFile = await entityManager.createItem(fileToCreate);
console.log("Created file", JSON.stringify(createdFile));
console.log("Capacity", entityManager.transactionManager.lastLog?.capacity);

const fileToGet = EntityManager.load(DBFile);
fileToGet.account = "acme";
fileToGet.directory = "root";
fileToGet.fileName = "test-file";

const foundFile = await entityManager.getItem(fileToGet);
console.log("Found file", JSON.stringify(foundFile));
console.log("Capacity", entityManager.transactionManager.lastLog?.capacity);

const fileToUpdate = EntityManager.load(DBFile);
fileToUpdate.account = "acme";
fileToUpdate.directory = "root";
fileToUpdate.fileName = "test-file";
fileToUpdate.mimeType = "application/pdf";

const updatedFile = await entityManager.updateItem(fileToUpdate);
console.log("Updated file", JSON.stringify(updatedFile));
console.log("Capacity", entityManager.transactionManager.lastLog?.capacity);
```

## View datamodel
**Views** are items that can be retrieved using queries. Views itself cannot be stored in the database.
They are represented by a plain old javascript class and a Typescript annotation (decorator).
The view defines the index type and index name (if any) so that the framework knows 
how to construct the query to retrieve the items.

Technically queries can return any type of item from the database, so this makes if very difficult to create a strongly-typed model for queries.
Views solve this by defining the underlying **source** entity types that are included in this view.
Everytime a source entity is updated, the view index columns will be recalculated.
Everytime a view is queried, all the database items will be loaded in their respective entity model classes.  

**ViewColumns** are the properties that are returned in the reponse to the client.
You can choose to either send the entire entity, or you can first denormalize the fields from the sources 
into properties on the view itself, and expose those to create a stable view model. 

**ViewQueries** are configurations that compose the queries. 
They define the variable names to use for PK and SK values.
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

## About
Michael Faraday was one of the founding fathers of the dynamo technology, 
and he is back to help out once again making the AWS DynamoDB (https://aws.amazon.com/dynamodb) technology more easy to use.

The Faraday project consists of a set of libraries, binaries and other tools focused
on helping developers succeed with their AWS projects;
* faraday-orm : https://github.com/HOLTHOJ/faraday-orm
* faraday-api : https://github.com/HOLTHOJ/faraday-api
* faraday-deploy : https://github.com/HOLTHOJ/faraday-deploy
* faraday-bin : https://github.com/HOLTHOJ/faraday-bin

All the Faraday projects are released under the LGPL license.

We always appreciate hearing from you when our libraries are used in your projects or applications. 


## TODO

* Currently, paths for PK and SK are evaluated using the "path-to-regexp" (MIT license) library. 
This needs to be abstracted so clients can use any framework or custom code to evaluate the path strings.
