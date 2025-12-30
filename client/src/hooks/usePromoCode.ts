import { useQuery } from '@tanstack/react-query';
import { PromoCode, getPromoCodeByCode, getActivePromoCodes } from '@/lib/promo-service';

export function usePromoCode(code: string) {
    return useQuery({
        queryKey: ['promo-code', code],
        queryFn: async () => {
            if (!code) return null;
            return await getPromoCodeByCode(code);
        },
        enabled: !!code && code.length > 2,
        retry: false
    });
}

export function useActivePromoCodes() {
    return useQuery({
        queryKey: ['active-promo-codes'],
        queryFn: async () => {
            return await getActivePromoCodes();
        }
    });
}
