export function maybe<T>(value: T): IMaybe<T>{
    return new Maybe<T>(value);
}

export interface IMaybe<T> {
    map<TSelect>(selector: (value: T) => TSelect);
}

class Maybe<T> implements IMaybe<T> {
    constructor(private _value) { }

    map<TSelect>(selector: (value: T) => TSelect) {
        return this._value == null ? null : selector(this._value);
    }
}