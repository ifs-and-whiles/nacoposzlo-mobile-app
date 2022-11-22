import { Directive, ElementRef, OnInit, OnDestroy, Input } from '@angular/core';
import { TrackWidthService } from './track-width.service';
import { Subscription } from 'rxjs';

@Directive({
  selector: '[appForceLeftByHalfOfWidth]'
})
export class ForceLeftByHalfOfWidthDirective implements OnInit, OnDestroy{
   
    @Input() offsetByHalfOf: string;

    private _widthSubscription: Subscription;
    private _elId: string;

    constructor(        
        private _el: ElementRef, 
        private _trackWidthService: TrackWidthService) {
            
        this._elId = _el.nativeElement.id;

        if(!this._elId) throw new Error("Element id is required for TrackWidthDirective to work");
    }

    ngOnInit(): void {
        this._widthSubscription = this
            ._trackWidthService
            .subscribe({
                next: widthRegistry => this.onWidthChange(widthRegistry)
            });
    }

    ngOnDestroy(): void {
        this._widthSubscription.unsubscribe();
    }

    private onWidthChange(widthRegistry: {[elementId: string]: number}) {
        if(this.offsetByHalfOf) {
            const offsetWidth = widthRegistry[this.offsetByHalfOf];
            const elWidth = widthRegistry[this._elId];

            if(offsetWidth > 0 && elWidth > 0) {
                this._el.nativeElement.style.setProperty('left', (-1 * elWidth / 2 + offsetWidth / 2) +"px"); 
            }
        }
    }
}