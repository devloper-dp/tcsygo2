import * as React from "react"
import { View, Image, ImageProps, ViewProps } from "react-native"
import * as Tooltip from 'react-native'; // Placeholder if needed

interface AvatarProps extends ViewProps {
    className?: string;
}

const Avatar = React.forwardRef<View, AvatarProps>(({ className, ...props }, ref) => (
    <View
        ref={ref}
        className={`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full ${className || ''}`}
        {...props}
    />
))
Avatar.displayName = "Avatar"

const AvatarImage = React.forwardRef<Image, ImageProps & { className?: string }>(({ className, ...props }, ref) => (
    <Image
        ref={ref}
        className={`aspect-square h-full w-full ${className || ''}`}
        {...props}
    />
))
AvatarImage.displayName = "AvatarImage"

const AvatarFallback = React.forwardRef<View, ViewProps & { className?: string }>(({ className, ...props }, ref) => (
    <View
        ref={ref}
        className={`flex h-full w-full items-center justify-center rounded-full bg-muted ${className || ''}`}
        {...props}
    />
))
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarImage, AvatarFallback }
