import { Component, Input, ElementRef, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { Chart, UpdateMode } from "chart.js";
import { BehaviorSubject, forkJoin, Subject, Subscription } from 'rxjs';
import { first, debounceTime } from 'rxjs/operators';
import { TagsColors, TagsManager } from 'src/app/shared/managers/tags/tags.manager';
import { defaultTagColor } from 'src/app/shared/utils/colors';
import { ChartDataDisplay } from './chart-data-display';
import * as _ from 'lodash';

const CUTOUTPERCENTAGE: number = 80;
const CIRCUMFERENCE_DEG: number = 230

interface IChartRedrawRequest {
    chartData: IChartData;
    updateMode: UpdateMode;
}

interface IChartData {
    labels: string[];
    datasets: {
        data: number[];
        backgroundColor: any[];
        borderColor: string[];
        borderWidth: number;
    }[];
}

interface IChartInnerContent {
    expensesCount: IChartInnerText;
    amount: IChartInnerText;
}

interface IChartInnerText {
    text: string;
    fontSize: number;
    color: string;
    fontStyle: string;
    sidePadding: number;
}

@Component({
	selector: 'app-details-chart',
    templateUrl: 'details-chart.component.html',
    styleUrls: ['details-chart.component.scss'],
})
export class DetailsChartComponent implements OnInit, OnDestroy{
    
    private _chartData: ChartDataDisplay;
    @Input() set chartData(value: ChartDataDisplay) {
        if(!value) return;

        const wasSetForTheFirstTime = this._chartData == null;
        const wasDrilledInOrOut = this._chartData
            && value.parentTagIds.length != this._chartData.parentTagIds?.length;

        this._chartData = value;  
        this._chartInnerContent = this.getChartInnerContent(value)
        
        if(wasSetForTheFirstTime) {
            this._chartDataReady.next(true);
        }   

        const updateMode = !wasSetForTheFirstTime && wasDrilledInOrOut 
            ? 'normal'
            : 'none';
            
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


	private _tagsColors: TagsColors = {
        tagsColors: {}
	};

    private _tagsSubscription: Subscription;
    private _redrawChartSubscription: Subscription;
    
    private _tagsChart: Chart<"pie", number[], string>;
    
    private _chartInnerContent: IChartInnerContent;
    private _previousAmountTxtFontSize: number | null = null;
    private _previousExpensesTxtFontSize: number | null = null;

    private _chartDataReady: BehaviorSubject<boolean> = new BehaviorSubject(false);
    private _chartReady: BehaviorSubject<boolean> = new BehaviorSubject(false);
    private _redrawChart: Subject<IChartRedrawRequest> = new Subject<IChartRedrawRequest>();

    public chartCanvas: ElementRef;
	@ViewChild("chartCanvas") set chartCanvasElement(element: ElementRef) {
		this.chartCanvas = element;		

        this.createFreshChart();
        this._chartReady.next(true);
    }

    constructor(
		private _tagsManager: TagsManager) { 
	}
    
    ngOnInit(): void {
		this._tagsSubscription = this
			._tagsManager
			.onTagsColorsChange()
			.subscribe({
				next: (tagsColors: TagsColors) => {
					this._tagsColors = tagsColors;

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
                next: request => this.updateChart(request)
            })
    }
    
    ngOnDestroy(): void {
        this._tagsSubscription.unsubscribe();
        this._redrawChartSubscription.unsubscribe();
        
        if(this._tagsChart){
            this._tagsChart.destroy();
            this._tagsChart = null;
        }   
    } 
    
    private requestChartRedraw(mode: UpdateMode) {
        this.whenChartIsReady().then(() => this._redrawChart.next({
            chartData: this.getChartData(),
            updateMode: mode
        }));
    }

    private updateChart(request: IChartRedrawRequest){
        const areEqual = _.isEqual(
            this._tagsChart.data,
            request.chartData
        );

        if(!areEqual) {
            Object.assign(this._tagsChart.data, request.chartData);
            this._tagsChart.update(request.updateMode);	
        }
    }
    
    private getChartData(): IChartData {
        if(!this._chartData) 
           return this.getEmptyChartData();
        
        return {
            labels: this._chartData.innerTags.map(tag => tag.tagId),
            datasets: [{
                data: this._chartData.innerTags.map(tag => tag.totalAmount),
                backgroundColor: this._chartData.innerTags.map(tag => {
                        const tagName = tag.tagId.toLowerCase();
                        const color = this._tagsColors.tagsColors[tagName];
                        
                        return color ? color : defaultTagColor;
                }),
                borderColor: this._chartData.innerTags.map(_ => '#F5FAFD'),
                borderWidth: 3,
            }]
        };        
    }

    private getEmptyChartData(): IChartData {
        return {
            labels: [''],
            datasets: []
        };
    }
    
    private createFreshChart() {
        const rotation = (360 - CIRCUMFERENCE_DEG) / 2 + 180;

		this._tagsChart = new Chart(this.chartCanvas.nativeElement, {
			type: "pie",
			data: this.getChartData(), 
			options: {
				responsive: true,
				maintainAspectRatio: true,
				cutout: `${CUTOUTPERCENTAGE}%`,
				rotation: rotation,
				circumference: CIRCUMFERENCE_DEG,
				layout: {
					padding: {
						left: 0,
						right: 0,
						top: 0,
						bottom: 0
					}
				},
                plugins : {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: false
                    }
                }
			},
			plugins: [{
                id: 'center-chart-description',
				beforeDraw: (chart: Chart<"pie", number[], string>) => { //todo try optimize
                    if(!this._chartInnerContent)
                        return

                    const ctx = chart.ctx;
                    
                    const centerX = ((chart.chartArea.left + chart.chartArea.right) / 2);
                    const centerY = ((chart.chartArea.top + chart.chartArea.bottom) / 2) + 25;					
                    
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';

                    if (!this._previousAmountTxtFontSize) {                        
                        this._previousAmountTxtFontSize = this.calculateFontSize(
                            chart, 
                            ctx,
                            this._chartInnerContent.amount);				
                    }

                    if (!this._previousExpensesTxtFontSize) {							
                        this._previousExpensesTxtFontSize = this.calculateFontSize(
                            chart, 
                            ctx,
                            this._chartInnerContent.expensesCount);
                    }
                    
                    ctx.font = this._previousAmountTxtFontSize + "px " + this._chartInnerContent.amount.fontStyle;
                    ctx.fillStyle = this._chartInnerContent.amount.color;					
                    ctx.fillText(this._chartInnerContent.amount.text, centerX, centerY);

                    ctx.font = this._previousExpensesTxtFontSize + "px " + this._chartInnerContent.expensesCount.fontStyle;
                    ctx.fillStyle = this._chartInnerContent.expensesCount.color;
                    ctx.fillText(this._chartInnerContent.expensesCount.text, centerX, centerY - 25);
				}		
			}]
		});
    }
    
    private calculateFontSize(chart: Chart<"pie", number[], string>, ctx, innerText: IChartInnerText) {
        const diameter = chart.height;
        const radius = diameter / 2 ;
        const innerRadius = CUTOUTPERCENTAGE * radius / 100;

        const sidePaddingCalculated = (innerText.sidePadding/100) * (innerRadius * 2)
        
        ctx.font = innerText.fontSize + "px " + innerText.fontStyle;
        const stringWidth = ctx.measureText(innerText.text).width;
        const elementWidth = (innerRadius * 2) - sidePaddingCalculated;
        const widthRatio = elementWidth / stringWidth;
        const newFontSize = Math.floor(innerText.fontSize * widthRatio);
        const elementHeight = (innerRadius * 2);
        return  Math.min(Math.min(newFontSize, elementHeight), innerText.fontSize);
    }

    private getChartInnerContent(monthChart: ChartDataDisplay): IChartInnerContent {
        const montserratFont = 'Montserrat';
        const sidePadding = 25;
        
        return {
            amount: {
                text: `${monthChart.totalAmount.toFixed(2)} zł`,
                fontSize: 20,
                color: '#000000',
                fontStyle: montserratFont,
                sidePadding: sidePadding
            },
            expensesCount: {
                text: `Wydatków: ${monthChart.totalExpenses}`,
                fontSize: 14,
                color: '#86888f',
                fontStyle: montserratFont,
                sidePadding: sidePadding
            }
        }; 
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

		return new Promise((resolve) => { 
            forkJoin([
                chartIsReady,
                dataIsReady
            ]).subscribe({
				next: () => resolve()
			});
		});
	}
}
