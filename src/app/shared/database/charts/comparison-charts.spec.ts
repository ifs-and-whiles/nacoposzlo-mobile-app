import { ComparisonCharts } from "./comparison-charts";
import { Month } from '../../month';
import { noCategoryTag } from '../../utils/no-category-tag';
import { ComparisonChartData } from './comparison-chart-data';

describe('ComparisonCharts', () => {
  
    it('if toDate is smaller than fromDate error should be thrown', () => {
        //when
        const chartDataBuilding = () => ComparisonCharts.buildData(
            [],
            timestamp("2020-01-31"),
            timestamp("2020-01-01")
        );

        //then
        expect(chartDataBuilding).toThrowError();
    });

    it('month without at least one expense should be skipped', () => {
        //when
        const chartData = ComparisonCharts.buildData(
            [],
            timestamp("2020-01-01"),
            timestamp("2020-01-31")
        );

        //then
        const expectedChartData: ComparisonChartData = {
            months: []
        };

        expect(chartData).toEqual(expectedChartData);
    });

    it('month with at least one expense should be summarized', () => {
        //when
        const chartData = ComparisonCharts.buildData(
            [{
                amount: 100,
                tagIds: [],
                dateUnixTimestamp: timestamp("2020-01-02")
            }],
            timestamp("2020-01-01"),
            timestamp("2020-01-31")
        );

        //then
        const expectedChartData: ComparisonChartData = {
            months: [{
                month: new Month(0, 2020),
                expensesCount: 1,
                totalAmount: 100,
                tags: [{
                    tagId: noCategoryTag,
                    amount: 100,
                    expenseCount: 1
                }]
            }]
        };

        expect(chartData).toEqual(expectedChartData);
    });

    it('expense outside of requested time frame should be ignored', () => {
        //when
        const chartData = ComparisonCharts.buildData(
            [{
                amount: 100,
                tagIds: [],
                dateUnixTimestamp: timestamp("2020-01-02")
            },{
                amount: 200,
                tagIds: [],
                dateUnixTimestamp: timestamp("2020-02-01")
            }],
            timestamp("2020-01-01"),
            timestamp("2020-01-31")
        );

        //then
        const expectedChartData: ComparisonChartData = {
            months: [{
                month: new Month(0, 2020),
                expensesCount: 1,
                totalAmount: 100,
                tags: [{
                    tagId: noCategoryTag,
                    amount: 100,
                    expenseCount: 1
                }]
            }]
        };

        expect(chartData).toEqual(expectedChartData);
    });

    it('expenses without categories should be summarized under no-category-tag', () => {
        //when
        const chartData = ComparisonCharts.buildData(
            [{
                amount: 100,
                tagIds: [],
                dateUnixTimestamp: timestamp("2020-01-02")
            },{
                amount: 50,
                tagIds: [],
                dateUnixTimestamp: timestamp("2020-01-03")
            }],
            timestamp("2020-01-01"),
            timestamp("2020-01-31")
        );

        //then
        const expectedChartData: ComparisonChartData = {
            months: [{
                month: new Month(0, 2020),
                expensesCount: 2,
                totalAmount: 150,
                tags: [{
                    tagId: noCategoryTag,
                    amount: 150,
                    expenseCount: 2
                }]
            }]
        };

        expect(chartData).toEqual(expectedChartData);
    });

    it('expenses with categories should be grouped by main one', () => {
        //when
        const chartData = ComparisonCharts.buildData(
            [{
                amount: 10,
                tagIds: ["a"],
                dateUnixTimestamp: timestamp("2020-01-02")
            },{
                amount: 20,
                tagIds: ["b"],
                dateUnixTimestamp: timestamp("2020-01-03")
            },{
                amount: 30,
                tagIds: ["a", "a1"],
                dateUnixTimestamp: timestamp("2020-01-04")
            },{
                amount: 40,
                tagIds: ["b", "b1"],
                dateUnixTimestamp: timestamp("2020-01-05")
            }],
            timestamp("2020-01-01"),
            timestamp("2020-01-31")
        );

        //then
        const expectedChartData: ComparisonChartData = {
            months: [{
                month: new Month(0, 2020),
                expensesCount: 4,
                totalAmount: 100,
                tags: [{
                    tagId: "a",
                    amount: 40,
                    expenseCount: 2
                },{
                    tagId: "b",
                    amount: 60,
                    expenseCount: 2
                }]
            }]
        };

        expect(chartData).toEqual(expectedChartData);
    });

    it('months should be returned in descending order', () => {
        //when
        const chartData = ComparisonCharts.buildData(
            [{
                amount: 10,
                tagIds: [],
                dateUnixTimestamp: timestamp("2020-01-01")
            },{
                amount: 10,
                tagIds: [],
                dateUnixTimestamp: timestamp("2020-02-01")
            }],
            timestamp("2020-01-01"),
            timestamp("2020-02-29")
        );

        //then
        const expectedChartData: ComparisonChartData = {
            months: [{
                month: new Month(1, 2020),
                expensesCount: 1,
                totalAmount: 10,
                tags: [{
                    tagId: noCategoryTag,
                    amount: 10,
                    expenseCount: 1
                }]
            },{
                month: new Month(0, 2020),
                expensesCount: 1,
                totalAmount: 10,
                tags: [{
                    tagId: noCategoryTag,
                    amount: 10,
                    expenseCount: 1
                }]
            }]
        };

        expect(chartData).toEqual(expectedChartData);
    });

    it('expenses should be grouped by months and by categories', () => {
        //when
        const chartData = ComparisonCharts.buildData(
            [{
                amount: 10,
                tagIds: ["a"],
                dateUnixTimestamp: timestamp("2020-01-02")
            },{
                amount: 20,
                tagIds: ["b"],
                dateUnixTimestamp: timestamp("2020-01-03")
            },{
                amount: 30,
                tagIds: ["a", "a1"],
                dateUnixTimestamp: timestamp("2020-02-02")
            },{
                amount: 40,
                tagIds: ["b", "b1"],
                dateUnixTimestamp: timestamp("2020-02-03")
            }],
            timestamp("2020-01-01"),
            timestamp("2020-02-29")
        );

        //then
        const expectedChartData: ComparisonChartData = {
            months: [{
                month: new Month(1, 2020),
                expensesCount: 2,
                totalAmount: 70,
                tags: [{
                    tagId: "a",
                    amount: 30,
                    expenseCount: 1
                },{
                    tagId: "b",
                    amount: 40,
                    expenseCount: 1
                }]
            },{
                month: new Month(0, 2020),
                expensesCount: 2,
                totalAmount: 30,
                tags: [{
                    tagId: "a",
                    amount: 10,
                    expenseCount: 1
                },{
                    tagId: "b",
                    amount: 20,
                    expenseCount: 1
                }]
            }]
        };

        expect(chartData).toEqual(expectedChartData);
    });
});

function timestamp(date: string) {
    return new Date(date).getTime();
}