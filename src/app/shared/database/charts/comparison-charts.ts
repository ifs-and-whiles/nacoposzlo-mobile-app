import { Month } from '../../month';
import { noCategoryTag } from '../../utils/no-category-tag';
import { ComparisonChartData } from './comparison-chart-data';
import { ComparisonChartMonth } from './comparison-chart-month';
import { ComparisonChartTag } from './comparison-chart-tag';

export interface IComparisonChartExpense {
    amount: number;
    tagIds: string[];
    dateUnixTimestamp: number;
}

export class ComparisonCharts{

    public static buildData(
        expenses: IComparisonChartExpense[],
        fromUnixTimestamp: number,
        toUnixTimestamp: number): ComparisonChartData {

        const chartMonths = Month
            .range(fromUnixTimestamp, toUnixTimestamp)
            .reverse()
            .map(month => {
                const monthData = this.createEmptyComparisonChartMonth(month);
                
                const monthStart = month.startUnixTimestamp();
                const nextMonthStart = month.next().startUnixTimestamp();

                expenses
                    .filter(expense => expense.dateUnixTimestamp >= monthStart && expense.dateUnixTimestamp < nextMonthStart)
                    .forEach(expense => {
                        this.incrementComparisonChartMonth(monthData, expense);
                        this.incrementComparisonChartTag(monthData, expense);
                    });

                return monthData;
            })
            .filter(chartMonth => chartMonth.expensesCount > 0)

        return {
            months: chartMonths
        };
    }

    private static createEmptyComparisonChartMonth(month: Month): ComparisonChartMonth {
        const comparisonChartMonth: ComparisonChartMonth = {
            month: month,
            tags: [],
            totalAmount: 0,
            expensesCount: 0
        }

        return comparisonChartMonth;
    }

    private static incrementComparisonChartMonth(comparisonChartMonth: ComparisonChartMonth, expense: IComparisonChartExpense): void {
        comparisonChartMonth.expensesCount += 1;
        comparisonChartMonth.totalAmount += expense.amount;
    }

    private static incrementComparisonChartTag(comparisonChartMonth: ComparisonChartMonth, expense: IComparisonChartExpense): void{
        const mainTagId = expense.tagIds[0] || noCategoryTag;
        const tagData = this.getOrAddComparisonChartTag(comparisonChartMonth, mainTagId);

        tagData.expenseCount += 1;
        tagData.amount += expense.amount;
    }

    private static getOrAddComparisonChartTag(comparisonChartMonth: ComparisonChartMonth, mainTagId: string): ComparisonChartTag{
        let comparisonChartTag = comparisonChartMonth
            .tags
            .find(t => t.tagId === mainTagId);

        if(!comparisonChartTag) {
            comparisonChartTag = {
                amount: 0,
                expenseCount: 0,
                tagId: mainTagId
            };

            comparisonChartMonth.tags.push(comparisonChartTag);
        }

        return comparisonChartTag;
    }
}