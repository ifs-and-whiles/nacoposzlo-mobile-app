import { SingleTagUsage, TagChainUsage } from "./tags.manager";
import { TagsMath } from './tagsMath';

describe('tags.manager', () => {
    describe('TagsMath', () => {
        describe('calculateUsage', () => {
            it('when no tags are used tags usage is empty', () => {
                //when
                const usage = TagsMath.calculateUsage([], _ => []);

                //then
                expect(usage.single).toEqual([]);
                expect(usage.chains).toEqual([]);
            });

            it('when one tag is used its reflected in the usage result', () => {
                //given
                const items = [{
                    tags: ['a']
                }];

                //when
                const usage = TagsMath.calculateUsage(items, item => item.tags);

                //then
                const expectedSingleUsage: SingleTagUsage[] = [{
                    tagId: 'a',
                    count: 1,
                    countAsMainTag: 1
                }];

                expect(usage.single).toEqual(expectedSingleUsage);

                const expectedChainUsage: TagChainUsage[] = [{
                    tagIds: ['a'],
                    count: 1
                }];

                expect(usage.chains).toEqual(expectedChainUsage);
            });

            it('only first tag in hierarchy is used as a main one', () => {
                //given
                const items = [{
                    tags: ['a', 'b']
                },{
                    tags: ['a', 'a']
                }];

                //when
                const usage = TagsMath.calculateUsage(items, item => item.tags);

                //then
                const expectedSingleUsage: SingleTagUsage[] = [{
                    tagId: 'a',
                    count: 3,
                    countAsMainTag: 2
                },{
                    tagId: 'b',
                    count: 1,
                    countAsMainTag: 0
                }];

                expect(usage.single).toEqual(expectedSingleUsage);

                const expectedChainUsage: TagChainUsage[] = [{
                    tagIds: ['a', 'b'],
                    count: 1
                }, {
                    tagIds: ['a', 'a'],
                    count: 1
                }];

                expect(usage.chains).toEqual(expectedChainUsage);
            });

            it('tags are case insensitive', () => {
                //given
                const items = [{
                    tags: ['a']
                },{
                    tags: ['A']
                }];

                //when
                const usage = TagsMath.calculateUsage(items, item => item.tags);

                //then
                const expectedSingleUsage: SingleTagUsage[] = [{
                    tagId: 'a',
                    count: 2,
                    countAsMainTag: 2
                }];

                expect(usage.single).toEqual(expectedSingleUsage);

                const expectedChainUsage: TagChainUsage[] = [{
                    tagIds: ['a'],
                    count: 2
                }];

                expect(usage.chains).toEqual(expectedChainUsage);
            });
        });

        describe('calculateDifference', () => {
            it('when no tags were used previously and no tags are used now, there is no difference', () => {
                //when
                const diff = TagsMath.calculateDifference(
                    { single: [], chains: []}, 
                    { single: [], chains: []});

                //then
                expect(diff).toEqual({ single: [], chains: [] });
            });

            it('when exact same tags where used previously and now, there is no difference', () => {
                //given
                const old: SingleTagUsage[] = [{
                    tagId: 'a',
                    count: 1,
                    countAsMainTag: 1
                }];

                const current: SingleTagUsage[] = [{
                    tagId: 'a',
                    count: 1,
                    countAsMainTag: 1
                }];

                //when
                const diff = TagsMath.calculateDifference(
                    { single: old, chains: []}, 
                    { single: current, chains: []});

                //then
                expect(diff).toEqual({ single: [], chains: [] });
            });

            it('when new tag was used for the first time difference is positive', () => {
                //given
                const old: SingleTagUsage[] = [];

                const current: SingleTagUsage[] = [{
                    tagId: 'a',
                    count: 1,
                    countAsMainTag: 1
                }];

                //when
                const diff = TagsMath.calculateDifference(
                    { single: old, chains: []}, 
                    { single: current, chains: []});

                //then
                expect(diff).toEqual({ 
                    single: [{
                        tag: 'a',
                        count: 1,
                        countAsMainTag: 1
                    }], 
                    chains: [] });
            });

            it('when old tag was stopped being used difference is negative', () => {
                //given
                const old: SingleTagUsage[] = [{
                    tagId: 'a',
                    count: 1,
                    countAsMainTag: 1
                }];

                const current: SingleTagUsage[] = [];

                //when
                const diff = TagsMath.calculateDifference(
                    { single: old, chains: []}, 
                    { single: current, chains: []});

                //then
                expect(diff).toEqual({ 
                    single: [{
                        tag: 'a',
                        count: -1,
                        countAsMainTag: -1
                    }], 
                    chains: [] });
            });

            it('more than one tag differences can be calculated', () => {
                //given
                const old: SingleTagUsage[] = [{
                    tagId: 'a',
                    count: 10,
                    countAsMainTag: 10
                },{
                    tagId: 'b',
                    count: 5,
                    countAsMainTag: 5
                },{
                    tagId: 'c',
                    count: 15,
                    countAsMainTag: 15
                }];

                const current: SingleTagUsage[] = [{
                    tagId: 'a',
                    count: 10,
                    countAsMainTag: 10
                },{
                    tagId: 'b',
                    count: 10,
                    countAsMainTag: 0
                },{
                    tagId: 'd',
                    count: 5,
                    countAsMainTag: 5
                }];

                //when
                const diff = TagsMath.calculateDifference(
                    { single: old, chains: []}, 
                    { single: current, chains: []});

                //then
                expect(diff).toEqual({ 
                    single: [{
                        tag: 'b',
                        count: 5,
                        countAsMainTag: -5
                    },{
                        tag: 'c',
                        count: -15,
                        countAsMainTag: -15
                    },{
                        tag: 'd',
                        count: 5,
                        countAsMainTag: 5
                    }], 
                    chains: [] });
            });
        });
    });
});