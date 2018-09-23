var anova = function(x) {
	// This function was adapted from this example on how to calculate the ANOVA table by hand:
	// https://stat.ethz.ch/education/semesters/as2013/anova/ANOVA_how_to_do.pdf
	var i, j;

	// The input object 'x' should be an array (groups/samples) of arrays (data points).
	if (!Array.isArray(x)) {
		return false;
	}
	var subArrayTest = x.map(function(x) {
		return Array.isArray(x);
	});
	if (!subArrayTest.every(function(x) { return x; })) {
		return false;
	}

	// Filter out missing values.
	for (i=0; i<x.length; i++) {
		x[i] = x[i].filter(function(a) {
			return a !== null && a !== undefined && !isNaN(a);
		});
	}

	// m = the number of samples
	var m = x.length;
	
	// n = size of each sample
	var n = x.map(function(a) {
		return a.length;
	});

	// Calculate the degrees of freedom between and within the samples.
	var dfBetween = m - 1;
	var dfWithin = n.reduce(function(a, b) {
		return a + b;
	});
	dfWithin -= m;

	// Calculate the sample means.
	var means = x.map(function(a) {
		return mean(a);
	});

	// Calculate the overall mean, i.e. the mean of all the data points over all samples.
	var allValues = x.reduce(function(a, b) {
		return a.concat(b);
	});
	var overallMean = mean(allValues);

	// Calculate the estimated effects, i.e. the difference between the estimated sample means
	// and the estimated overall mean.
	var estimatedEffects = means.map(function(a) {
		return a - overallMean;
	});

	// Calculate the sum of squares, both within and between the samples.
	var sst = 0;
	for (i=0; i<m; i++) {
		sst += Math.pow(estimatedEffects[i], 2) * n[i];
	}
	var ssr = 0;
	for (i=0; i<m; i++) {
		var groupValues = x[i];
		var groupMean = means[i];
		var ssGroup = 0;
		for (j=0; j<n[i]; j++) {
			ssGroup += Math.pow(groupValues[j] - groupMean, 2);
		}
		ssr += ssGroup;
	}
	var mst = sst / dfBetween;
	var msr = ssr / dfWithin;

	// Using the mean sum of squares, calculate the F statistic and the associated p value.
	var f = mst / msr;
	var p = fDistribution(f, dfBetween, dfWithin);
	return p;
};

var beta = function(x, y) {
	// Calculate the beta function using Sterling's approximation. See
	// https://en.wikipedia.org/wiki/Beta_function#Approximation for more information.
	var nominator = Math.pow(x, (x - 0.5)) * Math.pow(y, (y - 0.5));
	var denominator = Math.pow(x + y, x + y - 0.5);
	return Math.sqrt(2 * Math.PI) * nominator / denominator;
};

var countNull = function(x) {
	var nullCount = 0;
	for (var i = 0; i < x.length; i++) {
		if (x[i] === null || x[i] === 'null') {
			nullCount += 1;
		}
	}
	return nullCount;
};

var degreesOfFreedom = function(x, y) {
	// Calculate the number of degrees of freedom using Welch's formula.
	var nx = x.length;
	var ny = y.length;
	var xVar = variance(x);
	var yVar = variance(y);
	var numerator = Math.pow((xVar / nx + yVar / ny), 2);
	var denominator = (Math.pow(xVar / nx, 2) / (nx - 1)) + (Math.pow(yVar / ny, 2) / (ny - 1));
	var df = numerator / denominator;
	return df;	
};

var fDistribution = function(f, df1, df2) {
	// Calculate the probability density function for a given F statistic and degrees of freedom.
	// See https://en.wikipedia.org/wiki/F-distribution#Definition for more information.
	var result = Math.sqrt((Math.pow(df1 * f, df1) * Math.pow(df2, df2)) /
			(Math.pow(df1 * f + df2, df1 + df2))) /
		(f * beta(df1 / 2, df2 / 2));
	return result;
};

var isNumber = function(x) {
	return !isNaN(x);
};

var makeNumeric = function(x) {
	if (x === null) {
		return null;
	} else if (isNumber(x)) {
		return +x;
	} else {
		return null;
	}
};

var mean = function(x) {
	// Calculate the mean of an array of numeric values.
	x = x.map(makeNumeric);
	var n = x.length;
	var sum = 0;
	for (var i = 0; i < n; i++) {
		sum += x[i];
	}
	var m = sum / n;
	return m;
};

var median = function(x) {
	// Calculate the median of an array of numeric values.
	return quantile(x, 0.5);
};

