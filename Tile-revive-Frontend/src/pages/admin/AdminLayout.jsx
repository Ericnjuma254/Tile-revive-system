import { useCallback, useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";

import "./AdminTheme.css";

import AdminSidebar from "./components/AdminSidebar";
import { getPendingUsers } from "../../services/api";

function AdminLayout() {
    const navigate = useNavigate();
    const [pendingUsersCount, setPendingUsersCount] = useState(0);

    useEffect(() => {
        let mounted = true;

        getPendingUsers()
            .then((users) => {
                if (mounted) {
                    setPendingUsersCount(Array.isArray(users) ? users.length : 0);
                }
            })
            .catch(() => {
                if (mounted) {
                    setPendingUsersCount(0);
                }
            });

        return () => {
            mounted = false;
        };
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");

        navigate("/admin/login", {
            replace: true,
        });
    }, [navigate]);

    const handleBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
            return;
        }

        navigate("/admin/dashboard");
    };

    return (
        <div className="admin-app-shell">
            <AdminSidebar
                pendingUsersCount={pendingUsersCount}
                onLogout={logout}
            />

            <main className="admin-main">
                <div className="admin-page-navigation">
                    <button
                        type="button"
                        className="admin-back-button"
                        onClick={handleBack}
                    >
                        <span aria-hidden="true">←</span>
                        <span>Back</span>
                    </button>
                </div>

                <div className="admin-page-content">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}

export default AdminLayout;




