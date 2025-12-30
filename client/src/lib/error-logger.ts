interface ErrorContext {
    user?: {
        id: string;
        email?: string;
    };
    url?: string;
    userAgent?: string;
    timestamp: string;
}

interface ErrorLog {
    message: string;
    stack?: string;
    context: ErrorContext;
    level: 'error' | 'warn' | 'info';
}

class ErrorLogger {
    private logs: ErrorLog[] = [];
    private maxLogs = 100;

    constructor() {
        // Set up global error handlers
        if (typeof window !== 'undefined') {
            window.addEventListener('error', this.handleGlobalError);
            window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
        }
    }

    private handleGlobalError = (event: ErrorEvent) => {
        this.logError(event.error, {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
        });
    };

    private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        this.logError(new Error(`Unhandled Promise Rejection: ${event.reason}`), {
            reason: event.reason,
        });
    };

    private getContext(): ErrorContext {
        return {
            url: typeof window !== 'undefined' ? window.location.href : undefined,
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
            timestamp: new Date().toISOString(),
        };
    }

    private formatLog(log: ErrorLog) {
        const styles = {
            error: 'background: #fee2e2; color: #991b1b; font-weight: bold; padding: 2px 4px; border-radius: 2px;',
            warn: 'background: #fef3c7; color: #92400e; font-weight: bold; padding: 2px 4px; border-radius: 2px;',
            info: 'background: #dcfce7; color: #166534; font-weight: bold; padding: 2px 4px; border-radius: 2px;',
            process: 'background: #dbeafe; color: #1e40af; font-weight: bold; padding: 2px 4px; border-radius: 2px;'
        };

        const levelStyle = styles[log.level as keyof typeof styles] || styles.info;
        const timeStyle = 'color: #6b7280; font-family: monospace;';

        return [
            `%c${log.level.toUpperCase()}%c [${new Date(log.context.timestamp).toLocaleTimeString()}] %c${log.message}`,
            levelStyle,
            timeStyle,
            'color: inherit; font-weight: normal;'
        ];
    }

    public logError(error: Error | string, additionalContext?: any) {
        const errorMessage = typeof error === 'string' ? error : error.message;
        const stack = typeof error === 'object' && error.stack ? error.stack : undefined;

        const log: ErrorLog = {
            message: errorMessage,
            stack,
            context: {
                ...this.getContext(),
                ...additionalContext,
            },
            level: 'error',
        };

        this.logs.push(log);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        if (import.meta.env.DEV) {
            const [format, ...args] = this.formatLog(log);
            console.groupCollapsed(format, ...args);
            if (stack) console.error('Stack:', stack);
            console.log('Context:', log.context);
            console.groupEnd();
        }

        if (import.meta.env.PROD) {
            this.sendToErrorService(log);
        }
    }

    public logWarning(message: string, context?: any) {
        const log: ErrorLog = {
            message,
            context: {
                ...this.getContext(),
                ...context,
            },
            level: 'warn',
        };

        this.logs.push(log);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        if (import.meta.env.DEV) {
            const [format, ...args] = this.formatLog(log);
            console.groupCollapsed(format, ...args);
            console.warn('Context:', log.context);
            console.groupEnd();
        }
    }

    public logInfo(message: string, context?: any) {
        const log: ErrorLog = {
            message,
            context: {
                ...this.getContext(),
                ...context,
            },
            level: 'info',
        };

        this.logs.push(log);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        if (import.meta.env.DEV) {
            const [format, ...args] = this.formatLog(log);
            console.groupCollapsed(format, ...args);
            console.info('Context:', log.context);
            console.groupEnd();
        }
    }

    public logProcess(name: string, stage: 'start' | 'end' | 'step', data?: any) {
        const message = `[Process] ${name}: ${stage}`;
        const log: ErrorLog & { stage: string } = {
            message,
            context: {
                ...this.getContext(),
                ...data,
            },
            level: 'info',
            stage
        };

        if (import.meta.env.DEV) {
            const styles = {
                start: 'background: #dcfce7; color: #166534;',
                end: 'background: #fee2e2; color: #991b1b;',
                step: 'background: #fef3c7; color: #92400e;'
            };
            const stageStyle = `font-weight: bold; padding: 2px 4px; border-radius: 2px; ${styles[stage as keyof typeof styles] || ''}`;

            console.log(
                `%c${stage.toUpperCase()}%c ${name}`,
                stageStyle,
                'font-weight: bold; color: #2563eb;',
                data || ''
            );
        }
    }

    private async sendToErrorService(log: ErrorLog) {
        try {
            // This is where you would integrate with services like:
            // - Sentry: Sentry.captureException(error)
            // - LogRocket: LogRocket.captureException(error)
            // - Custom backend endpoint

            // Example: Send to custom endpoint
            // await fetch('/api/errors', {
            //   method: 'POST',
            //   headers: { 'Content-Type': 'application/json' },
            //   body: JSON.stringify(log),
            // });

            console.log('Error would be sent to error service:', log);
        } catch (err) {
            console.error('Failed to send error to service:', err);
        }
    }

    public getLogs(): ErrorLog[] {
        return [...this.logs];
    }

    public clearLogs() {
        this.logs = [];
    }

    public setUser(user: { id: string; email?: string }) {
        // Store user context for error reporting
        if (typeof window !== 'undefined') {
            (window as any).__errorLoggerUser = user;
        }
    }

    public clearUser() {
        if (typeof window !== 'undefined') {
            delete (window as any).__errorLoggerUser;
        }
    }
}

// Create singleton instance
export const errorLogger = new ErrorLogger();

// Make it globally available for ErrorBoundary
if (typeof window !== 'undefined') {
    (window as any).errorLogger = errorLogger;
}

// Export utility functions
export const logError = (error: Error | string, context?: any) => {
    errorLogger.logError(error, context);
};

export const logWarning = (message: string, context?: any) => {
    errorLogger.logWarning(message, context);
};

export const logInfo = (message: string, context?: any) => {
    errorLogger.logInfo(message, context);
};

export const logProcess = (name: string, stage: 'start' | 'end' | 'step', data?: any) => {
    errorLogger.logProcess(name, stage, data);
};

// Export for use in async error handling
export const withErrorLogging = <T extends (...args: any[]) => any>(
    fn: T,
    errorMessage?: string
): T => {
    return ((...args: any[]) => {
        try {
            const result = fn(...args);

            // Handle promises
            if (result instanceof Promise) {
                return result.catch((error) => {
                    errorLogger.logError(error, {
                        function: fn.name,
                        message: errorMessage,
                        args,
                    });
                    throw error;
                });
            }

            return result;
        } catch (error) {
            errorLogger.logError(error as Error, {
                function: fn.name,
                message: errorMessage,
                args,
            });
            throw error;
        }
    }) as T;
};
