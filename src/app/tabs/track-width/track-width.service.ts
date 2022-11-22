import { Injectable } from '@angular/core';
import { BehaviorSubject, PartialObserver, Subscription } from 'rxjs';

@Injectable({
	providedIn: 'root'
})
export class TrackWidthService {
    private _widthRegistry: {[elementId: string]: number} = {};
    private _widthSubject: BehaviorSubject<{[elementId: string]: number}> = new BehaviorSubject({});

    constructor() {}

    public subscribe(observer?: PartialObserver<{[elementId: string]: number}>): Subscription {
        return this._widthSubject.subscribe(observer);
    }

    public registerWidth(elementId: string, width: number) {
        this._widthRegistry[elementId] = width;
        this._widthSubject.next(this._widthRegistry);
    }
}