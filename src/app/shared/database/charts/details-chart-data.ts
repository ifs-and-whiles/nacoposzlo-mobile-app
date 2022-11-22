import { Month } from "../../month";

export interface DetailsChartData {
	tagId: string;
	totalAmount: number;
	totalExpenses: number;
	percentage: number;
	innerTags: DetailsChartData[];
	parentTagIds: string[];
}

export interface MonthDetailsChartData {
	data: DetailsChartData;
    month: Month;
}