# Entity

## Entity datamodel

**Entities** are the items that are stored in the database. They are represented by a plain old javascript class and a
Typescript annotation (decorator). The Entity name parameter is stored in each item and allows the framework to identify
which model the items needs to be loaded into.

Entities are required to have an **Id**, so the items can be stored and retrieved. Having exactly one PK (partition key)
is required, defining a SK (sort key) is optional and depends on your database setup.

**Columns** represent the attributes that are stored and retrieved from the DB. A column is defined by its database name
and converter. Converters are used instead of the DynamoDB.DocumentClient API to allow greater control over the
conversion between datamodel values and their DynamoDB Attribute values.

**Internal** columns are fields that can only be updated internally using a Callback. This means that client
applications ARE allowed to set this value directly when PUTTING or UPDATING an item, but its value can never differ
from the value already existing in the DB. This ensures that client applications have not modified this field between
consecutive GET and PUT requests.

**Callbacks** are functions that are called during the process of retrieving or updating an item. They can modify
internal and non-internal fields of the entity.

The **UNDEFINED** value is a constant that marks the fields as not initialised yet. This is necessary to differentiate
fields that are not set from fields that are deliberatily set to `undefined`. It also avoids having to add
the `| undefined` union type to each field.

The full version of this example can be found in the test cases: [DBFile.ts](test/filesystem/model/DBFile.ts).

```typescript
@Entity("fs/file", {pkPath: ":account/:directory", skPath: "file/:fileName"})
export class DBFile extends Editable {

    @Exposed()
    public account: string = UNDEFINED

    @Exposed()
    public directory: string = UNDEFINED

    @Exposed()
    public fileName: string = UNDEFINED

    @Id("PK")
    @Exposed(false)
    public parent: string = UNDEFINED

    @Id("SK")
    @Exposed(false)    
    public file: string = UNDEFINED

    @Column("mimeType", StringConverter)
    public mimeType?: string = UNDEFINED

    @Column("size", NumberConverter, true, () => -1)
    public size: number = UNDEFINED

}
``` 

This will result in the following database structure. The columns starting with a "_" are columns defined on the
Editable superclass and are update automatically by the framework.

| pk        | sk              | mimeType          | size | _createTime              | _createUser | _updateTime              | _updateUser | _version |
| --------- | --------------- | ----------------- | ---- | ------------------------ | ----------- | ------------------------ | ----------- | -------- |
| acme/root | file/dog.png    | image/png         | 1286 | 2021-08-12T21:49:19.034Z | owner       | 2021-08-12T21:49:19.447Z | owner       | 2        |
| acme/root | file/cat.png    | image/png         | 8676 | 2021-08-12T22:03:08.653Z | owner       | 2021-08-12T22:03:08.653Z | owner       | 1        |
| acme/root | file/pets.xls   | application/excel | -1   | 2021-08-12T22:03:24.584Z | owner       | 2021-08-12T22:03:24.584Z | owner       | 1        |
| acme/root | file/man.pdf    | application/pdf   | -1   | 2021-08-12T22:03:24.999Z | owner       | 2021-08-12T22:03:24.999Z | owner       | 1        |

If we extract the first record and represent it as JSON (JSON.stringify()), it would like this. You can see that we
deliberately do not expose the actual PK and SK, but instead we expose the decomposed values (account & directory) separately.

```json
{
  "account": "acme",
  "directory": "root",
  "fileName": "dog.png",
  "_createTime": "2021-08-12T21:49:19.034Z",
  "_createUser": "owner",
  "_updateTime": "2021-08-12T21:49:19.447Z",
  "_updateUser": "owner",
  "_version": 2
}
```

## Entity manager

Full documentation : [here](src/entity#entity-manager)

The entity manager provides the database operations to execute on our model entities. All operations only work on entity
instance that are **loaded** by the EntityManager. That is why it is important to always use EntityManager#load(
EntityClass) first.

The **GetItem** operation uses the Id values of the provided entity instance to lookup the entire entity from the
database. Before the item is retrieved the PK and SK paths are compiled. This makes it easier to lookup an entity,
because the user does not need to be aware of how the Ids are composed.

The **CreateItem** operation creates the provided entity in the database. This is an exclusive create operation, meaning
the action will fail if the item already exists.

The **UpdateItem** operation updates the provided entity in the database. An optional expected entity of the same type
can also be provided. All properties from the expected entity are used as DynamoDB expected attribute values. This is
helpful to enforce state transitions; e.g. you can "close" an item only if the expected status is currently "open".

The **DeleteItem** operation deletes the provided entity from the database. The optional entity can again be used to
validate the current state in the database.

```typescript
const entityManager = EntityManager.get({tableName: "faraday-test"});

const fileToCreate = EntityManager.load(DBFile);
fileToCreate.account = "acme";          // Partial PK
fileToCreate.directory = "root";        // Partial PK
fileToCreate.fileName = "test-file";    // SK
fileToCreate.mimeType = "text/plain";

const createdFile = await entityManager.createItem(fileToCreate);
console.log("Created file", JSON.stringify(createdFile));
console.log("Capacity", entityManager.sessionManager.lastLog?.capacity);

const fileToGet = EntityManager.load(DBFile);
fileToGet.account = "acme";         // Partial PK
fileToGet.directory = "root";       // Partial PK
fileToGet.fileName = "test-file";   // SK

const foundFile = await entityManager.getItem(fileToGet);
console.log("Found file", JSON.stringify(foundFile));
console.log("Capacity", entityManager.sessionManager.lastLog?.capacity);

const fileToUpdate = fileToGet;             // You can also reuse already managed instances.
fileToUpdate.mimeType = "application/pdf";  // Now we only need to update the field we want to change.

const updatedFile = await entityManager.updateItem(fileToUpdate);
console.log("Updated file", JSON.stringify(updatedFile));
console.log("Capacity", entityManager.sessionManager.lastLog?.capacity);
```
