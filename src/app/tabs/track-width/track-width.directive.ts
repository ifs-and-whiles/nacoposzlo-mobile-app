import { Directive, ElementRef, AfterViewInit, Output, EventEmitter } from '@angular/core';
import { TrackWidthService } from './track-width.service';

@Directive({
  selector: '[appTrackWidth]'
})
export class TrackWidthDirective implements AfterViewInit{
    @Output() appTrackWidth = new EventEmitter<number>();
    
    private _elId: string;

    constructor(
        private _el: ElementRef, 
        private _trackWidthService: TrackWidthService) {

        this._elId = _el.nativeElement.id;

        if(!this._elId) throw new Error("Element id is required for TrackWidthDirective to work");
    }

    ngAfterViewInit(): void {
        const interval = setInterval(() => {
            const width : number = this._el.nativeElement.offsetWidth;
            
            if(width != 0) {
                this.appTrackWidth.emit(width);
                this._trackWidthService.registerWidth(this._elId, width);
                clearInterval(interval)
            }
        }, 100);
    }
}