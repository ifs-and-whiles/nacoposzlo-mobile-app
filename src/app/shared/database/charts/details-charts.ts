import { noCategoryTag, noSubCategoryTag } from '../../utils/no-category-tag';
import { DetailsChartData } from './details-chart-data';

export interface IDetailsChartExpense {
    amount: number;
    tagIds: string[];
}

export class DetailsCharts {
    public static buildData(expenses: IDetailsChartExpense[]): DetailsChartData {
        const rootChartData = this.rootChartData();
        const withoutTagChart = this.emptyTagTreeChartData(noCategoryTag, []);

        expenses.forEach(expense => {
            this.incrementChart(rootChartData, expense.amount);
            
            if(expense.tagIds.length === 0) {
                this.incrementChart(withoutTagChart, expense.amount);
            } else {
                let parentTagIds: string[] = [];
                let parent = rootChartData;

                expense.tagIds.forEach(tagId => {
                    const chartData = this.getOrAddTagTreeChartData(parent, tagId, parentTagIds);
                    this.incrementChart(chartData, expense.amount);

                    parent = chartData;
                    parentTagIds.push(tagId);
                });

                const withoutTag =  this.getOrAddTagTreeChartData(parent, noSubCategoryTag, parentTagIds);
                this.incrementChart(withoutTag, expense.amount)
            }						
        });
    
        if(withoutTagChart.totalExpenses > 0) {
            rootChartData.innerTags.push(withoutTagChart);
        }

        this.calculatePercentage(rootChartData.innerTags);
        this.sortByAmount(rootChartData.innerTags);

        return rootChartData;
    }

    private static rootChartData(): DetailsChartData {
        return {
            tagId: null,
            totalAmount: 0,
            totalExpenses: 0,
            percentage: 1,
            innerTags: [],
            parentTagIds: null
        };
    }

    private static getOrAddTagTreeChartData(parent: DetailsChartData, tagId: string, parentTagIds: string[]) : DetailsChartData {
        let chartData = parent
            .innerTags
            .find(x => x.tagId === tagId);

        if(!chartData) {
            chartData = this.emptyTagTreeChartData(tagId, parentTagIds);
            parent.innerTags.push(chartData);
        }

        return chartData;
    }

    private static emptyTagTreeChartData(tagId:string, parentTagIds: string[]): DetailsChartData {
        return {
            tagId: tagId,
            totalAmount: 0,
            totalExpenses: 0,
            percentage: 0,
            innerTags: [],
            parentTagIds: [...parentTagIds]
        };
    }

    private static incrementChart(chart: DetailsChartData, amount: number) {
        chart.totalAmount += amount;
        chart.totalExpenses += 1;
    }

    private static calculatePercentage(tagCharts: DetailsChartData[]) {
		const sum = tagCharts.reduce((acc, tag) => acc + tag.totalAmount, 0)
		
		tagCharts.forEach(chart => chart.percentage = chart.totalAmount/sum);
		tagCharts.forEach(tag => this.calculatePercentage(tag.innerTags));
	}

	private static sortByAmount(tagCharts: DetailsChartData[]) {
		tagCharts.sort((a,b)=> b.totalAmount - a.totalAmount);
		tagCharts.forEach(tag => this.sortByAmount(tag.innerTags));
	}
}