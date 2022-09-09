import {Property} from "./Property";
import {ColumnDef} from "../../annotation/Column";
import {ColumnProperty} from "./ColumnProperty";

export const COLUMN_VAL: unique symbol = Symbol("COLUMN_DIM");
export const COLUMN_ATT: unique symbol = Symbol("COLUMN_ATT");

export class EntityColumnProperty<R extends object, T> extends ColumnProperty<R, T> {

    readonly def: ColumnDef<T>;

    constructor(def: ColumnDef<T>, propertyRoot?: Property<R, any>) {
        super(def, propertyRoot);
        this.def = def;
    }

}