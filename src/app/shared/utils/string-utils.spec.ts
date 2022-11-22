import { StringUtils } from "./string-utils";

describe('string-utils', () => {
    it('can get all letters of a string', () => {
        //given
        const string = 'abcd123.,/$%^';

        //when
        const letters = StringUtils.lettersOf(string);

        expect(letters).toEqual(['a','b','c','d','1','2','3','.',',','/','$','%','^'])
    });
});