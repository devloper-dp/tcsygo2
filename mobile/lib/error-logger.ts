interface ErrorContext {
    user?: {
        id: string;
        email?: string;
    };
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

    private getContext(): ErrorContext {
        return {
            timestamp: new Date().toISOString(),
        };
    }

    private formatLog(log: ErrorLog) {
        // React Native console doesn't support complex CSS styles like browser, 
        // but we can use simple prefixes or some colors if supported by the debugger.
        const levelPrefix = `[${log.level.toUpperCase()}]`;
        const timestamp = new Date(log.context.timestamp).toLocaleTimeString();
        return `${levelPrefix} ${timestamp} ${log.message}`;
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
        if (this.logs.length > this.maxLogs) this.logs.shift();

        if (__DEV__) {
            console.error(this.formatLog(log), log.context, stack);
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
        if (this.logs.length > this.maxLogs) this.logs.shift();

        if (__DEV__) {
            console.warn(this.formatLog(log), log.context);
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
        if (this.logs.length > this.maxLogs) this.logs.shift();

        if (__DEV__) {
            console.info(this.formatLog(log), log.context);
        }
    }

    public logProcess(name: string, stage: 'start' | 'end' | 'step', data?: any) {
        if (__DEV__) {
            const stageIcon = stage === 'start' ? '🚀' : stage === 'end' ? '✅' : '⚙️';
            console.log(`${stageIcon} [PROCESS][${stage.toUpperCase()}] ${name}`, data || '');
        }
    }
}

export const errorLogger = new ErrorLogger();

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
