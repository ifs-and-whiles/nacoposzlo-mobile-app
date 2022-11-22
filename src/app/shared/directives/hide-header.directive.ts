import { Directive, HostListener, Input, OnInit, Renderer2 } from '@angular/core';

@Directive({
    selector: '[appHideHeader]'
})
export class HideHeaderDirective{

    @Input() header: any;
    @Input() set hideHeaderDisable (value: boolean) {
        this._disabled = value;

        if(value) {
            this.distanceSum = 0;
            this.renderer.setStyle(this.header.el, 'top', `0px`);
        }       
    }

    private _disabled = false;
    private lastY = 0;
    private distanceSum = 0;

    constructor(
        private renderer: Renderer2,
    ) { }

    @HostListener('ionScroll', ['$event']) onContentScroll($event: any) {
        if(this._disabled) return;

        const currentY = $event.detail.scrollTop;
        const distance = Math.abs(currentY - this.lastY);

        if (currentY > this.lastY && this.distanceSum < this.header.el.clientHeight) {
            this.distanceSum = Math.min(this.distanceSum + distance, this.header.el.clientHeight);         
            this.renderer.setStyle(this.header.el, 'top', `${ -1 * this.distanceSum }px`);   
        } else if(currentY < this.lastY && this.distanceSum > 0) {
            this.distanceSum = Math.max(this.distanceSum - distance, 0);
            this.renderer.setStyle(this.header.el, 'top', `${ -1 * this.distanceSum }px`);
        }

        this.lastY = currentY;
    }
}