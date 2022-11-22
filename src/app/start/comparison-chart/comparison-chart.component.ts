import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { Chart, UpdateMode, FontSpec } from "chart.js";
import { BehaviorSubject, forkJoin, Subject, Subscription } from "rxjs";
import { debounceTime, first } from "rxjs/operators";
import { ComparisonChartData } from "src/app/shared/database/charts/comparison-chart-data";
import { ComparisonChartMonth } from "src/app/shared/database/charts/comparison-chart-month";
import { TagsCollectionEntity } from "src/app/shared/database/entities/tags-collection-entity";
import { TagsColors, TagsManager } from "src/app/shared/managers/tags/tags.manager";
import { defaultTagColor } from "src/app/shared/utils/colors";
import { calculateTicks } from "../nice-numbers";

const COMPARISON_CHART_MAX_TICKS_LIMIT: number = 7;

interface IChartRedrawRequest {
    chartData: IChartData;
    updateMode: UpdateMode;
}

interface IChartData {
    labels: string[];
    datasets: {
        data: number[];
        backgroundColor: string;
        borderColor: string;
        borderWidth: any;
    }[];
}

@Component({
	selector: 'app-comparison-chart',
    templateUrl: 'comparison-chart.component.html',
    styleUrls: ['comparison-chart.component.scss'],
})
export class ComparisonChartComponent implements OnInit, OnDestroy{

    public comparisonChartHeight: number;
    private _chartData: ComparisonChartData;
    @Input() set chartData(value: ComparisonChartData) {
        if(!value) return;

        const wasSetForTheFirstTime = this._chartData == null;

        this._chartData = value;
        this.comparisonChartHeight = (this._chartData.months.length + 1.5) * 70 ;

        if(wasSetForTheFirstTime) {
            this._chartDataReady.next(true);
        }   

        const updateMode = wasSetForTheFirstTime
            ? 'none'
            : 'normal';

        this.requestChartRedraw(updateMode);
    }

    private _tagIdsForComparison: string[];
    @Input() set tagIdsForComparison(value: string[]){
        if(!value) return;

        const wasSetForTheFirstTime = this._tagIdsForComparison == null;

        this._tagIdsForComparison = value;

        if(wasSetForTheFirstTime) {
            this._tagIdsForComparisonReady.next(true);
        }   

        const updateMode = wasSetForTheFirstTime
            ? 'none'
            : 'normal';

        this.requestChartRedraw(updateMode);
    }

    private _wasTagChangedInTheMeantime: boolean = false;    
    private _isActive: boolean = false;
    @Input() set isActive(value: boolean) {
        this._isActive = value;

        if(this._isActive && this._wasTagChangedInTheMeantime) {  
		    this._wasTagChangedInTheMeantime = false;
            this.requestChartRedraw('none');
        }
    }

    private _tagsCollection: TagsCollectionEntity = {
        tags: {},
        chains: []
	};

    private _tagsSubscription: Subscription;
    private _redrawChartSubscription: Subscription;

    private _comparisonChart: Chart<"bar", number[], string>;

    constructor(
		private _tagsManager: TagsManager) { 
	}

    ngOnInit(): void {
        this._tagsSubscription = this
            ._tagsManager
            .onTagsCollectionChange()
            .subscribe({
                next: (tagsCollection: TagsCollectionEntity) => {
                    this._tagsCollection = tagsCollection;

                    if(this._isActive) {
                        this.requestChartRedraw('none');
                    } else {
                        this._wasTagChangedInTheMeantime = true;
                    }
                }
            });

        this._redrawChartSubscription = this
            ._redrawChart
            .pipe(debounceTime(20))
            .subscribe({
                next: request => this.updateComparisonChart(request)
            })
    }

    ngOnDestroy(): void {
        this._tagsSubscription.unsubscribe();
        this._redrawChartSubscription.unsubscribe();

        if(this._comparisonChart){
            this._comparisonChart.destroy();
            this._comparisonChart = null;
        }   
    }

    private _tagIdsForComparisonReady: BehaviorSubject<boolean> = new BehaviorSubject(false);
    private _chartDataReady: BehaviorSubject<boolean> = new BehaviorSubject(false);
    private _chartReady: BehaviorSubject<boolean> = new BehaviorSubject(false);
    private _redrawChart: Subject<IChartRedrawRequest> = new Subject<IChartRedrawRequest>();

    public comparisonChartCanvas: ElementRef;
	@ViewChild("comparisonChartCanvas") set comparisonChartCanvasElement(element: ElementRef) {
		this.comparisonChartCanvas = element;		

		this.createFreshComparisonChart();
        this._chartReady.next(true);
	}

    private requestChartRedraw(updateMode: UpdateMode) {
        this.whenChartIsReady().then(() => this._redrawChart.next({
            chartData: this.getComparisonChartData(),
            updateMode: updateMode
        }));
    }

