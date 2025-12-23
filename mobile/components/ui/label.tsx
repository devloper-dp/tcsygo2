import { View, TextProps } from 'react-native';
import { Text } from './text';

interface LabelProps extends TextProps {
    className?: string;
    children: React.ReactNode;
}

export function Label({ className, children, ...props }: LabelProps) {
    return (
        <Text
            variant="small"
            className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className || ''}`}
            {...props}
        >
            {children}
        </Text>
    );
}
