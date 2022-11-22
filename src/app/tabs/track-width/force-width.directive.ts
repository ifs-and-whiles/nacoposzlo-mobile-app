import { Directive, ElementRef, AfterViewInit, Output, EventEmitter, OnInit, OnDestroy, Input, Renderer2 } from '@angular/core';
import { TrackWidthService } from './track-width.service';
import { Subscription } from 'rxjs';

@Directive({
  selector: '[appForceWidth]'
})
export class ForceWidthDirective implements OnInit, OnDestroy{
   
    @Input() forceWidthAsMaxOf: string[];

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
        if(this.forceWidthAsMaxOf && this.forceWidthAsMaxOf.length) {
            const widths = this
                .forceWidthAsMaxOf
                .map(elId => widthRegistry[elId])
                .filter(width => width != null);

            const width = Math.max(...widths);

            if(width > 0 && !this.wasWidthAlreadySet(width)) {
                this._el.nativeElement.style.setProperty('width', width+"px");
                this._trackWidthService.registerWidth(this._elId, width);
            }
        }
    }

    private wasWidthAlreadySet(width: number) {
        var widthStyle = this._el.nativeElement.style["width"];

        if(widthStyle) {
            return widthStyle == width + "px";
        }

        return false;
    }
}