import { supabase } from './supabase';
import type {
    CreatePaymentOrderRequest,
    CreatePaymentOrderResponse,
    VerifyPaymentRequest,
    VerifyPaymentResponse,
    AddMoneyToWalletRequest,
    AddMoneyToWalletResponse,
    VerifyWalletPaymentRequest,
    VerifyWalletPaymentResponse,
    DeductWalletRequest,
    DeductWalletResponse,
    SendPushNotificationRequest,
    SendPushNotificationResponse,
    UpdateLiveLocationRequest,
    UpdateLiveLocationResponse,
    SafetyCheckinRequest,
    SafetyCheckinResponse,
    SendRideShareEmailRequest,
    SendSplitFareEmailRequest,
} from '@/types/supabase-types';

/**
 * Edge Functions Service
 * Centralized service for all Supabase Edge Functions
 * Provides type-safe wrappers with error handling and retry logic
 */

interface EdgeFunctionOptions {
    retries?: number;
    retryDelay?: number;
}

class EdgeFunctionsService {
    private async invokeWithRetry<TRequest, TResponse>(
        functionName: string,
        payload: TRequest,
        options: EdgeFunctionOptions = {}
    ): Promise<{ data: TResponse | null; error: any }> {
        const { retries = 2, retryDelay = 1000 } = options;
        let lastError: any = null;

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const { data, error } = await supabase.functions.invoke<TResponse>(
                    functionName,
                    {
                        body: payload as any,
                    }
                );

                if (error) {
                    lastError = error;
                    console.error(
                        `Edge function ${functionName} error (attempt ${attempt + 1}):`,
                        error
                    );

                    // Don't retry on client errors (4xx)
                    if (error.status && error.status >= 400 && error.status < 500) {
                        return { data: null, error };
                    }

                    // Wait before retrying
                    if (attempt < retries) {
                        await new Promise((resolve) => setTimeout(resolve, retryDelay));
                        continue;
                    }
                }

                return { data, error };
            } catch (error) {
                lastError = error;
                console.error(
                    `Edge function ${functionName} exception (attempt ${attempt + 1}):`,
                    error
                );

                if (attempt < retries) {
                    await new Promise((resolve) => setTimeout(resolve, retryDelay));
                }
            }
        }

        return { data: null, error: lastError };
    }

    /**
     * Create a Razorpay payment order
     */
    async createPaymentOrder(
        request: CreatePaymentOrderRequest
    ): Promise<{ data: CreatePaymentOrderResponse | null; error: any }> {
        return this.invokeWithRetry<CreatePaymentOrderRequest, CreatePaymentOrderResponse>(
            'create-payment-order',
            request
        );
    }

    /**
     * Verify a Razorpay payment
     */
    async verifyPayment(
        request: VerifyPaymentRequest
    ): Promise<{ data: VerifyPaymentResponse | null; error: any }> {
        return this.invokeWithRetry<VerifyPaymentRequest, VerifyPaymentResponse>(
            'verify-payment',
            request
        );
    }

    /**
     * Add money to wallet
     */
    async addMoneyToWallet(
        request: AddMoneyToWalletRequest
    ): Promise<{ data: AddMoneyToWalletResponse | null; error: any }> {
        return this.invokeWithRetry<AddMoneyToWalletRequest, AddMoneyToWalletResponse>(
            'add-money-to-wallet',
            request
        );
    }

    /**
     * Verify wallet payment
     */
    async verifyWalletPayment(
        request: VerifyWalletPaymentRequest
    ): Promise<{ data: VerifyWalletPaymentResponse | null; error: any }> {
        return this.invokeWithRetry<
            VerifyWalletPaymentRequest,
            VerifyWalletPaymentResponse
        >('verify-wallet-payment', request);
    }

    /**
     * Deduct amount from wallet
     */
    async deductWallet(
        request: DeductWalletRequest
    ): Promise<{ data: DeductWalletResponse | null; error: any }> {
        return this.invokeWithRetry<DeductWalletRequest, DeductWalletResponse>(
            'deduct-wallet',
            request
        );
    }

    /**
     * Send push notification
     */
    async sendPushNotification(
        request: SendPushNotificationRequest
    ): Promise<{ data: SendPushNotificationResponse | null; error: any }> {
        return this.invokeWithRetry<
            SendPushNotificationRequest,
            SendPushNotificationResponse
        >('send-push-notification', request, { retries: 0 }); // Don't retry notifications
    }

    /**
     * Update live location
     */
    async updateLiveLocation(
        request: UpdateLiveLocationRequest
    ): Promise<{ data: UpdateLiveLocationResponse | null; error: any }> {
        return this.invokeWithRetry<
            UpdateLiveLocationRequest,
            UpdateLiveLocationResponse
        >('update-live-location', request, { retries: 1 }); // Quick retry for location
    }

    /**
     * Safety check-in
     */
    async safetyCheckin(
        request: SafetyCheckinRequest
    ): Promise<{ data: SafetyCheckinResponse | null; error: any }> {
        return this.invokeWithRetry<SafetyCheckinRequest, SafetyCheckinResponse>(
            'safety-checkin',
            request
        );
    }

    /**
     * Send ride share email
     */
    async sendRideShareEmail(
        request: SendRideShareEmailRequest
    ): Promise<{ data: any; error: any }> {
        return this.invokeWithRetry<SendRideShareEmailRequest, any>(
            'send-ride-share-email',
            request,
            { retries: 0 }
        );
    }

    /**
     * Send split fare email
     */
    async sendSplitFareEmail(
        request: SendSplitFareEmailRequest
    ): Promise<{ data: any; error: any }> {
        return this.invokeWithRetry<SendSplitFareEmailRequest, any>(
            'send-split-fare-email',
            request,
            { retries: 0 }
        );
    }

    /**
     * Auto-process payment after ride completion
     */
    async autoProcessPayment(bookingId: string): Promise<{ data: any; error: any }> {
        return this.invokeWithRetry<{ bookingId: string }, any>(
            'auto-process-payment',
            { bookingId }
        );
    }
}

// Export singleton instance
export const edgeFunctions = new EdgeFunctionsService();

// Export individual functions as wrappers (can't destructure class methods)
export const createPaymentOrder = (request: CreatePaymentOrderRequest) =>
    edgeFunctions.createPaymentOrder(request);

export const verifyPayment = (request: VerifyPaymentRequest) =>
    edgeFunctions.verifyPayment(request);

export const addMoneyToWallet = (request: AddMoneyToWalletRequest) =>
    edgeFunctions.addMoneyToWallet(request);

export const verifyWalletPayment = (request: VerifyWalletPaymentRequest) =>
    edgeFunctions.verifyWalletPayment(request);

export const deductWallet = (request: DeductWalletRequest) =>
    edgeFunctions.deductWallet(request);

export const sendPushNotification = (request: SendPushNotificationRequest) =>
    edgeFunctions.sendPushNotification(request);

export const updateLiveLocation = (request: UpdateLiveLocationRequest) =>
    edgeFunctions.updateLiveLocation(request);

export const safetyCheckin = (request: SafetyCheckinRequest) =>
    edgeFunctions.safetyCheckin(request);

export const sendRideShareEmail = (request: SendRideShareEmailRequest) =>
    edgeFunctions.sendRideShareEmail(request);

export const sendSplitFareEmail = (request: SendSplitFareEmailRequest) =>
    edgeFunctions.sendSplitFareEmail(request);

export const autoProcessPayment = (bookingId: string) =>
    edgeFunctions.autoProcessPayment(bookingId);

