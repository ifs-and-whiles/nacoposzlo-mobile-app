import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StartPage } from './start-tab.page';
import { SharedModule } from '../shared/shared.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { DetailsChartComponent } from './details-chart/details-chart.component';
import { DetailsTagsComponent } from './details-tags/details-tags.component';
import { TagPercentageBarDirective } from './directives/tag-percentage-bar.directive';
import { ComparisonChartFiltersModal } from './comparison-chart-filters-modal/comparison-chart-filters.modal';
import { DetailsChartFiltersModal } from './details-chart-filters-modal/details-chart-filters.modal';
import { ComparisonChartComponent } from './comparison-chart/comparison-chart.component';

@NgModule({
	imports: [
		FontAwesomeModule,
		IonicModule,
		CommonModule,
		FormsModule,
		RouterModule.forChild([
			{ path: '', component: StartPage },
			{ path: 'comparison-chart-filters-modal', component: ComparisonChartFiltersModal },
			{ path: 'details-chart-filters-modal', component: DetailsChartFiltersModal }
		]),
		SharedModule
	],
	declarations: [
		StartPage,
		ComparisonChartFiltersModal,
		DetailsChartFiltersModal,
		DetailsChartComponent,
		DetailsTagsComponent,
        ComparisonChartComponent,
		TagPercentageBarDirective
	]
})
export class StartPageModule {}
