import { ComplexView, ViewInstance, ViewLayout } from "./view-types";

export class ObjectView<T extends object>
  extends DataView
  implements ComplexView<T> {
  static viewLength: number;
  static layout?: ViewLayout<unknown>;
  static fields: Array<unknown>;
  static defaultData?: Uint8Array;

  static decode<T extends object>(view: DataView, start = 0, _?: number): T {
    const layout = this.layout as ViewLayout<T>;
    const fields = this.fields as Array<keyof T>;
    const result = {} as T;
    for (let i = 0; i < fields.length; i++) {
      const name = fields[i];
      const { View, start: fieldStart, length: fieldLength } = layout[name];
      result[name] = View.decode(view, start + fieldStart, fieldLength);
    }
    return result;
  }

  static encode<T extends object>(
    value: T,
    view: DataView,
    start = 0,
    length = this.viewLength,
    amend?: boolean
  ): number {
    if (!amend)
      new Uint8Array(view.buffer, view.byteOffset + start, length).fill(0);
    const layout = this.layout as ViewLayout<T>;
    const fields = this.fields as Array<keyof T>;
    for (let i = 0; i < fields.length; i++) {
      const name = fields[i];
      if (Reflect.has(value, name)) {
        const { View, start: fieldStart, length: fieldLength } = layout[name];
        View.encode(value[name], view, start + fieldStart, fieldLength);
      }
    }
    return length;
  }

  /**
   * Assigns fields of a given object to the provided view or a new object view.
   *
   * @param value the object to take data from
   *
   */
  static from<T extends object, U extends ObjectView<T>>(value: T): U {
    const objectView = new this<T>(this.defaultData!.buffer.slice(0));
    this.encode<T>(value, objectView, 0, this.viewLength, true);
    return objectView as U;
  }

  /**
   * Returns the byte length of an object view.
   *
   *
   */
  static getLength(): number {
    return this.viewLength;
  }

  /**
   * Returns the JavaScript value of a given field.
   *
   * @param field the name of the field
   * @return value of the field
   */
  get<P extends keyof T>(field: P): T[P] {
    const layout = (this.constructor as typeof ObjectView)
      .layout as ViewLayout<T>;
    const { start, View, length } = layout[field];
    return View.decode(this, start, length);
  }

  /**
   * Returns the JavaScript value of a given field.
   *
   * @param field the name of the field
   * @return value of the field
   */
  getLength<P extends keyof T>(field: P): number {
    const layout = (this.constructor as typeof ObjectView)
      .layout as ViewLayout<T>;
    return layout[field].length;
  }

  /**
   * Returns a view of a given field.
   *
   * @param field the name of the field
   * @return view of the field
   */
  getView<P extends keyof T>(field: P): ViewInstance<T[P]> {
    const layout = (this.constructor as typeof ObjectView)
      .layout as ViewLayout<T>;
    const { View, start, length } = layout[field];
    return new View(this.buffer, this.byteOffset + start, length);
  }

  /**
   * Sets a JavaScript value to a field.
   *
   * @param field the name of the field
   * @param value the value to be set
   *
   */
  set<P extends keyof T>(field: P, value: T[P]) {
    const layout = (this.constructor as typeof ObjectView)
      .layout as ViewLayout<T>;
    const { start, View, length } = layout[field];
    View.encode(value, this, start, length);
  }

  /**
   * Copies a given view into a field.
   *
   * @param field the name of the field
   * @param view the view to set
   *
   */
  setView<P extends keyof T>(field: P, view: DataView) {
    const layout = (this.constructor as typeof ObjectView)
      .layout as ViewLayout<T>;
    const { start } = layout[field];
    new Uint8Array(this.buffer, this.byteOffset, this.byteLength).set(
      new Uint8Array(view.buffer, view.byteOffset, view.byteLength),
      start
    );
  }

  /**
   * Returns an Object corresponding to the view.
   *
   *
   */
  toJSON(): T {
    return (this.constructor as typeof ObjectView).decode<T>(this, 0);
  }
}
