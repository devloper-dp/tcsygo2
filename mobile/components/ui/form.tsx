import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
    Controller,
    FormProvider,
    useFormContext,
    type ControllerProps,
    type FieldPath,
    type FieldValues,
    type UseFormReturn,
} from 'react-hook-form';
import { Text } from './text';
import { Label } from './label';
import { cn } from '@/lib/utils';

const Form = FormProvider;

type FormFieldContextValue<
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
    name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>(
    {} as FormFieldContextValue
);

const FormField = <
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
    ...props
}: ControllerProps<TFieldValues, TName>) => {
    return (
        <FormFieldContext.Provider value={{ name: props.name }}>
            <Controller {...props} />
        </FormFieldContext.Provider>
    );
};

const useFormField = () => {
    const fieldContext = React.useContext(FormFieldContext);
    const itemContext = React.useContext(FormItemContext);
    const { getFieldState, formState } = useFormContext();

    const fieldState = getFieldState(fieldContext.name, formState);

    if (!fieldContext) {
        throw new Error('useFormField should be used within <FormField>');
    }

    const { id } = itemContext;

    return {
        id,
        name: fieldContext.name,
        formItemId: `${id}-form-item`,
        formDescriptionId: `${id}-form-item-description`,
        formMessageId: `${id}-form-item-message`,
        ...fieldState,
    };
};

type FormItemContextValue = {
    id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>(
    {} as FormItemContextValue
);

interface FormItemProps {
    children: React.ReactNode;
    className?: string;
}

const FormItem = React.forwardRef<View, FormItemProps>(
    ({ className, children, ...props }, ref) => {
        const id = React.useId();

        return (
            <FormItemContext.Provider value={{ id }}>
                <View className={cn('gap-2 mb-4', className)} {...props}>
                    {children}
                </View>
            </FormItemContext.Provider>
        );
    }
);
FormItem.displayName = 'FormItem';

interface FormLabelProps {
    children: React.ReactNode;
    className?: string;
}

const FormLabel = React.forwardRef<View, FormLabelProps>(
    ({ className, children, ...props }, ref) => {
        const { error } = useFormField();

        return (
            <Label
                className={cn(error && 'text-destructive', className)}
                {...props}
            >
                {children}
            </Label>
        );
    }
);
FormLabel.displayName = 'FormLabel';

interface FormControlProps {
    children: React.ReactNode;
}

const FormControl = React.forwardRef<View, FormControlProps>(
    ({ children, ...props }, ref) => {
        const { error } = useFormField();

        return <View {...props}>{children}</View>;
    }
);
FormControl.displayName = 'FormControl';

interface FormDescriptionProps {
    children: React.ReactNode;
    className?: string;
}

const FormDescription = React.forwardRef<View, FormDescriptionProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <Text
                variant="caption"
                className={cn('text-sm', className)}
                {...props}
            >
                {children}
            </Text>
        );
    }
);
FormDescription.displayName = 'FormDescription';

interface FormMessageProps {
    children?: React.ReactNode;
    className?: string;
}

const FormMessage = React.forwardRef<View, FormMessageProps>(
    ({ className, children, ...props }, ref) => {
        const { error } = useFormField();
        const body = error ? String(error?.message ?? '') : children;

        if (!body) {
            return null;
        }

        return (
            <Text
                className={cn('text-sm font-medium text-destructive', className)}
                {...props}
            >
                {body}
            </Text>
        );
    }
);
FormMessage.displayName = 'FormMessage';

export {
    useFormField,
    Form,
    FormItem,
    FormLabel,
    FormControl,
    FormDescription,
    FormMessage,
    FormField,
};
