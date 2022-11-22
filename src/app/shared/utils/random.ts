export const getRandomInt = function(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min);
}


export const getRandomDecimal = function(min: number, max: number) {
    const amount = getRandomInt(min, max);
    const cents = getRandomInt(0, 100);

    return amount + cents / 100;
}