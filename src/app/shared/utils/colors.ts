export const defaultTagColor = '#b7bbbd';

// https://github.com/PimpTrizkit/PJs/wiki/12.-Shade,-Blend-and-Convert-a-Web-Color-(pSBC.js)#--version-2-hex--
export const shadeHexColor = function(color: string, percent: number) {
    var f=parseInt(color.slice(1),16),t=percent<0?0:255,p=percent<0?percent*-1:percent,R=f>>16,G=f>>8&0x00FF,B=f&0x0000FF;
    return "#"+(0x1000000+(Math.round((t-R)*p)+R)*0x10000+(Math.round((t-G)*p)+G)*0x100+(Math.round((t-B)*p)+B)).toString(16).slice(1);
}

export const colorsPalette = [
    "#f44336", "#d32f2f", "#b71c1c",
    "#E91E63", "#C2185B", "#880E4F",
    "#9C27B0", "#7B1FA2", "#4A148C",
    "#673AB7", "#512DA8", "#311B92",
    "#3F51B5", "#303F9F", "#1A237E",
    "#2196F3", "#1976D2", "#0D47A1",
    "#03A9F4", "#0288D1", "#01579B",
    "#00BCD4", "#0097A7", "#006064",
    "#009688", "#00796B", "#004D40",
    "#4CAF50", "#388E3C", "#1B5E20",
    "#8BC34A", "#689F38", "#33691E",
    "#FBC02D", "#F57F17",
    "#FFC107", "#FFA000", "#FF6F00",
    "#FF9800", "#F57C00", "#E65100",
    "#FF5722", "#E64A19", "#BF360C",
    "#795548", "#5D4037", "#3E2723",        
];  

export const getRandomColor = function() {
    return colorsPalette[getRandomInt(colorsPalette.length)]

    function getRandomInt(max) {
        return Math.floor(Math.random() * Math.floor(max));
    }
}