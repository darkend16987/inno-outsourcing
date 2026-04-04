export declare const onCreateContractPDF: import("firebase-functions/core").CloudFunction<import("firebase-functions/v2/firestore").FirestoreEvent<import("firebase-functions/v2/firestore").QueryDocumentSnapshot | undefined, {
    contractId: string;
}>>;
export declare const requestPaymentOrder: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    paymentId: string;
}>, unknown>;
export declare const onJobStatusChange: import("firebase-functions/core").CloudFunction<import("firebase-functions/v2/firestore").FirestoreEvent<import("firebase-functions/v2/firestore").Change<import("firebase-functions/v2/firestore").QueryDocumentSnapshot> | undefined, {
    jobId: string;
}>>;
export declare const onApplicationSubmitted: import("firebase-functions/core").CloudFunction<import("firebase-functions/v2/firestore").FirestoreEvent<import("firebase-functions/v2/firestore").QueryDocumentSnapshot | undefined, {
    applicationId: string;
}>>;
export declare const onApplicationUpdated: import("firebase-functions/core").CloudFunction<import("firebase-functions/v2/firestore").FirestoreEvent<import("firebase-functions/v2/firestore").Change<import("firebase-functions/v2/firestore").QueryDocumentSnapshot> | undefined, {
    applicationId: string;
}>>;
export declare const onPaymentUpdated: import("firebase-functions/core").CloudFunction<import("firebase-functions/v2/firestore").FirestoreEvent<import("firebase-functions/v2/firestore").Change<import("firebase-functions/v2/firestore").QueryDocumentSnapshot> | undefined, {
    paymentId: string;
}>>;
export declare const onContractStatusChange: import("firebase-functions/core").CloudFunction<import("firebase-functions/v2/firestore").FirestoreEvent<import("firebase-functions/v2/firestore").Change<import("firebase-functions/v2/firestore").QueryDocumentSnapshot> | undefined, {
    contractId: string;
}>>;
export declare const onContractSubmitted: import("firebase-functions/core").CloudFunction<import("firebase-functions/v2/firestore").FirestoreEvent<import("firebase-functions/v2/firestore").Change<import("firebase-functions/v2/firestore").QueryDocumentSnapshot> | undefined, {
    contractId: string;
}>>;
export declare const scheduledDeadlineCheck: import("firebase-functions/v2/scheduler").ScheduleFunction;
export declare const scheduledLeaderboard: import("firebase-functions/v2/scheduler").ScheduleFunction;
export declare const generateInvoicePDF: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    pdfURL: string;
}>, unknown>;
export declare const onReviewCreated: import("firebase-functions/core").CloudFunction<import("firebase-functions/v2/firestore").FirestoreEvent<import("firebase-functions/v2/firestore").QueryDocumentSnapshot | undefined, {
    reviewId: string;
}>>;
