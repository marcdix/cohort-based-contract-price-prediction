const lunchData = require('./data.json');
const significanceArg = process.argv[2];
let significantOnly = true;

if (significanceArg === '--non-significant-only') {
    significantOnly = false;
}

function median(numbers) {
    const sorted = Array.from(numbers).sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
        return (sorted[middle - 1] + sorted[middle]) / 2;
    }

    return sorted[middle];
}

function relativeDiff(a, b) {
    return  100 * Math.abs( ( a - b ) / ( (a+b)/2 ) );
}

const stats = lunchData.map(data => {
    const order_lines = JSON.parse(data['conf']);

    if (!Array.isArray(order_lines)) return;

    return order_lines.reduce((acc, line) => {
        if (line.deleted_at || line.amount === 0 || line.single === 0) return acc;

        if (line.type === 'static') {
            acc.delivery += line.amount * line.single;
        }

        if (line.type === 'dynamic') {
            acc.singleItemValues.push(line.single);
            acc.itemAmount += line.amount;
            acc.itemSum += line.amount * line.single
        }

        acc.uuid = line.uuid;

        return acc;
    }, { delivery: 0, singleItemValues: [], itemAmount: 0, itemSum: 0, uuid: null });
}).filter(item => !!item);

const overall = stats.reduce((acc, contract) => {
    acc.delivery.push(contract.delivery);
    acc.singleItemValues = [...acc.singleItemValues, ...contract.singleItemValues];
    return acc;
}, { delivery: [], singleItemValues: [] });

const overallStats = {
    medianDeliveryDKK: median(overall.delivery),
    averageDeliveryDKK: overall.delivery.reduce((acc, cur) => acc += cur, 0) / overall.delivery.length,
    medianItemDKK: median(overall.singleItemValues),
    averageItemDKK: overall.singleItemValues.reduce((acc, cur) => acc += cur, 0) / overall.singleItemValues.length,
};

const statOutput = Array.from(Array(10000).keys()).map(amount => {
    const cohortContracts = stats.filter(contract => contract.itemAmount === amount);
    if (cohortContracts.length === 0) return;
    const cohortDelivery = cohortContracts.reduce((acc, cur) => acc += cur.delivery, 0);
    const cohortDeliveryAverage = cohortDelivery / cohortContracts.length;
    const cohortDeliveryMedian = median(cohortContracts.map(contract => contract.delivery));
    const cohortAverage = cohortContracts.reduce((acc, cur) => acc += cur.itemSum, 0) / cohortContracts.length;
    const cohortMedian = median(cohortContracts.map(contract => contract.itemSum));
    const cohortCount = cohortContracts.length;

    if (significantOnly) {
        if (cohortCount < 4 || amount < 10) return;
    } else {
        if (!(cohortCount < 4 || amount < 10)) return;
    }

    const estimateAverageInclDeliveryAverage = Math.round(amount * overallStats.averageItemDKK + overallStats.averageDeliveryDKK);
    const estimateMedianInclDeliveryMedian = Math.round(amount * overallStats.medianItemDKK + overallStats.medianDeliveryDKK);

    const cohortAverageInclDeliveryAverage = Math.round(cohortAverage + cohortDeliveryAverage);
    const cohortMedianIncludingDeliveryMedian = cohortMedian + cohortDeliveryMedian;

    return {
        pax: amount,
        'overall average': estimateAverageInclDeliveryAverage,
        'overall median': estimateMedianInclDeliveryMedian,
        'devi avg <> median (%)': Number(relativeDiff(estimateAverageInclDeliveryAverage, estimateMedianInclDeliveryMedian).toFixed(2)),
        'cohort avg': cohortAverageInclDeliveryAverage ,
        'cohort median': cohortMedianIncludingDeliveryMedian,
        'cohort count': cohortCount,
        'devi overall avg <> cohort avg (%)': Number(relativeDiff(estimateAverageInclDeliveryAverage, cohortAverageInclDeliveryAverage).toFixed(2)),
        'devi overall median <> cohort median (%)': Number(relativeDiff(estimateMedianInclDeliveryMedian, cohortMedianIncludingDeliveryMedian).toFixed(2)),
    }
})

console.table(statOutput.filter(item => !!item));