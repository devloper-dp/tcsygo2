import React from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { Redirect, Route, useLocation } from "wouter";

interface ProtectedRouteProps {
    path: string;
    component: React.ComponentType<any>;
}

export function ProtectedRoute({ path, component: Component }: ProtectedRouteProps) {
    const { user, loading } = useAuth();

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

                return <Component {...params} />;
            }}
        </Route>
    );
}
