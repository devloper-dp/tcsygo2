import EventEmitter from 'eventemitter3';

export type AppEvents = {
  'trip:created': (tripId: string) => void;
  'trip:updated': (tripId: string) => void;
  'trip:cancelled': (tripId: string) => void;
  'booking:created': (bookingId: string) => void;
  'booking:confirmed': (bookingId: string) => void;
  'booking:cancelled': (bookingId: string) => void;
  'payment:success': (paymentId: string) => void;
  'payment:failed': (paymentId: string) => void;
  'location:updated': (tripId: string, location: { lat: number; lng: number }) => void;
  'driver:verified': (driverId: string) => void;
  'user:created': (userId: string) => void;
  'user:updated': (userId: string) => void;
  'user:role_changed': (data: { userId: string; newRole: string }) => void;
  'user:verification_updated': (data: { userId: string; status: string }) => void;
  'sos:triggered': (alert: any) => void;
};

class EventBus extends EventEmitter<AppEvents> {
  constructor() {
    super();
  }

  emit<E extends keyof AppEvents>(event: E, ...args: Parameters<AppEvents[E]>): boolean {
    return super.emit(event, ...args);
  }
}

export const eventBus = new EventBus();
