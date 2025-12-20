import { io } from "socket.io-client";
import { USE_MOCK } from "./constants";

const createMockSocket = () => ({
    on: (event: string, callback: Function) => {
        console.log('[Mock Socket] Listening for:', event);
    },
    off: (event: string, callback: Function) => {
        console.log('[Mock Socket] Stopped listening for:', event);
    },
    emit: (event: string, data: any) => {
        console.log('[Mock Socket] Emitting:', event, data);
    },
    scale: 1,
    connect: () => console.log('[Mock Socket] Connected'),
    disconnect: () => console.log('[Mock Socket] Disconnected'),
    connected: true,
});

export const socket = USE_MOCK
    ? createMockSocket() as any
    : io(window.location.origin, {
        path: "/socket.io",
        transports: ["websocket"],
        autoConnect: true,
    });
