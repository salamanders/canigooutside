/*global console, requireNumber */
/*jshint esversion: 8 */
/*jshint unused:true */
/*jshint strict:implied */
/*exported interpolate, distance */
/*jshint -W097 */


// https://stackoverflow.com/a/31331172/1117848

// Calculate the area of a triangle
function triangle_area(vertexA, vertexB, vertexC) {
    return Math.abs(((vertexA.x - vertexC.x) * (vertexB.y - vertexA.y) - (
        vertexA.x - vertexB.x) * (vertexC.y - vertexA.y)) * 0.5);
}

// Given a number N, return a list of all possible triples from the list [1..N]
// credit: http://stackoverflow.com/a/5752056/1612562
function list_triples(N) {
    const fn = function (n, src, got, all) {
        if (n === 0) {
            if (got.length > 0) {
                all[all.length] = got;
            }
            return;
        }
        for (let j = 0; j < src.length; j++) {
            fn(n - 1, src.slice(j + 1), got.concat([src[j]]), all);
        }
    };

    const triples = [];
    // Generates the list [0, ..., N]
    // credit: http://stackoverflow.com/a/20066663/1612562
    const indices = Array.apply(null, {length: N}).map(Number.call, Number);
    fn(3, indices, [], triples);
    return triples;
}

// Given three vertices of a triangle and a point, determine if
// the point falls in the triangle
// credit: https://koozdra.wordpress.com/2012/06/27/javascript-is-point-in-triangle/
// credit: http://www.blackpawn.com/texts/pointinpoly/default.html
function is_in_triangle(newPoint, vertexA, vertexB, vertexC) {
    const v0 = [vertexC.x - vertexA.x, vertexC.y - vertexA.y];
    const v1 = [vertexB.x - vertexA.x, vertexB.y - vertexA.y];
    const v2 = [newPoint.x - vertexA.x, newPoint.y - vertexA.y];

    const dot00 = (v0[0] * v0[0]) + (v0[1] * v0[1]);
    const dot01 = (v0[0] * v1[0]) + (v0[1] * v1[1]);
    const dot02 = (v0[0] * v2[0]) + (v0[1] * v2[1]);
    const dot11 = (v1[0] * v1[0]) + (v1[1] * v1[1]);
    const dot12 = (v1[0] * v2[0]) + (v1[1] * v2[1]);

    const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);

    const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    const v = (dot00 * dot12 - dot01 * dot02) * invDenom;

    return ((u >= 0) && (v >= 0) && (u + v < 1));
}

// Perform barycentric interpolation on a point in a triangle
function barycentric_interpolate(newPoint, vertexA, vertexB, vertexC) {
    const area = triangle_area(vertexA, vertexB, vertexC);
    const sub_area_1 = triangle_area(newPoint, vertexB, vertexC);
    const sub_area_2 = triangle_area(vertexA, newPoint, vertexC);
    const sub_area_3 = triangle_area(vertexA, vertexB, newPoint);
    return (
        (sub_area_1 * vertexA.v) +
        (sub_area_2 * vertexB.v) +
        (sub_area_3 * vertexC.v)
    ) / area;
}

// Find the smallest triangle in the data set containing the new
// point, and perform barycentric interpolation using that triangle
function interpolate(newPoint, data) {
    const triangles = list_triples(data.length);
    let smallest_triangle_area = Number.MAX_VALUE;
    let smallest_triangle;
    for (let t in triangles) {
        const vertexA = data[triangles[t][0]];
        const vertexB = data[triangles[t][1]];
        const vertexC = data[triangles[t][2]];
        const in_triangle = is_in_triangle(newPoint, vertexA, vertexB, vertexC);
        if (in_triangle) {
            if (triangle_area(vertexA, vertexB, vertexC) < smallest_triangle_area) {
                smallest_triangle = [vertexA, vertexB, vertexC];
            }
        }
    }

    return smallest_triangle ?
        barycentric_interpolate(newPoint, smallest_triangle[0], smallest_triangle[1], smallest_triangle[2]) :
        "Interpolation failed: newPoint isn't in a triangle";
}


//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
//:::                                                                         :::
//:::  This routine calculates the distance between two points (given the     :::
//:::  latitude/longitude of those points). It is being used to calculate     :::
//:::  the distance between two locations using GeoDataSource (TM) prodducts  :::
//:::                                                                         :::
//:::  Definitions:                                                           :::
//:::    South latitudes are negative, east longitudes are positive           :::
//:::                                                                         :::
//:::  Passed to function:                                                    :::
//:::    lat1, lon1 = Latitude and Longitude of point 1 (in decimal degrees)  :::
//:::    lat2, lon2 = Latitude and Longitude of point 2 (in decimal degrees)  :::
//:::    unit = the unit you desire for results                               :::
//:::           where: 'M' is statute miles (default)                         :::
//:::                  'K' is kilometers                                      :::
//:::                  'N' is nautical miles                                  :::
//:::                                                                         :::
//:::  Worldwide cities and other features databases with latitude longitude  :::
//:::  are available at https://www.geodatasource.com                         :::
//:::                                                                         :::
//:::  For enquiries, please contact sales@geodatasource.com                  :::
//:::                                                                         :::
//:::  Official Web site: https://www.geodatasource.com                       :::
//:::                                                                         :::
//:::               GeoDataSource.com (C) All Rights Reserved 2018            :::
//:::                                                                         :::
//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

/**
 *
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @param {string=} unit
 * @return {number}
 */
function distance(lat1, lon1, lat2, lon2, unit = 'K') {
    try {
        requireNumber(lat1, -90, 90);
        requireNumber(lon1, -180, 180);
        requireNumber(lat2, -90, 90);
        requireNumber(lon2, -180, 180);
    } catch (e) {
        console.warn(`failed call to distance(${lat1}, ${lon1}, ${lat2}, ${lon2})`);
        return Number.MAX_SAFE_INTEGER;
    }


    if ((lat1 === lat2) && (lon1 === lon2)) {
        return 0;
    } else {
        const radlat1 = Math.PI * lat1 / 180;
        const radlat2 = Math.PI * lat2 / 180;
        const theta = lon1 - lon2;
        const radtheta = Math.PI * theta / 180;
        let dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
        if (dist > 1) {
            dist = 1;
        }
        dist = Math.acos(dist);
        dist = dist * 180 / Math.PI;
        dist = dist * 60 * 1.1515;
        if (unit === "K") {
            dist = dist * 1.609344
        }
        if (unit === "N") {
            dist = dist * 0.8684
        }
        return dist;
    }
}