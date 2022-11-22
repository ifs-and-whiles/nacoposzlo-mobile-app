import { DetailsCharts } from "./details-charts";
import { noCategoryTag, noSubCategoryTag } from '../../utils/no-category-tag';
import { DetailsChartData } from './details-chart-data';

describe('DetailsCharts', () => {
  
    it('when there are no expenses chart is empty', () => {
        //when
        const chart = DetailsCharts.buildData([]);

        //then
        const expectedChart: DetailsChartData = {
            tagId: null,
            totalAmount: 0,
            totalExpenses: 0,
            percentage: 1,
            innerTags: [],
            parentTagIds: null
        };

        expect(chart).toEqual(expectedChart);
    });

    it('expense without tags goes to noCategoryTag group', () => {
        //when
        const chart = DetailsCharts.buildData([{
            amount: 10,
            tagIds: []
        }]);

        //then
        const expectedChart: DetailsChartData = {
            tagId: null,
            totalAmount: 10,
            totalExpenses: 1,
            percentage: 1,
            innerTags: [{
                tagId: noCategoryTag,
                totalAmount: 10,
                totalExpenses: 1,
                percentage: 1,
                innerTags: [],
                parentTagIds: []
            }],
            parentTagIds: null
        };
        
        expect(chart).toEqual(expectedChart);
    });

    it('expense with single tag goes to noSubCategoryTag subgroup of that tag group', () => {
        //when
        const chart = DetailsCharts.buildData([{
            amount: 10,
            tagIds: ['a']
        }]);

        //then
        const expectedChart: DetailsChartData = {
            tagId: null,
            totalAmount: 10,
            totalExpenses: 1,
            percentage: 1,
            innerTags: [{
                tagId: 'a',
                totalAmount: 10,
                totalExpenses: 1,
                percentage: 1,
                innerTags: [{
                    tagId: noSubCategoryTag,
                    totalAmount: 10,
                    totalExpenses: 1,
                    percentage: 1,
                    innerTags: [],
                    parentTagIds: ['a'],
                }],
                parentTagIds: []
            }],
            parentTagIds: null
        };
        
        expect(chart).toEqual(expectedChart);
    });

    it('expense with more tags goes to noSubCategoryTag of a relevant subgroup', () => {
        //when
        const chart = DetailsCharts.buildData([{
            amount: 10,
            tagIds: ['a', 'a1', 'a2']
        }]);

        //then
        const expectedChart: DetailsChartData = {
            tagId: null,
            totalAmount: 10,
            totalExpenses: 1,
            percentage: 1,
            innerTags: [{
                tagId: 'a',
                totalAmount: 10,
                totalExpenses: 1,
                percentage: 1,
                innerTags: [{
                    tagId: 'a1',
                    totalAmount: 10,
                    totalExpenses: 1,
                    percentage: 1,
                    innerTags: [{
                        tagId: 'a2',
                        totalAmount: 10,
                        totalExpenses: 1,
                        percentage: 1,
                        innerTags: [{
                            tagId: noSubCategoryTag,
                            totalAmount: 10,
                            totalExpenses: 1,
                            percentage: 1,
                            innerTags: [],
                            parentTagIds: ['a', 'a1', 'a2'],
                        }],
                        parentTagIds: ['a', 'a1']
                    }],
                    parentTagIds: ['a']
                }],
                parentTagIds: []
            }],
            parentTagIds: null
        };
        
        expect(chart).toEqual(expectedChart);
    });

    it('when there are more than one tag group percentages are counted accordingly and groups are sorted starting with the highest amount one', () => {
        //when
        const chart = DetailsCharts.buildData([{
            amount: 1,
            tagIds: []
        },{
            amount: 3,
            tagIds: ['a']
        },{
            amount: 6,
            tagIds: ['b']
        }]);

        //then
        const expectedChart: DetailsChartData = {
            tagId: null,
            totalAmount: 10,
            totalExpenses: 3,
            percentage: 1,
            innerTags: [{
                tagId: 'b',
                totalAmount: 6,
                totalExpenses: 1,
                percentage: 0.6,
                innerTags: [{
                    tagId: noSubCategoryTag,
                    totalAmount: 6,
                    totalExpenses: 1,
                    percentage: 1,
                    innerTags: [],
                    parentTagIds: ['b'],
                }],
                parentTagIds: [],
            },{
                tagId: 'a',
                totalAmount: 3,
                totalExpenses: 1,
                percentage: 0.3,
                innerTags: [{
                    tagId: noSubCategoryTag,
                    totalAmount: 3,
                    totalExpenses: 1,
                    percentage: 1,
                    innerTags: [],
                    parentTagIds: ['a'],
                }],
                parentTagIds: [],
            },{
                tagId: noCategoryTag,
                totalAmount: 1,
                totalExpenses: 1,
                percentage: 0.1,
                innerTags: [],
                parentTagIds: [],
            }],
            parentTagIds: null
        };
        
        expect(chart).toEqual(expectedChart);
    });

    it('expense with different tags are correctly redistributed on different tree levels', () => {
        //when
        const chart = DetailsCharts.buildData([{
            amount: 1,
            tagIds: ['a']
        },{
            amount: 1,
            tagIds: ['a']
        },{
            amount: 1,
            tagIds: ['a', 'a1']
        },{
            amount: 1,
            tagIds: ['a', 'a1']
        },{
            amount: 1,
            tagIds: ['a', 'a1', 'a2']
        },{
            amount: 1,
            tagIds: ['a', 'a1', 'a2']
        },{
            amount: 3,
            tagIds: ['b']
        },{
            amount: 3,
            tagIds: ['b']
        },{
            amount: 3,
            tagIds: ['b', 'b1']
        },{
            amount: 3,
            tagIds: ['b', 'b1']
        },{
            amount: 3,
            tagIds: ['b', 'b1', 'b2']
        },{
            amount: 3,
            tagIds: ['b', 'b1', 'b2']
        }]);

        //then
        const expectedChart: DetailsChartData = {
            tagId: null,
            totalAmount: 24,
            totalExpenses: 12,
            percentage: 1,
            innerTags: [{
                tagId: 'b',
                totalAmount: 18,
                totalExpenses: 6,
                percentage: 18/24,
                innerTags: [{
                    tagId: 'b1',
                    totalAmount: 12,
                    totalExpenses: 4,
                    percentage: 12/18,
                    innerTags: [{
                        tagId: noSubCategoryTag,
                        totalAmount: 6,
                        totalExpenses: 2,
                        percentage: 6/12,
                        innerTags: [],
                        parentTagIds: ['b', 'b1']
                    },{
                        tagId: 'b2',
                        totalAmount: 6,
                        totalExpenses: 2,
                        percentage: 6/12,
                        innerTags: [{
                            tagId: noSubCategoryTag,
                            totalAmount: 6,
                            totalExpenses: 2,
                            percentage: 1,
                            innerTags: [],
                            parentTagIds: ['b', 'b1', 'b2'],
                        }],
                        parentTagIds: ['b', 'b1']
                    }],
                    parentTagIds: ['b']
                },{
                    tagId: noSubCategoryTag,
                    totalAmount: 6,
                    totalExpenses: 2,
                    percentage: 6/18,
                    innerTags: [],
                    parentTagIds: ['b']
                }],
                parentTagIds: []
            },{
                tagId: 'a',
                totalAmount: 6,
                totalExpenses: 6,
                percentage: 6/24,
                innerTags: [{
                    tagId: 'a1',
                    totalAmount: 4,
                    totalExpenses: 4,
                    percentage: 4/6,
                    innerTags: [{
                        tagId: noSubCategoryTag,
                        totalAmount: 2,
                        totalExpenses: 2,
                        percentage: 2/4,
                        innerTags: [],
                        parentTagIds: ['a', 'a1']
                    },{
                        tagId: 'a2',
                        totalAmount: 2,
                        totalExpenses: 2,
                        percentage: 2/4,
                        innerTags: [{
                            tagId: noSubCategoryTag,
                            totalAmount: 2,
                            totalExpenses: 2,
                            percentage: 1,
                            innerTags: [],
                            parentTagIds: ['a', 'a1', 'a2'],
                        }],
                        parentTagIds: ['a', 'a1']
                    }],
                    parentTagIds: ['a']
                },{
                    tagId: noSubCategoryTag,
                    totalAmount: 2,
                    totalExpenses: 2,
                    percentage: 2/6,
                    innerTags: [],
                    parentTagIds: ['a']
                }],
                parentTagIds: []
            }],
            parentTagIds: null
        };
        
        expect(chart).toEqual(expectedChart);
    });
});