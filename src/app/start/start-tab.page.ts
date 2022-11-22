import { Component, OnInit, ViewChild, OnDestroy} from '@angular/core';
import { Month } from '../shared/month';
import { ExpensesManager } from '../shared/managers/expenses.manager';
import { Subscription } from 'rxjs';
import { TagsManager } from '../shared/managers/tags/tags.manager';
import * as _ from "lodash";
import { ModalController, IonSlides } from '@ionic/angular';
import { ArrayUtils } from '../shared/utils/array-utils';
import { noCategoryTag, noSubCategoryTag } from '../shared/utils/no-category-tag';
import { Router } from '@angular/router';
import { ComparisonChartData } from '../shared/database/charts/comparison-chart-data';
import { TagsCollectionEntity, TagsCollectionExtensions } from '../shared/database/entities/tags-collection-entity';
import { DatabaseService } from '../shared/database/database.injectable';
import { DetailsChartData } from '../shared/database/charts/details-chart-data';
import { ComparisonChartMonth } from '../shared/database/charts/comparison-chart-month';
import { Bus, ShowFilteredExpensesCommand } from '../shared/bus';
import { ComparisonChartFilters, ComparisonChartFiltersModal, getDefaultComparisonChartFilters } from './comparison-chart-filters-modal/comparison-chart-filters.modal';
import { DetailsChartFilters, DetailsChartFiltersModal } from './details-chart-filters-modal/details-chart-filters.modal';
import { BackButtonManager } from '../shared/managers/back-button.manager';
import { ChartData, ChartDataDisplay, TagChartDataDisplay } from './details-chart/chart-data-display';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { OneDayMilliseconds } from '../shared/dateParser';
import { UsersManager } from '../shared/managers/users.manager';
import { ApiLogger } from '../shared/api-logger';

interface ComparisonMetrics {
	sum: number;
	average: number;
}

interface MonthSlideData {
	month: Month;
	chart: ChartDataDisplay;
	parentCharts: ChartDataDisplay[];
	shouldReload: boolean;
}

interface SelectableTag {
    tagId: string;
    isSelected: boolean;
}

enum ReportType {
	Details = "details",
	Comparison = "comparison"
};

@Component({
  selector: 'app-start-tab',
  templateUrl: 'start-tab.page.html',
  styleUrls: ['start-tab.page.scss'],
  animations: [
    trigger('loaderVisibilityChanged', [
      state('shown', style({ opacity: 1 })),
      state('hidden', style({ opacity: 0})),	
      transition('* => *', animate('500ms'))
    ])
  ],
})
export class StartPage implements OnInit, OnDestroy {
	public isComponentActive = false;

	public selectedReportType: ReportType = ReportType.Details;
    
    public areChartsLoadedForTheFirstTime: boolean = false;
    public isAppStarting: boolean;

	public isLoading: boolean;
	public isReloadingComparisonChart: boolean;
	
	public detailsChartFromDateUnixTimestamp: number;
	public detailsChartToDateUnixTimestamp: number;

	public isCustomDetailsChartFiltersOn: boolean;
	public customRangeParentCharts: ChartDataDisplay[] = [];
	public customRangeChart: ChartDataDisplay;

	public currentMonthSlideIndex: number;
	public selectedMonthSlide: MonthSlideData;
	public monthChartSlides: MonthSlideData[] = [];

	private _expensesSubscription: Subscription;
	private _tagsSubscription: Subscription;
	private _backButtonSubscription: Subscription;
    private _userLoggedInSubscription: Subscription;

	private _slidesElement: IonSlides;
	@ViewChild("slides") set slidesElement(element: IonSlides) {
		this._slidesElement = element;
		if(this._slidesElement){
			this._slidesElement.slideTo(this.currentMonthSlideIndex, 0, false);
		}
	}

	public isCustomComparisonChartFiltersOn: boolean;
	public comparisonChartData: ComparisonChartData;
	public comparisonMetrics: ComparisonMetrics;
	
