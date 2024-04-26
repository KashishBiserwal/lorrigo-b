
// Lorrigo Bucketing 
export const NEW = 0;
export const READY_TO_SHIP = 1;
export const IN_TRANSIT = 2;
export const NDR = 3;
export const DELIVERED = 4;
export const RTO = 5;
export const CANCELED = 6;
export const LOST_DAMAGED = 7;
export const DISPOSED = 8;


export const ORDER_TO_TRACK = [
    READY_TO_SHIP,
    IN_TRANSIT,
    NDR,
    DELIVERED,
    RTO,
    LOST_DAMAGED,
    DISPOSED,
];


// Universal Order Status
export const NEW_ORDER_STATUS = 0;
export const NEW_ORDER_DESCRIPTION = 'New';
export const COURRIER_ASSIGNED_ORDER_DESCRIPTION = "Courier Assigned";
export const MANIFEST_ORDER_DESCRIPTION = 'Manifest Generated';  // not used
export const PICKUP_SCHEDULED_DESCRIPTION = "Pickup Scheduled";
export const CANCELLED_ORDER_DESCRIPTION = 'Cancelled';
export const SHIPMENT_CANCELLED_ORDER_DESCRIPTION = 'Shipment Cancelled';
export const SHIPMENT_CANCELLED_ORDER_STATUS = -2;
export const CANCELLATION_REQUESTED_ORDER_STATUS = -1;



// SMARTSHIP ORDER STATUS
export const SMARTSHIP_COURIER_ASSIGNED_ORDER_STATUS = 24;

export const SMARTSHIP_MANIFEST_ORDER_STATUS = 4;

export const SMARTSHIP_SHIPPED_ORDER_STATUS = 10;
export const SMARTSHIP_SHIPPED_ORDER_DESCRIPTION = 'Shippped';

export const SMARTSHIP_ORDER_REATTEMPT_STATUS = 17;
export const SMARTSHIP_ORDER_REATTEMPT_DESCRIPTION = 'Reattempt Requested';



// SHIPROCKET ORDER STATUS
export const SHIPROCKET_SHIPPED_ORDER_STATUS = 6;
export const SHIPROCKET_SHIPPED_ORDER_DESCRIPTION = 'Ready for Pickup';

export const SHIPROCKET_COURIER_ASSIGNED_ORDER_STATUS = 52;

export const SHIPROCKET_MANIFEST_ORDER_STATUS = 67;


