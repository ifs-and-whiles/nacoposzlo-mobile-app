import { Directive, HostBinding } from '@angular/core';

@Directive({
	selector: '.sliding'
})
export class SlidingDirective {
    @HostBinding('class.sliding-on-left') isSlidingOnLeft = false;
    @HostBinding('class.sliding-on-right') isSlidingOnRight = false;    

    public determineSlidingSide(deltaX: number) {
        if(deltaX > 0) {
            this.isSlidingOnLeft = false;
            this.isSlidingOnRight = true;
        } else if (deltaX == 0) {
           this.resetSlidingSide();
        } else {
            this.isSlidingOnLeft = true;
            this.isSlidingOnRight = false;
        }
    }

    public resetSlidingSide() {
        this.isSlidingOnLeft = false;
        this.isSlidingOnRight = false;
    }
}