	public tagsForComparison: SelectableTag[] = [{
		tagId: noCategoryTag,
		isSelected: true
	}];

    public selectedTagIdsForComparison: string[];

	public comparisonChartMonthsRange: ComparisonChartFilters = {
		from: Month.current().previousYear(),
		to: Month.current(),
	}

	constructor(
		private _database: DatabaseService,
		private _expensesManager: ExpensesManager,
		private _tagsManager: TagsManager,
		private _modalController: ModalController,
		private _router: Router,
		private _bus: Bus,
        private _backButtonManager: BackButtonManager,
        private _userManager: UsersManager,
        private _logger: ApiLogger) { 
	}

    private wasExpenseChangedInTheMeantime = false;
    private wasDetailsChartReloadRequested = false;

	ngOnInit(): void {
        this.isAppStarting = true;
        this.isLoading = true;

		this._expensesSubscription = this
			._expensesManager
			.subscribe({
				next: () => {
					this.wasExpenseChangedInTheMeantime = true;
					if(this.isComponentActive) this.refreshOnExpenseChange();
				}
			})

		this._tagsSubscription = this
			._tagsManager
			.onTagsCollectionChange()
			.subscribe({
				next: (tagsCollection: TagsCollectionEntity) => {
					this.updateTagsForComparison(tagsCollection);
				}
            });

        this._userLoggedInSubscription = this
            ._userManager
            .userLoggedIn()
            .subscribe({
                next:() => this.reload()
            });
          
        this.reload();
    }

    private reload() {
        return Promise
            .all([
                this.tryReloadDetailsChartDataOnly(),
                this.reloadComparisonChart()])
            .finally(() => {
                setTimeout(() => {
                    this.areChartsLoadedForTheFirstTime = true;
                    this.isLoading = false;
                }, 500);
                
                setTimeout(() => {
                    this.isAppStarting = false;                    
                }, 1000);
            });
    }
    

	ionViewWillEnter() {
		this.isComponentActive = true;

		if(this.wasExpenseChangedInTheMeantime) {
			this.refreshOnExpenseChange();
		}	

		this.subscribeBackButton();
	}

	private isChartDrilledInForSpecificMonth() {
		return this.selectedReportType == ReportType.Details
		 	&& !this.isCustomDetailsChartFiltersOn
			&& this.selectedMonthSlide
			&& this.selectedMonthSlide.chart
			&& this.selectedMonthSlide.chart.parentTagIds
			&& this.selectedMonthSlide.chart.parentTagIds.length;
	}

	private isChartDrilledInForCustomRange() {
		return this.selectedReportType == ReportType.Details
		 	&& this.isCustomDetailsChartFiltersOn
			&& this.customRangeChart
			&& this.customRangeChart.parentTagIds
			&& this.customRangeChart.parentTagIds.length;
	}

	ionViewWillLeave() {
		this.isComponentActive = false;		
		this.tryUnsubscribeBackButton();
	}

	ngOnDestroy(): void {
		this._expensesSubscription.unsubscribe();
		this._tagsSubscription.unsubscribe();
        this._userLoggedInSubscription.unsubscribe();
		this.tryUnsubscribeBackButton();
	}

	private subscribeBackButton() {
		this.tryUnsubscribeBackButton();

		this._backButtonSubscription = this
			._backButtonManager
			.handleBackButton((locationBack) => {
				if(this.isChartDrilledInForSpecificMonth()) {
					this.onMonthSlideDrillOut();
				} else if (this.isChartDrilledInForCustomRange()) {
					this.onCustomRangeDrillOut();
				} else {
                    locationBack();
				}
			});
	}

	private tryUnsubscribeBackButton() {
		if(this._backButtonSubscription) {
			this._backButtonSubscription.unsubscribe();
			this._backButtonSubscription = null;
		}
	}

	private refreshOnExpenseChange() {
		this.wasExpenseChangedInTheMeantime = false;

		this.tryReloadDetailsChartDataOnly();
		this.reloadComparisonChart();
	}


