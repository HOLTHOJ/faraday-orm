import {ObjectProperty} from "./ObjectProperty";
import {ColumnProperty} from "./ColumnProperty";
import {IdColumnDef} from "../../annotation/Id";

export class IdColumnProperty<R extends object> extends ColumnProperty<R, string | number> {

    readonly def: IdColumnDef;

    constructor(def: IdColumnDef, propertyRoot?: ObjectProperty<R, any>) {
        super(def, propertyRoot);
        this.def = def;
    }

}