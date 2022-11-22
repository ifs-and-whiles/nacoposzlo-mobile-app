import { Month } from '../../month';
import { ComparisonChartTag } from './comparison-chart-tag';

export interface ComparisonChartMonth {
	month: Month;
	tags: ComparisonChartTag[];

	expensesCount: number;
	totalAmount: number;
}