	private async tryReloadDetailsChartDataOnly(): Promise<void> {
        if(this.selectedReportType == ReportType.Comparison) {
            //this delay of reload is required  because when the reload was performed while user was on
            //comparison chart view - details charts were getting broken
            this.wasDetailsChartReloadRequested = true;
            return;
        }

        this.wasDetailsChartReloadRequested = false;

		if(this.isCustomDetailsChartFiltersOn) {
			await this.reloadCustomRangeDetailsChart(
				this.detailsChartFromDateUnixTimestamp, 
				this.detailsChartToDateUnixTimestamp + OneDayMilliseconds);
		} 

		await this.loadMonthSlides();
	}

	public async onMonthSlideDidChange(){
		const previousIndex = this.currentMonthSlideIndex;
		this.currentMonthSlideIndex = await this._slidesElement.getActiveIndex()

		if (this.currentMonthSlideIndex > previousIndex) {
			for (let index = previousIndex + 3; index <= this.currentMonthSlideIndex + 2; index++) {				
				this.loadMonthSlideDataFor(index);
			}			
		} else {			
			for (let index = previousIndex - 3; index >= this.currentMonthSlideIndex - 2; index--) {				
				this.loadMonthSlideDataFor(index);
			}	
		}

		this.selectedMonthSlide = this.monthChartSlides[this.currentMonthSlideIndex];
	}

	private async loadMonthSlideDataFor(slideIndex: number) {
		if( slideIndex >= 0 && this.monthChartSlides.length > slideIndex) {
			const slide = this.monthChartSlides[slideIndex];
			
			if(!slide.chart || slide.shouldReload) {
                const chartsData = await this.getChartDataForMonths([slide.month]);
				slide.chart = chartsData[0].chartData;
				slide.shouldReload = false;
			}			
		}
	}

	private async loadMonthSlides() {
		const selectedMonth: Month = this.selectedMonthSlide
			? this.selectedMonthSlide.month
			: Month.current();

		const allMonths = await this._database.getMonthsWithAtLeastOneExpense();
		this.currentMonthSlideIndex = this.getClosestMonthIndex(selectedMonth, allMonths);
		const monthChartSlides = await this.loadAllMonthsSlideData(allMonths);

		if(this.isAnyMonthSlideAlreadyLoaded()) {
			this.updateExistingSlides(monthChartSlides);
		} else {
			this.monthChartSlides = monthChartSlides;
        }

        this.selectedMonthSlide = this.currentMonthSlideIndex != null
            ? this.monthChartSlides[this.currentMonthSlideIndex]
            : null;
	}

	private isAnyMonthSlideAlreadyLoaded() : boolean {
		if(this.monthChartSlides && this.monthChartSlides.length) return true;
		return false;
	}

	private updateExistingSlides(newSlides: MonthSlideData[]) {
		newSlides.forEach(newSlide => {
            const oldSlide = this
                .monthChartSlides
                .find(mcs => mcs.month.isEqualTo(newSlide.month));

			if(oldSlide) {
				if(newSlide.chart) {
                    const wasChartModified = !ChartData.areEquivalent(
                        newSlide.chart, 
                        oldSlide.chart);

                    if(wasChartModified) 
                        oldSlide.chart = newSlide.chart;
				} else {
					oldSlide.shouldReload = true;
				}				
			} else {
				const allMonths = [newSlide.month, ...this.monthChartSlides.map(mcs => mcs.month)];
				allMonths.sort((a, b) => Month.ascCompareFn(a,b));

				const newSlideIndex = allMonths.indexOf(newSlide.month);

				this.monthChartSlides.splice(newSlideIndex, 0, newSlide);
			}
		});

		this.monthChartSlides
			.slice()
			.forEach((oldSlide) => {
				const newSlide = newSlides.find(mcs => mcs.month.isEqualTo(oldSlide.month));
				
				if(!newSlide) {
					const index = this.monthChartSlides.indexOf(oldSlide);
					this.monthChartSlides.splice(index, 1);
				}
			})
		
		if (this._slidesElement) {
			this._slidesElement.update();
		}		
	}

