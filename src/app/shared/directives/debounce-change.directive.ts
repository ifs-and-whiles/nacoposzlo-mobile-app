import { Directive, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Directive({
	selector: '[appDebounceChange]'
})
export class DebounceChangeDirective implements OnInit, OnDestroy {
	@Input() debounceTime = 500;
	@Output() debounceChange = new EventEmitter();
	private changes = new Subject();
	private subscription: Subscription;

	constructor() { }

	ngOnInit() {
		this.subscription = this.changes.pipe(
			debounceTime(this.debounceTime)
		).subscribe(e => this.debounceChange.emit(e));
	}

	ngOnDestroy() {
		this.subscription.unsubscribe();
	}

	@HostListener('ionChange', ['$event'])
	changeEvent(event) {
		this.changes.next(event);
	}
}
