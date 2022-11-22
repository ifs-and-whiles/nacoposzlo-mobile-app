export class ArrayUtils {
    public static remove<T>(array: T[], item: T) {
        const index = array.indexOf(item);
        if(index > -1) array.splice(index, 1);
    }

    public static removeFirst<T>(array: T[], predicate: (item: T) => boolean) {
        const index = array.findIndex(item => predicate(item));
        if(index > -1) array.splice(index, 1);
    }

    public static range(from: number, to: number) : number[] {
        const result = [];

        for (let index = from; index <= to; index++) {
            result.push(index);            
        }

        return result;
    }

    public static doesContainSubArray<T>(array: T[], subarray: T[], equalityComparer: (a: T, b: T) => boolean) {
        if(subarray.length == 0) return true;
        
        let currentSubarrayIndex = 0;

        for (let index = 0; index < array.length; index++) {
            const element = array[index];
            const subElement = subarray[currentSubarrayIndex];

            if(equalityComparer(element, subElement)){
                currentSubarrayIndex ++;

                if(currentSubarrayIndex === subarray.length) return true;
            } else {
                if(currentSubarrayIndex != 0) return false;
            }
        }

        return false;
    }
}