	private getClosestMonthIndex(currentMonth: Month, allMonths: Month[]): number {
		if (allMonths && allMonths.length) {
			const months = allMonths
				.map((month, index) => ({
					index: index,
					distance: currentMonth.distanceTo(month)
				}));	
				
			const min = _.minBy(months, month => Math.abs(month.distance));

			return min.index;	
		}

		return null;
	}

    private async loadAllMonthsSlideData(allMonths: Month[]): Promise<MonthSlideData[]> {
		if (allMonths && allMonths.length) {
            const monthsToLoad = allMonths.filter(
                (_, index) => index >= this.currentMonthSlideIndex - 2 && index <= this.currentMonthSlideIndex + 2);

            const chartsData = await this.getChartDataForMonths(
                monthsToLoad);

            const slideData = allMonths.map(month => {
                const chart = chartsData.find(
                    data => data.month.isEqualTo(month));

                const slide: MonthSlideData = {
                    month: month,
                    chart: chart?.chartData,
                    parentCharts: [],
                    shouldReload: chart == null
                };

                return slide;
            });

            return slideData;
		}
		
		return [];
	}

    private getChartDataForMonths(months: Month[]): Promise<{chartData: ChartDataDisplay; month: Month;}[]> {
		return this
            ._database
            .getChartDataForMonths(months)
            .then(chartsRawData => chartsRawData.map(chartRawData => {
                const chartData: ChartDataDisplay =  {
                    totalAmount: chartRawData.data.totalAmount,
                    totalExpenses: chartRawData.data.totalExpenses,
                    innerTags: this.prepareTagChartDisplayData(chartRawData.data.innerTags),							
                    parentTagIds: [],
                };		

                return {
                    chartData: chartData,
                    month: chartRawData.month
                }
            }));
	}
	
	private generateFromCustomRange(fromUnixTimestamp: number, toUnixTimestamp: number) {
		this.reloadCustomRangeDetailsChart(fromUnixTimestamp, toUnixTimestamp + OneDayMilliseconds);
	}

	private reloadCustomRangeDetailsChart(
		fromUnixTimestamp: number, 
		toUnixTimestamp: number): Promise<void> {
		this.isLoading = true;

        return this
            ._database
			.getChartData(fromUnixTimestamp, toUnixTimestamp)
			.then(data =>{
				this.customRangeChart = {
					totalAmount: data.totalAmount,
					totalExpenses: data.totalExpenses,
					innerTags: this.prepareTagChartDisplayData(data.innerTags),							
					parentTagIds: [],
				};			
			})
			.finally(() => this.isLoading = false);
	}

	private prepareTagChartDisplayData(tags: DetailsChartData[]) {
		return tags.map(t => {
			const tagChart: TagChartDataDisplay = {
				tagId: t.tagId,
				totalAmount: t.totalAmount,
				expenseCount: t.totalExpenses,
				percentage: t.percentage,
				parentTagIds: t.parentTagIds,
				innerTags: null
			};

			tagChart.innerTags = this.prepareTagChartDisplayData(t.innerTags);

			return tagChart;
		});
	}

	public onMonthSlideDrillIn(tagChart: TagChartDataDisplay){
		if(this.shouldDrillIn(tagChart)) {
			this.selectedMonthSlide.parentCharts.push(this.selectedMonthSlide.chart);
			this.selectedMonthSlide.chart = this.tagChartToCurrentChart(tagChart);
		} else {
			const expensesFilter = this.getMonthSlideDetailsFiltersForExpenses(tagChart);
			this.navigateToFilteredExpenses(expensesFilter);
		}
	}

	public onCustomRangeDrillIn(tagChart: TagChartDataDisplay){
		if(this.shouldDrillIn(tagChart)) {
			this.customRangeParentCharts.push(this.customRangeChart);
			this.customRangeChart = this.tagChartToCurrentChart(tagChart);
		} else {
			const expensesFilter = this.getCustomRangeDetailsFiltersForExpenses(tagChart);
			this.navigateToFilteredExpenses(expensesFilter);
		}
    }
    
