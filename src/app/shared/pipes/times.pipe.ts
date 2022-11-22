import {PipeTransform, Pipe} from '@angular/core';

@Pipe({name: 'times'})
export class TimesPipe implements PipeTransform {
	transform(value: number): any {
		const iterable = <Iterable<any>> {};
		iterable[Symbol.iterator] = function* () {
			let n = 0;
			while (n < value) {
				yield ++n;
			}
		};
		return iterable;
	}
}