function pAdjust(stats) {
	// Calculate Benjamini-Hochberg-adjusted p values.
	// Formula: adjusted p value = (p value * total number of p values) / p value index
	// The p value index is obtained by sorting all the p values in ascending order.
	// Start by cloning the input object. We do not want to modify the original object.
	var s = $.extend(true, {}, stats);
	var allPValues = [];
	$.each(s, function(key1, value1) {
		if (value1) {
			if ('p' in value1) {
				if (value1.p) {
					allPValues.push(value1.p);
				} else {
					allPValues.push(null);
				}
			} else {
				$.each(value1, function(key2, value2) {
					if (value2) {
						if ('p' in value2) {
							allPValues.push(value2.p);
						} else {
							allPValues.push(null);
						}
					}
				});
			}
		}
	});
	var allPValuesSorted = allPValues.slice().sort(function(a,b) { // slice() copies the array. We
																   // don't want to modify the
																   // original array.
		if (isFinite(a - b)) {
			return a - b;
		} else {
			return isFinite(a) ? -1 : 1;
		}
	});
	var adjustedPvalues = [];
	$.each(s, function(key1, value1) {
		if (value1) {
			if ('p' in value1) {
				if (value1.p) {
					s[key1].pAdj = value1.p * allPValuesSorted.length / (allPValuesSorted.lastIndexOf(value1.p) + 1);
					adjustedPvalues.push(s[key1].pAdj);
				} else {
					s[key1].pAdj = NaN;
					adjustedPvalues.push(NaN);
				}
			} else {
				$.each(value1, function(key2, value2) {
					if (value2) {
						if (value2.p) {
							s[key1][key2].pAdj = value2.p * allPValuesSorted.length / (allPValuesSorted.lastIndexOf(value2.p) + 1);
							adjustedPvalues.push(s[key1][key2].pAdj);
						} else {
							s[key1][key2].pAdj = NaN;
							adjustedPvalues.push(NaN);
						}
					}
				});
			}
		}
	});
	return s;
}

function pAdjust2(p) {
	var c;
	var n = p.length;
	var i = [];
	for (c = n; c > 0; c--) {
		i.push(c);
	}
	var pValues = [];
	for (c = 0; c < n; c++) {
		pValues[c] = [p[c], c];
	}
	// sort the p values
	var pValuesSorted = nestedArraySort(pValues, true, 0);
	var cumMin;
	for (c = 0; c < n; c++) {
		var x = pValuesSorted[c][0]*n/i[c];
		if (c !== 0) {
			if (x < cumMin) {
				cumMin = x;
			} else {
				x = cumMin;
			}
		} else {
			cumMin = x;
		}
		if (x > 1) {
			x = 1;
		}
		console.log('c = ' + c + ', p = ' + pValuesSorted[c][0] + ', x = ' + x + ', cumMin = ' + cumMin);
		pValuesSorted[c][0] = x;
	}
	// put the adjusted p values back in their original order
	pValuesSorted = nestedArraySort(pValuesSorted, false, 1);
	result = [];
	for (c = 0; c < pValuesSorted.length; c++) {
		result.push(pValuesSorted[c][0]);
	}
	return result;
}

function nestedArraySort(x, descending, sortIndex) {
	// This function sorts an array of nested arrays on the first element of each nested array.
	if (descending) {
		x.sort(function(a,b) {
			a = a[sortIndex];
			b = b[sortIndex];
			return a === b ? 0 : (a > b ? -1 : 1);
		});
	} else {
		x.sort(function(a,b) {
			a = a[sortIndex];
			b = b[sortIndex];
			return a === b ? 0 : (a < b ? -1 : 1);
		});
	}
	return x;
}

var pearsonCorrelation = function(x, y) {
	// Calculate the Pearson correlation coefficient between two arrays.
	var c;

	// Check if the arrays have the same length.
	if (x.length !== y.length) {
		return 'failed';
	}

	// Check if there are any missing values and remove them from both arrays if there are.
	var newX = [];
	var newY = [];
	for (c in y) {
		if (!isNaN(y[c]) && !isNaN(x[c])) {
			newY.push(+y[c]);
			newX.push(+x[c]);
		}
	}
	if (newY.length > 10) {
		// There are enough x and y values to calculate the correlation value.
		var n = newY.length;
		var xSum = 0;
		var ySum = 0;
		var xSquaredSum = 0;
		var ySquaredSum = 0;
		var xyProd = 0;
		for (c in newY) {
			xSum += newX[c];
			xSquaredSum += Math.pow(newX[c], 2);
			ySum += newY[c];
			ySquaredSum += Math.pow(newY[c], 2);
			xyProd += newX[c]*newY[c];
		}
		var numerator = xyProd - xSum*ySum / n;
		var denominator = Math.sqrt(xSquaredSum - Math.pow(xSum, 2) / n) *
			(Math.sqrt(ySquaredSum - Math.pow(ySum, 2) / n));
		var r = numerator / denominator;

		// Calculate the significance of the correlation value.
		// 1. Calculate the t statistic.
		var df = newY.length - 2;
		var t = Math.abs(r / (Math.sqrt((1 - Math.pow(r, 2)) / df)));

		// 2. Look up the p value in the t distribution.
		var p = tDistribution(df, t);
		return { r: r, p: p };
	} else {
		return null;
	}	
};

