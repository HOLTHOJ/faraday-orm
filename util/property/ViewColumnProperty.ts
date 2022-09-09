import {Property} from "./Property";
import {ViewColumnDef} from "../../view";
import {ColumnProperty} from "./ColumnProperty";

export class ViewColumnProperty<R extends object, T> extends ColumnProperty<R, string> {

    public readonly def: ViewColumnDef

    constructor(def: ViewColumnDef, propertyRoot?: Property<R, any>) {
        super(def, propertyRoot);
        this.def = def
    }

}
