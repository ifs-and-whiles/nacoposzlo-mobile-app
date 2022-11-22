import { Directive, EventEmitter, HostListener, Output, ElementRef, HostBinding, Host, Input, OnDestroy } from '@angular/core';
import { Platform } from '@ionic/angular';
import { fromEvent, merge, of, Subject, Subscription } from 'rxjs';
import { mergeMap, delay, takeUntil } from 'rxjs/operators';
import { SlidingDirective } from './sliding.directive';

@Directive({
	selector: '[appGestures]'
})
export class GesturesDirective  implements OnDestroy {   
    private longPressSubscription: Subscription;
    private isSlidingActiveSubscription: Subscription;
    
    private isPanningX: boolean;
    private isPanningY: boolean;
    private isEnd: boolean;
    private canPanX: boolean;
    private deltaX: number;

    private _isDisabled: boolean;
    @Input() set appGestures(value: boolean) {
        this._isDisabled = !value;
        this._longPressDisabledSubject.next(this._isDisabled);
        if(this._isDisabled) this.resetSwipe();        
    }

    @Output() appSwipe = new EventEmitter();
    @Output() appIsSwiping = new EventEmitter<boolean>();
    @Output() appLongPress = new EventEmitter();

    @HostBinding('class.sliding-active') isSlidingActive = false;

    private _longPressDisabledSubject: Subject<boolean>;
    private _isSlidingActiveSubject: Subject<boolean>;

    constructor(
        private _el: ElementRef,
        private _platform: Platform,
        @Host() private _slidingDirective: SlidingDirective)
    { 
        this._longPressDisabledSubject = new Subject<boolean>();
        this._isSlidingActiveSubject = new Subject<boolean>();

        const touchstart = fromEvent(_el.nativeElement, 'touchstart');
        const touchEnd = fromEvent(_el.nativeElement, 'touchend');

        const breakLongPress = merge(
            touchEnd,
            this._longPressDisabledSubject,
            this._isSlidingActiveSubject
        );

        this.longPressSubscription = touchstart
            .pipe(mergeMap(event => of(event).pipe(delay(350), takeUntil(breakLongPress))))
            .subscribe({
                next: () => {
                    if(!this._isDisabled && !this.isSlidingActive) this.longPress();
                }
            });

        this.isSlidingActiveSubscription = this
            ._isSlidingActiveSubject
            .subscribe({
                next: (isSwiping) => this.appIsSwiping.emit(isSwiping)
            });
    }

    ngOnDestroy(): void {
        if (this.longPressSubscription) {
            this.longPressSubscription.unsubscribe();
        }

        if(this.isSlidingActiveSubscription) {
            this.isSlidingActiveSubscription.unsubscribe();
        }
    }

    @HostListener('panEnd')
	panEnd() {
        let wasSwiped = false;
        this.isEnd = true;
        this._el.nativeElement.style.setProperty('transition', '0.3s ease-in-out');

        const delta = Math.abs(this.deltaX) / this._platform.width();

        if(delta > 0.5) {
            if(this.deltaX < 0) this.translateX('-150%');
            else this.translateX('150%');                    
            wasSwiped = true;
        } else this.translateX('0px');
        
        setTimeout(() => {
            this.resetSwipe();

            if(wasSwiped) {
                this.appSwipe.emit();
            }
        }, 400);      
    }

    private resetSwipe() {
        this.isPanningX = false;
        this.isPanningY = false;
        this.isEnd = false;
        this.canPanX = false;
        this.setIsSlidingActive(false);
        this.deltaX = 0;

        this._slidingDirective.resetSlidingSide();
        this._el.nativeElement.style.removeProperty('transition');
        this.translateX('0px');
    }

    @HostListener('panStart')
	panStart() {    
        setTimeout(() => {
            if(!this._isDisabled) this.canPanX = true;
        });      
    }

    @HostListener('panup')
	panUp() {
        if(!this.isEnd && !this.isPanningX) this.isPanningY = true;
    }
    
    @HostListener('pandown')
	panDown() {
        if(!this.isEnd && !this.isPanningX) this.isPanningY = true;
	}    

	@HostListener('panright', ['$event'])
	panRight(event) {
        if(!this.isEnd && !this.isPanningY && this.canPanX && !this._isDisabled) {
            this.deltaX = event.deltaX;
            this.isPanningX = true;
            this.setIsSlidingActive(true);

            this.translateX(event.deltaX+'px');
            this._slidingDirective.determineSlidingSide(event.deltaX);
        }		
    }
    
    @HostListener('panleft', ['$event'])
	panLeft(event) {
        if(!this.isEnd && !this.isPanningY && this.canPanX && !this._isDisabled) {
            this.deltaX = event.deltaX;
            this.isPanningX = true;
            this.setIsSlidingActive(true);
            
            this.translateX(event.deltaX+'px');
            this._slidingDirective.determineSlidingSide(event.deltaX);
        }	
    }

    private setIsSlidingActive(value: boolean) {
        if(this.isSlidingActive != value) {            
            this._isSlidingActiveSubject.next(value);
            this.isSlidingActive = value;
        }
    }
    
    private translateX(deltaX: string) {
        this._el.nativeElement.style.setProperty('transform', `translateX(${deltaX})`);
    }

    private longPress() {
        //we need to turn of pointer-events just for a moment to avoid a ghost click which sometimes happened just after a user
        //releases an element after a long-press

        this.turnOffPointerEvents();
        
        this.appLongPress.emit();

        setTimeout(() => this.turnOnPointerEvents(), 500);
    }

    private turnOffPointerEvents() {
        this._el
            .nativeElement
            .style
            .pointerEvents = "none";
    }

    private turnOnPointerEvents() {
        this._el
            .nativeElement
            .style
            .pointerEvents = "auto";
    }
}