var quantile = function(x, q) {
	// Calculate the q-th quantile of an array of numeric values.
	x = x.map(makeNumeric);
	x = x.sort(function(a,b) {
		return a - b;
	});
	if (x.length === 0) {
		return 0;
	}
	var position = (x.length - 1) * q;
	var base = Math.floor(position);
	var rest = position - base;
	if (x[base] !== undefined) {
		return x[base] + rest * (x[base + 1] - x[base]);
	} else {
		return x[base];
	}
};

var summary = function(x, addQuantile) {
	// Calculate the summary of an array of numeric values. This includes:
	// - minimum & maximum
	// - mean
	// - 25%, 50% (median) and 75% quantiles
	// - the number of null values
	var result = {
		'minimum': Math.min.apply(Math, x),
		'maximum': Math.max.apply(Math, x),
		'mean': mean(x),
		'median': median(x),
		'null': countNull(x)
	};
	if (addQuantile) {
		result['quantile 25%'] = quantile(x, 0.25);
		result['quantile 75%'] = quantile(x, 0.75);
	}
	return result;
};

var tDistribution = function(df, t) {
	// Calculate a p value based on:
	// - a number of degrees of freedom
	// - a t value
	// - the t distribution.
	// The p value is calculated using a numerical approximation:
	// Abramowitz, M and Stegun, I. A. (1970), Handbook of Mathematical
	// Functions With Formulas, Graphs, and Mathematical Tables, NBS Applied
	// Mathematics Series 55, National Bureau of Standards, Washington, DC.
	// p 932: function 26.2.19
	// p 949: function 26.7.8
	var a1 = 0.049867347;
	var a2 = 0.0211410061;
	var a3 = 0.0032776263;
	var a4 = 0.0000380036;
	var a5 = 0.0000488906;
	var a6 = 0.000005383;
	var x = t * (1 - 1 / (4 * df)) / Math.sqrt(1 + Math.pow(t, 2) / (2 * df));
	var p = 2 * (1 / (2 * Math.pow(1 + a1 * x + a2 * Math.pow(x, 2) + a3 * Math.pow(x, 3) +
		a4 * Math.pow(x, 4) + a5 * Math.pow(x, 5) + a6 * Math.pow(x, 6), 16)));
	return p;
};

var tTest = function(x, y) {
	// Perform a Welch's t-test.
	var c;

	// Remove missing values.
	x = x.filter(function(a) {
		return a !== null && a !== undefined;
	});
	y = y.filter(function(a) {
		return a !== null && a !== undefined;
	});
	var nx = x.length;
	var ny = y.length;
	if (nx >= 3 && ny >= 3) {
		var xMean = mean(x);
		var yMean = mean(y);
		var xVar = variance(x);
		var yVar = variance(y);
		var t = (xMean - yMean) / (Math.sqrt(xVar / nx + yVar / ny));
		t = Math.abs(t);
		var df = degreesOfFreedom(x, y);
		var p = tDistribution(df, t);
		return p;
	} else {
		return NaN;
	}
};

var variance = function(x) {
	// Calculate the variance of an array of numeric values.
	var n = x.length;
	var m = mean(x);
	var diff = 0;
	for (var i = 0; i < n; i++) {
		diff += Math.pow((x[i] - m), 2);
	}
	var v = diff / n;
	return v;
};

/*
var testP = [0.00001, 0.003, 0.003, 0.003, 0.9873, 0.00009872, 0.045, 0.056, 0.6, 0.00826];
console.log(testP);
var testPSorted = testP.sort(function(a,b) {
	return a - b;
});
console.log(testPSorted);
$.each(testP, function(i,v) {
	console.log(v * testP.length / (testPSorted.lastIndexOf(v) + 1));
});
var testPAdj = pAdjust2(testP);
console.log('testPAdj:');
console.log(testPAdj);

*/