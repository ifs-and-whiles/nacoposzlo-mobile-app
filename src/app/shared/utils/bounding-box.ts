export interface BoundingBox {
    leftTop: Point;
    rightTop: Point;
    leftBottom: Point;
    rightBottom: Point;
}

export interface Point {
    x: number;
    y: number;
}