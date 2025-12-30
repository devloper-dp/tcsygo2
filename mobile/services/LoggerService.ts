type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
    private isProd = process.env.NODE_ENV === 'production';

    private log(level: LogLevel, message: string, data?: any) {
        if (this.isProd && level === 'debug') return;

        const timestamp = new Date().toISOString();
        const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

        switch (level) {
            case 'info':
                console.info(formattedMessage, data || '');
                break;
            case 'warn':
                console.warn(formattedMessage, data || '');
                break;
            case 'error':
                console.error(formattedMessage, data || '');
                break;
            case 'debug':
                console.log(formattedMessage, data || '');
                break;
        }

        // In a real app, you might send errors to a service like Sentry here
        if (level === 'error' && this.isProd) {
            // Sentry.captureException(data || new Error(message));
        }
    }

    info(message: string, data?: any) {
        this.log('info', message, data);
    }

    warn(message: string, data?: any) {
        this.log('warn', message, data);
    }

    error(message: string, data?: any) {
        this.log('error', message, data);
    }

    debug(message: string, data?: any) {
        this.log('debug', message, data);
    }
}

export const logger = new Logger();