    private shouldDrillIn(tagChart: TagChartDataDisplay) {
        return tagChart.innerTags && tagChart.innerTags.length > 1;
    }

	private tagChartToCurrentChart(tagChart: TagChartDataDisplay): ChartDataDisplay {
		if(tagChart.innerTags && tagChart.innerTags.length){
			return {
				totalAmount: tagChart.totalAmount,
				totalExpenses: tagChart.expenseCount,
				innerTags: tagChart.innerTags.map(t => {
					const chartData: TagChartDataDisplay = {
						tagId: t.tagId,
						totalAmount: t.totalAmount,
						expenseCount: t.expenseCount,
						percentage: t.percentage,
						innerTags: t.innerTags,
						parentTagIds: t.parentTagIds,
					};

					return chartData;
				}),
				parentTagIds: [...tagChart.parentTagIds, tagChart.tagId]
			};
		}	
	}

	private getMonthSlideDetailsFiltersForExpenses(tagChart: TagChartDataDisplay): ShowFilteredExpensesCommand {
        const tags = this.getTagsForExpensesFilter(tagChart);

        return {
			isDateFilterOn: false,
			dateFilter: {
				fromUnixTimestamp: this.selectedMonthSlide.month.startUnixTimestamp(),
				toUnixTimestamp: this.selectedMonthSlide.month.lastDayUnixTimestamp(),
			},
			selectedMonth: this.selectedMonthSlide.month,
			isTagFilterOn: true,
			tagFilter: {
				tagIds: (tags && tags.length) ? tags.slice() : [noCategoryTag]
			}
		};
	}	

	private getCustomRangeDetailsFiltersForExpenses(tagChart: TagChartDataDisplay): ShowFilteredExpensesCommand {
        const tags = this.getTagsForExpensesFilter(tagChart);
        
        return {
			isDateFilterOn: true,
			dateFilter: {
				fromUnixTimestamp: this.detailsChartFromDateUnixTimestamp,
				toUnixTimestamp: this.detailsChartToDateUnixTimestamp,
			},
			selectedMonth: this.selectedMonthSlide.month,
			isTagFilterOn: true,
			tagFilter: {
				tagIds: (tags && tags.length) ? tags.slice() : [noCategoryTag]
			}
		};
	}	

    private getTagsForExpensesFilter(tagChart: TagChartDataDisplay) {
        if(tagChart.tagId == noCategoryTag || tagChart.tagId == noSubCategoryTag) {
            return tagChart.parentTagIds;
        }

        return [...tagChart.parentTagIds, tagChart.tagId];
    }

	//todo this function looks kinda wrong
	private navigateToFilteredExpenses(showFilteredExpensesCommand: ShowFilteredExpensesCommand) {
		this._bus.sendShowFilteredExpensesCommand(showFilteredExpensesCommand);
		this._router.navigate(['./tabs/expenses/']);
	}

	public onMonthSlideDrillOut() {
		if(this.selectedMonthSlide.parentCharts && this.selectedMonthSlide.parentCharts.length) {
			this.selectedMonthSlide.chart = this.selectedMonthSlide.parentCharts.pop();
		}
	}

	public onCustomRangeDrillOut() {
		if(this.customRangeParentCharts && this.customRangeParentCharts.length) {
			this.customRangeChart = this.customRangeParentCharts.pop();
		}
	}

	public clearCustomDetailsChartFilters() {
		this.isCustomDetailsChartFiltersOn = false;

		//when some expenses were modified while custom range chart was displayed,
		//after clearing the filter mont charts were not displayed correctly
		//as they were redrawn being hidden
		//to fix that we need to redraw them once more after they are visible again
		if(this._slidesElement) {
			this._slidesElement.update();
		}			
	}

