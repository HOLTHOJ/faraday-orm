# Faraday-orm
DynamoDB is a noSQL database, which means its data consists of "documents". 
Documents do not have a strongly defined structure, and apart from the indexable columns, 
no other columns are defined at database level.

The orm project makes use of Typescript to create strongly defined model classes that represent the data stored in the database.
This allows the developers to validate that the data stored and retrieved is consistent with the desired datamodel.

* [Entity datamodel](#entity-datamodel)
* [Entitymanager](#entitymanager)
* [View datamodel](#view-datamodel)
* [Viewmanager](#viewmanager)
* [About](#about)

## Entity datamodel
**Entities** are the items that are stored in the database. 
They are represented by a plain old javascript class and a Typescript annotation (decorator).
The Entity name parameter is stored in each item and allows the framework 
to identify which model the items needs to be loaded into.

Entities are required to have an **Id**, so the items can be stored and retrieved.
Having exactly one PK (primary key) is required, defining a SK (sort key) is optional and depends on your database setup.

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

The **UNDEFINED** value is a constant that marks the fields as not initialised yet. 
This is necessary to differentiate fields that are not set from fields that are deliberatily set to `undefined`.
It also avoids having to add the `| undefined` union type each field. 

```typescript
@Entity("file")
export class File {
    
    @Id("PK", "dir")
    public dirId: string = UNDEFINED    

    @Id("SK", "id")
    public fileId: string = UNDEFINED

    @Column("fileName", StringConverter)
    public fileName: string = UNDEFINED
    
    @Interal("createTime", DateNumberConverter)
    public createTime: Date = UNDEFINED

    @Interal("updateTime", DateNumberConverter)
    public updateTime: Date = UNDEFINED

    @Interal("updateTime", StringConverter)
    public createdBy: string = UNDEFINED
    
    public createdByFirstName: string = UNDEFINED
    public createdByLastName: string = UNDEFINED

    @Callback()
    updateTimestamp(operation: CallbackOperation) {
        switch (operation) {
            case "INSERT":
                this.createTime = new Date();
            case "UPDATE":
            case "DELETE":
                this.updateTime = new Date();
        }
    }
    
    @Callback()
    compositeContactField(operation: CallbackOperation) {
        switch (operation) {
            case "LOAD":
                const [fn, ls] = this.createdBy.split("/")
                this.createdByFirstName = fn;
                this.createdByLastName = ln;
                break;
            default:
                this.createdBy = [this.createdByFirstName, this.createdByLastName].join("/")
        }
    }   
  

}
``` 

## Entitymanager
::todo

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
@View("GSI", "explorer-index")
@ViewQuery("list-all", ":dirId")
@ViewQuery("filter-name", ":dirId", ":name", "BEGINS_WITH")
export class DBFileExplorerView {

    @ViewId("PK", "dir")
    public dirId: string = UNDEFINED;

    @ViewId("SK", "explorer")
    public explorer: string = UNDEFINED;

    @ViewColumn()
    public file: DBFile = UNDEFINED;

    @ViewColumn()
    public folder: DBFolder = UNDEFINED;

    public id: string = UNDEFINED;
    
    @ViewColumn() // The name is denormalized onto the view.
    public name: string = UNDEFINED;

    @ViewSource(DBFile, ":dirId", ":name/:id")
    public loadFile(value: DBFile) {
        this.file = value;
        this.dirId = value.dirId;
        this.id = value.fileId;
        this.name = value.fileName;
    }

    @ViewSource(DBFolder, ":dirId", ":name/:id")
    public loadFolder(value: DBFolder) {
        this.folder = value;
        this.dirId = value.dirId;
        this.id = value.folderId;
        this.name = value.folderName;
    }

}
```

## Viewmanager
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