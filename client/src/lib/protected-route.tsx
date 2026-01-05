import React from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { Redirect, Route, useLocation } from "wouter";

interface ProtectedRouteProps {
    path: string;
    component: React.ComponentType<any>;
    allowedRoles?: string[];
}

export function ProtectedRoute({ path, component: Component, allowedRoles }: ProtectedRouteProps) {
    const { user, loading } = useAuth();
    // const [, setLocation] = useLocation(); // Unused

    return (
        <Route path={path}>
            {(params) => {
                if (loading) {
                    return (
                        <div className="flex items-center justify-center min-h-screen">
                            <Loader2 className="h-8 w-8 animate-spin text-border" />
                        </div>
                    );
                }

                if (!user) {
                    return <Redirect to="/login" />;
                }

                if (allowedRoles && !allowedRoles.includes(user.role)) {
                    // Redirect based on user role to avoid infinite loops
                    if (user.role === 'admin') return <Redirect to="/admin" />;
                    if (user.role === 'driver') return <Redirect to="/driver-requests" />;
                    return <Redirect to="/" />;
                }

                return <Component {...params} />;
            }}
        </Route>
    );
}