    private updateComparisonChart(request: IChartRedrawRequest){
		Object.assign(this._comparisonChart.data, request.chartData)
        this._comparisonChart.update(request.updateMode);	
	}

	private createFreshComparisonChart() {
		this._comparisonChart = new Chart(this.comparisonChartCanvas.nativeElement, {
			type: "bar",
			data: this.getEmptyChartData(), 
			options: {
                indexAxis: 'y',
				maintainAspectRatio: false,
				scales: {
					x: {
						grid: {
							drawBorder: false, 
							color: '#fafbfc',
						},
						ticks: {
							maxTicksLimit: COMPARISON_CHART_MAX_TICKS_LIMIT,
							padding: 15,
                            font: {
                                family:  "'Montserrat'",
                                size: 11
                            },
                            color: '#d4d6d9'
						},
						title:{
							display:false
						},
						stacked: true,
						position: 'top',
                        beginAtZero: false,                        
					},
					y: {
						grid: {
                            drawBorder: false, 
							display: false,
						},
						ticks: {
							display: false,
						},
						stacked: true
					}
				},
				animation: {
					onProgress: drawMonthLabels,
					onComplete: drawMonthLabels
				},                
                plugins: {
                    legend: {
                        display: false,
                        onClick: (e) => e.native.stopPropagation()
                    },                    
                    tooltip: {
                        enabled: false,	
                    },
                }
			}
		});

        function drawMonthLabels() {
            const chartInstance = this;
            const ctx = this.ctx;
            const data = chartInstance.data;
            const datasets = data.datasets;

            if(!datasets?.length)
                return;               

            ctx.font = "16px Montserrat";
            ctx.fillStyle = '#989aa2'

            //we are getting only first set as it will contain item for every single bar
            //and that is enough to render all month labels
                                
            chartInstance
                .getDatasetMeta(0)
                .data
                .forEach(function(bar, i) {					
                    const label = data.labels[i];
                    const xOffset = 5;
                    const yOffset = bar.y - 30;
                    
                    ctx.fillText(label, xOffset, yOffset);
                });
        }    
    }

    private getComparisonChartData(): IChartData {
		const monthsData = this._chartData.months;	

		const datasets = this
			._tagIdsForComparison
			.map(tag => {
				const tagItem = this._tagsCollection.tags[tag];
				const data = [];

				monthsData.forEach(monthData => {
					const tagData = monthData.tags.find(t => t.tagId === tag);

					if(tagData) data.push(tagData.amount.toFixed(2));
					else data.push(0);
				});

				return {
					label: tag,
                    axis: 'y',
					data: data,
					backgroundColor: tagItem ? tagItem.color : defaultTagColor,
					barThickness: 7,
					borderColor: 'white',
					borderWidth: { top:0, right:0, bottom:0, left:0 }
				}
			});

		datasets.push(
			this.prepareFillingDataSet(monthsData, datasets)
		);
			
		return {
			labels: this._chartData.months.map(month => `${month.month.name.replace(/^\w/, c => c.toUpperCase())} ${month.month.year}`),
			datasets: datasets
		};
	}

    private getEmptyChartData(): IChartData {
        return {
            labels: [''],
            datasets: []
        };
    }

    private prepareFillingDataSet(monthsData: ComparisonChartMonth[], datasets: any){
		const monthExpensesSums = this.calculateMonthExpensesSums(
			monthsData, datasets
		)
		
		const ticks = calculateTicks(
			COMPARISON_CHART_MAX_TICKS_LIMIT, 
			0, 
			Math.max(...monthExpensesSums));

		const fillingDataSet = {
			label: '',
            axis: 'y',
			data: monthExpensesSums.map(sum => ticks.niceMax - sum),
			backgroundColor: 'rgba(41, 255, 198, 0.16)',
			barThickness: 7,
			borderColor: 'white',
			borderWidth: { top:0, right:0, bottom:0, left:0 }
		}

		return fillingDataSet;
	}

    private calculateMonthExpensesSums(monthsData: ComparisonChartMonth[], datasets: any): number[]{
		const sums = [];

		for (let index = 0; index < monthsData.length; index++) {
			const sum = datasets.reduce((acc, dataset) => {
				const value = Number(dataset.data[index]);
				return acc + value;
			}, 0);

			sums.push(sum);
		}

		return sums;
	}

    private whenChartIsReady(): Promise<void> {
        const chartIsReady = this
            ._chartReady
            .asObservable()
            .pipe(first(isReady => isReady));

        const dataIsReady = this
            ._chartDataReady
            .asObservable()
            .pipe(first(isReady => isReady));   
            
        const tagsAreReady = this
            ._tagIdsForComparisonReady
            .asObservable()
            .pipe(first(isReady => isReady));   

		return new Promise((resolve) => { 
            forkJoin([
                chartIsReady,
                dataIsReady,
                tagsAreReady
            ]).subscribe({
				next: () => resolve()
			});
		});
	}
}
