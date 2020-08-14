[link-facets]: https://www.mozilla.org

# VIEWS
Views are objects that represent an indexed view and are itself are not sored as-is in the database. 
Views provide;
 * an object that can return different database records that match the same index query.
 * an automatic mechanism to update the index columns when the master row is updated.

In order to query views, the view object also needs to contain [@Facets][link-facets] annotation(s).

### Simple example : group records of the same type
This example uses a database with files records. 
The view groups the files, within each directory, based on the file's mimetype.

##### Database
The database contains 5 files in 2 different directories.
* _Partition key_: dir
* _Sort key_: id
* _LSI_: 
   * Name: lsi1
   * Partition key: dir
   * Sort key: mime-type
   * Projected attributes: all 

| dir           | id             | $type | mime-type        | uploadTime       | 
| ------------- |----------------|-------|------------------|------------------|
| dir-584z549fz | file-98zvz0dsp | file  | application/pdf  | mime-type        | 
| dir-584z549fz | file-zehs9r7ds | file  | application/pdf  | 
| dir-584z549fz | file-2wsge0qze | file  | image/png        |
| dir-9ezfe489z | file-9fsbdv9sr | file  | application/pdf  |
| dir-9ezfe489z | file-6srss90e5 | file  | application/pdf  |

##### Entity definition

```javascript
@Entity("file")
export class DBFile {
    
    @Id("PK", "dir")
    public dir : string = UNDEFINED    

    @Id("SK", "id")
    public id : string = UNDEFINED

    @Column("mime-type", DBStringConverter)
    public mimeType: string = UNDEFINED

}
```

##### View definition
The view only accepts DBFile records as its source.
 
```javascript
@View("LSI", "lsi1", ":dir")
export class DBFileMetadataView {
    
    @ViewId("PK", "dir")
    public dir : string = UNDEFINED 

    @ViewId("SK", "mime-type")
    public mimeType : string = UNDEFINED 
    
    @ViewColumn()
    public file: DBFile = UNDEFINED
    
    @ViewSource(DBFile, ":mimeType")
    public loadFile(file : DBFile) {
        this.dir = file.dir;
        this.mimeType = file.mimeType;
        this.file = file;
    }   
}
```




### Example : group only the images and sort by uploadTime

##### View definition
The view only accepts DBFile records as its source.
 
```javascript
@View("LSI", "lsi1", ":dir", "PROJECTED_ALL")
export class DBFileMetadataView {
    
    @ViewId("PK", "dir")
    public dir : string = UNDEFINED 

    @ViewId("SK", "mime-type")
    public mimeType : string = UNDEFINED 
    
    @ViewColumn()
    public file: DBFile = UNDEFINED
    
    @ViewSource(DBFile, ":mimeType", (file) => file.mimeType.startsWith("image/"))
    public loadFile(file : DBFile) {
        this.dir = file.dir;
        this.mimeType = file.mimeType;
        this.file = file;
    }   
}
```
