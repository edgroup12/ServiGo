import { Navigate, useLocation } from 'react-router-dom';

const dashboardByRole = {
    admin: '/admin-dashboard',
    customer: '/customer-dashboard',
    worker: '/worker-dashboard'
};

const ProtectedRoute = ({ currentUser, allowedRoles, children }) => {
    const location = useLocation();

    if (!currentUser?.token) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    if (allowedRoles?.length && !allowedRoles.includes(currentUser.role)) {
        return (
            <Navigate
                to={dashboardByRole[currentUser.role] || '/'}
                replace
                state={{ accessDenied: true }}
            />
        );
    }

    return children;
};

export default ProtectedRoute;
