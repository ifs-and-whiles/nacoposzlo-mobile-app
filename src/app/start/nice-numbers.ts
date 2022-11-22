/**
 * Calculate and update values for tick spacing and nice
 * minimum and maximum data points on the axis.
 */
export function calculateTicks(maxTicks: number, minPoint: number, maxPoint: number){
    let range = niceNum(maxPoint - minPoint, false);
    let tickSpacing = niceNum(range / (maxTicks - 1), true);
    let niceMin = Math.floor(minPoint / tickSpacing) * tickSpacing;
    let niceMax = Math.ceil(maxPoint / tickSpacing) * tickSpacing;
    let tickCount = range / tickSpacing;
    return {tickCount, niceMin, niceMax};
}

/**
 * Returns a "nice" number approximately equal to range Rounds
 * the number if round = true Takes the ceiling if round = false.
 *
 * @param range the data range
 * @param round whether to round the result
 * @return a "nice" number to be used for the data range
 */
function niceNum(range: number, round: boolean): number {
    let exponent: number;
    /** exponent of range */
    let fraction: number;
    /** fractional part of range */
    let niceFraction: number;
    /** nice, rounded fraction */

    exponent = Math.floor(Math.log10(range));
    fraction = range / Math.pow(10, exponent);

    if (round) {
        if (fraction < 1.5)
            niceFraction = 1;
        else if (fraction < 3)
            niceFraction = 2;
        else if (fraction < 7)
            niceFraction = 5;
        else
            niceFraction = 10;
    } else {
        if (fraction <= 1)
            niceFraction = 1;
        else if (fraction <= 2)
            niceFraction = 2;
        else if (fraction <= 5)
            niceFraction = 5;
        else
            niceFraction = 10;
    }

    return niceFraction * Math.pow(10, exponent);
}