	private reloadComparisonChart() {
		this.isReloadingComparisonChart = true;
		this.comparisonChartData = null;

        return this
            ._database
			.getComparisonChartData(
				this.comparisonChartMonthsRange.from, 
				this.comparisonChartMonthsRange.to)
			.then(chart => {
				this.comparisonChartData = chart;		
				
				this.calculateMetrics(); 
			})
			.catch(error => {
				this._logger.error("start-tab.page.ts->reloadComparisonChart()", error);
			})
			.finally(() => this.isReloadingComparisonChart = false);
	}

	private updateTagsForComparison(collection: TagsCollectionEntity) {		
        TagsCollectionExtensions
            .getTagIds(collection)
            .forEach(tagId => {
                const countAsMainTag = TagsCollectionExtensions.getTagAsMainUsageCount(
                    collection,
                    tagId);

				if(countAsMainTag > 0) {
					const tagForComparison = this.tagsForComparison.find(t => t.tagId === tagId);
	
					if(!tagForComparison) {
						this.tagsForComparison.push({
							isSelected: true,
							tagId: tagId
						});
					}
				} else {
					ArrayUtils.removeFirst(this.tagsForComparison, t => t.tagId === tagId);
				}
			});
			
        this.updateSelectedTagsForComparison();
	}

	public tagSelectionChange(tag: SelectableTag) {
		tag.isSelected = !tag.isSelected;

        this.updateSelectedTagsForComparison();
        this.calculateMetrics();
	}

    private updateSelectedTagsForComparison() {
        //TODO do i need it?
        this.selectedTagIdsForComparison = this
            .tagsForComparison
            .filter(tag => tag.isSelected)
            .map(tag => tag.tagId);
    }

	public async onDetailsChartFiltersClick() {
		const modal = await this
			._modalController
			.create({
				component: DetailsChartFiltersModal,
				componentProps: {
					filters: this.getDetailsChartFilters(),
					defaultFilters: this.getDetailsChartDefaultFilters()
				}
			});

		await modal.present();

		const result = await modal.onDidDismiss();

        if(result.data) {
            this.applyDetailsChartFilters(
                result.data);
        }
	}

	private applyDetailsChartFilters(range: DetailsChartFilters){
		const isFullMonthResult = Month.isFullMonth(
			range.fromUnixTimestamp,
			range.toUnixTimestamp);

		if(isFullMonthResult.isFullMonth) {
			this.tryChangeFullMonthDetailsChartFilters(
				isFullMonthResult.month);
		} else {
			this.tryChangeCustomDetailsChartFilters(
				range);
		}
	}

	private getDetailsChartFilters(): DetailsChartFilters {
		if(this.isCustomDetailsChartFiltersOn) {
			return {
				fromUnixTimestamp: this.detailsChartFromDateUnixTimestamp,
				toUnixTimestamp: this.detailsChartToDateUnixTimestamp
			};
		}

		return this.getDetailsChartDefaultFilters();
	}	

	private getDetailsChartDefaultFilters(): DetailsChartFilters {
		if(this.selectedMonthSlide) {
			const month = this.selectedMonthSlide.month;

			return {
				fromUnixTimestamp: month.startUnixTimestamp(),
				toUnixTimestamp: month.lastDayUnixTimestamp(),
			};
		}

		const currentMonth = Month.current();

		return {
			fromUnixTimestamp: currentMonth.startUnixTimestamp(),
			toUnixTimestamp: currentMonth.lastDayUnixTimestamp()
		};
	}

	private tryChangeFullMonthDetailsChartFilters(month: Month) {
		if(month.isEqualTo(this.selectedMonthSlide.month)){
			if(this.isCustomDetailsChartFiltersOn){
				this.clearCustomDetailsChartFilters();
			}
		} else {
			this.tryChangeCustomDetailsChartFilters({
				fromUnixTimestamp: month.startUnixTimestamp(),
				toUnixTimestamp: month.lastDayUnixTimestamp()
			});
		}
	}

