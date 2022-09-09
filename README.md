# Faraday-orm

DynamoDB is a noSQL database, which means its data consists of "documents". Documents do not have a strongly defined
structure, and apart from the indexable columns, no other columns are defined at database level.

The Faraday-ORM project makes use of Typescript classes and decorators to create strongly typed models that represent
the data stored in the DynamoDB noSQL database. This allows the developers to validate that the data stored and
retrieved is consistent with the desired datamodel.

* [More on entities](entity)
* [More on views](view)

### Database config

We start by describing our database configuration in `faraday.orm.json`.

```json
{
  "faraday-test": {
    "entities": [
      "./model/DBFile",
      "./model/DBFolder"
    ],
    "ids": {
      "PK": "pk",
      "SK": "sk"
    }
  }
}
```

### Entity model

Then we create an entity model class and annotate it (full version: [DBFile.ts](test/filesystem/model/DBFile.ts)).

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

### Database representation

The above model will be stored in the following database structure.

| pk        | sk              | mimeType          | size | _type   | _createTime              | _createUser | _updateTime              | _updateUser | _version |
| --------- | --------------- | ----------------- | ---- | ------- | ------------------------ | ----------- | ------------------------ | ----------- | -------- |
| acme/root | file/dog.png    | image/png         | 1286 | fs/file | 2021-08-12T21:49:19.034Z | owner       | 2021-08-12T21:49:19.447Z | owner       | 2        |
| acme/root | file/cat.png    |                   | 8676 | fs/file | 2021-08-12T22:03:08.653Z | owner       | 2021-08-12T22:03:08.653Z | owner       | 1        |

### Get an item

Create an entity manager and get the item;

```typescript
const entityManager = EntityManagerFactory.load({tableName: "faraday-test", userName: "owner"});

const fileToLoad = entityManager.load(DBFile);
fileToLoad.account = "acme";
fileToLoad.directory = "root";
fileToLoad.fileName = "dog.png";

const foundFile = await entityManager.getItem(fileToLoad);
console.log("Found file", JSON.stringify(foundFile));
```

Which returns the following;

```json
{
  "account": "acme",
  "directory": "root",
  "fileName": "dog.png",
  "mimeType": "image/png",
  "size": 1286,
  "_createTime": "2021-08-12T21:49:19.034Z",
  "_createUser": "owner",
  "_updateTime": "2021-08-12T21:49:19.447Z",
  "_updateUser": "owner",
  "_version": 2
}
```

### Create an item

```typescript
const entityManager = EntityManagerFactory.load({tableName: "faraday-test", userName: "owner"});

const fileToCreate = entityManager.load(DBFile);
fileToCreate.account = "acme";
fileToCreate.directory = "root";
fileToCreate.fileName = "cat.png";
fileToCreate.size = 8676;

const createdFile = await entityManager.createItem(fileToCreate);
console.log("Created file", JSON.stringify(createdFile));
```
Which returns the following;

```json
{
  "account": "acme",
  "directory": "root",
  "fileName": "cat.png",
  "size": 8676,
  "_createTime": "2021-08-12T22:03:08.653Z",
  "_createUser": "owner",
  "_updateTime": "2021-08-12T22:03:08.653Z",
  "_updateUser": "owner",
  "_version": 1
}
```
### About

Michael Faraday was one of the founding fathers of the dynamo technology, and he is back to help out once again making
the AWS DynamoDB (https://aws.amazon.com/dynamodb) technology more easy to use.

The Faraday project consists of a set of libraries, binaries and other tools focused on helping developers succeed with
their AWS projects;

* faraday-orm : https://github.com/HOLTHOJ/faraday-orm
* faraday-api : https://github.com/HOLTHOJ/faraday-api
* faraday-deploy : https://github.com/HOLTHOJ/faraday-deploy
* faraday-bin : https://github.com/HOLTHOJ/faraday-bin

All the Faraday projects are released under the LGPL license.

We always appreciate hearing from you when our libraries are used in your projects or applications.

### TODO

* Add @Embedded annotation to create aggregate entities.

