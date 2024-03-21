export function calculateShipmentDetails(orders: any[]) {
    let totalShipments: any[] = [];
    let pickupPending = 0;
    let inTransit = 0;
    let delivered = 0;

    orders.forEach(order => {
        totalShipments.push(order);
        switch (order.orderStage) {
            case 0:
                pickupPending++;
                break;
            case 1:
                if (!order.pickupAddress) {
                    pickupPending++;
                } else {
                    inTransit++;
                }
                break;
            case 4:
                delivered++;
                break;
            default:
                break;
        }
    });

    return { totalShipments, pickupPending, inTransit, delivered, ndrPending: 0, rto: 0 };
}

export function calculateNDRDetails(orders: any[]) {
    let pickupPending = 0;
    let inTransit = 0;
    let delivered = 0;

    orders.forEach(order => {
        switch (order.orderStage) {
            case 0:
                pickupPending++;
                break;
            case 1:
                if (!order.pickupAddress) {
                    pickupPending++;
                } else {
                    inTransit++;
                }
                break;
            case 4:
                delivered++;
                break;
            default:
                break;
        }
    });

    return { totalShipments: orders.length, pickupPending, inTransit, delivered };
}

export function calculateCODDetails(orders: any[]) {
    const currentDate = new Date();
    const date30DaysAgo = new Date(currentDate);
    date30DaysAgo.setDate(date30DaysAgo.getDate() - 30);

    const CODOrders = orders.filter(order => order.payment_mode === 1);
    const totalCODLast30Days = CODOrders.filter(order => new Date(order.order_invoice_date) >= date30DaysAgo).length;
    const CODAvailable = CODOrders.length;

    const currentDateTimestamp = currentDate.getTime();
    const eightDaysAgoTimestamp = currentDateTimestamp - (8 * 24 * 60 * 60 * 1000);
    const CODPending = CODOrders.filter(order => new Date(order.order_invoice_date).getTime() < eightDaysAgoTimestamp).length;

    const remittedCODOrders = CODOrders.filter(order => order.orderStage === 3);
    const lastCODRemitted = remittedCODOrders.reduce((prev, curr) => (new Date(curr.order_invoice_date) > new Date(prev.order_invoice_date)) ? curr : prev, {});

    return { totalCODLast30Days, CODAvailable, CODPending, lastCODRemitted };
}

export function calculateRevenue(orders: any[]) {
    return orders.reduce((total, order) => total + (order.amount2Collect || 0), 0);
}

export function calculateAverageShippingCost(orders: any[]) {
    const totalShippingCost = orders.reduce((total, order) => total + (order.amount2Collect || 0), 0);
    return orders.length > 0 ? totalShippingCost / orders.length : 0;
}