	private tryChangeCustomDetailsChartFilters(filters: DetailsChartFilters) {
		if(this.isCustomDetailsChartFiltersOn &&
			this.detailsChartFromDateUnixTimestamp == filters.fromUnixTimestamp &&
			this.detailsChartToDateUnixTimestamp == filters.toUnixTimestamp)
			return;

		this.isCustomDetailsChartFiltersOn = true;
		this.detailsChartFromDateUnixTimestamp = filters.fromUnixTimestamp;
		this.detailsChartToDateUnixTimestamp = filters.toUnixTimestamp;

		this.generateFromCustomRange(
			this.detailsChartFromDateUnixTimestamp,
			this.detailsChartToDateUnixTimestamp
		);
	}

	public async onComparisonChartFiltersClick() {
		const originalFiltersJson = JSON.stringify(
			this.comparisonChartMonthsRange);

		const modal = await this
			._modalController
			.create({
				component: ComparisonChartFiltersModal,
				componentProps: {
					filters: this.comparisonChartMonthsRange
				}
			});

		await modal.present();
		const result = await modal.onDidDismiss();

        if(result.data) {
            this.comparisonChartMonthsRange = result.data;

            const currentFiltersJson = JSON.stringify(
                this.comparisonChartMonthsRange);
    
            if (originalFiltersJson != currentFiltersJson) {
                this.reloadComparisonChart();
            } else {
                this.calculateMetrics();
            }
    
            const defaultFiltersJson = JSON.stringify(
                getDefaultComparisonChartFilters());
    
            this.isCustomComparisonChartFiltersOn = (defaultFiltersJson != currentFiltersJson);
        }		
	}

	private calculateMetrics() {
		const monthForMetrics = this
			.comparisonChartData
			.months
			.map(month => {			

				const tags = month.tags.filter(t => {
					const tagForComparison = this.tagsForComparison.find(tag => tag.tagId === t.tagId);
					return tagForComparison && tagForComparison.isSelected;
				});

				const comparisonCharMonth: ComparisonChartMonth = {
					month: month.month,
					tags: tags,
					totalAmount: tags.reduce((acc, tag) => acc + tag.amount, 0),
					expensesCount: tags.reduce((acc,tag) => acc + tag.expenseCount, 0)					
				}

				return comparisonCharMonth;
			})

		const sum = monthForMetrics.reduce((acc, month) => acc + month.totalAmount, 0);
		const average = sum/monthForMetrics.length;

		this.comparisonMetrics = {
			sum: sum,
			average: average,
		}
	}
	
    //TODO should be somewhere else
	public slideOpts = {
		slidesPerView: 'auto',
		centeredSlides: true,
		watchSlidesProgress: true,
		speed: 400,
		spaceBetween: 10,
		on: {
			setTranslate() {
				const swiper = this;
				const { slides } = swiper;
				for (let i = 0; i < slides.length; i += 1) {
					const $slideEl = swiper.slides.eq(i);
					
					const slideOpacity = Math.max(1 - Math.abs($slideEl[0].progress * 0.85), 0.15);
					const scale = Math.max(1 - Math.abs($slideEl[0].progress * 0.4), 0.6);

					$slideEl.transform(`scale(${scale})`).css({
						opacity: slideOpacity,
						transitionProperty:'opacity,transform',
						transitionTimingFunction: 'ease-out'
					});					
				}
			},
			setTransition(duration) {
				const swiper = this;
				const { slides } = swiper;
				slides.transition(duration);
			},
		}
	};

	public shouldHideComparisonChart() {
		return !(this.comparisonChartData
			&& this.comparisonChartData.months
			&& this.comparisonChartData.months.length > 0);
	}

	public clearCustomComparisonChartFilters() {
		this.comparisonChartMonthsRange = getDefaultComparisonChartFilters();
		this.isCustomComparisonChartFiltersOn = false;
		this.reloadComparisonChart();
    }
    
    public onSelectedReportTypeChanged() {
        if(this.selectedReportType == ReportType.Comparison)
            return;

        if(!this.wasDetailsChartReloadRequested)
            return;

        this.tryReloadDetailsChartDataOnly();
    }
}
