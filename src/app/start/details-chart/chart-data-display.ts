import * as _ from 'lodash';

export interface ChartDataDisplay {
	totalAmount: number;
	totalExpenses: number;
	innerTags: TagChartDataDisplay[];
	parentTagIds: string[];
}

export interface TagChartDataDisplay {
	tagId: string;
	innerTags: TagChartDataDisplay[];
	parentTagIds: string[];
	totalAmount: number;
	percentage: number;
	expenseCount: number;
}

export class ChartData {
    public static areEquivalent(first: ChartDataDisplay, second: ChartDataDisplay): boolean {
        const areEqual = _.isEqual(first, second);

        return areEqual;
    }
}
