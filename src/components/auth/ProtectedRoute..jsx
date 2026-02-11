import { Navigate, useLocation } from "react-router-dom";
import { useAppSelector, selectIsAuthenticated } from "@/store";

export const ProtectedRoute = ({ children }) => {
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const location = useLocation();

    if (!isAuthenticated) {
        // Redirect to login page but save the attempted location
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};