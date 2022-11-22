import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ChartDataDisplay, TagChartDataDisplay } from '../details-chart/chart-data-display';

@Component({
	selector: 'app-details-tags',
    templateUrl: 'details-tags.component.html',
    styleUrls: ['details-tags.component.scss'],
})
export class DetailsTagsComponent { 
    @Input() chart: ChartDataDisplay;
    @Output() drillIn = new EventEmitter<TagChartDataDisplay>();
    @Output() drillOut = new EventEmitter();

    public onDrillIn(tag: TagChartDataDisplay) {
        this.drillIn.emit(tag);
    }

    public onDrillOut() {
        this.drillOut.emit();
    }
}
