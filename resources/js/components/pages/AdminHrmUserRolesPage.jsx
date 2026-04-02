import React from 'react';
import AdminHrmNameCrudPage from './AdminHrmNameCrudPage.jsx';

export default function AdminHrmUserRolesPage(props) {
    return (
        <AdminHrmNameCrudPage
            {...props}
            title="User Role Create & Index"
            createLabel="Create User Role"
            endpoint="/hrm/user-roles"
            responseKey="user_roles"
            nameLabel="User Role"
            confirmDeleteLabel="user role"
        />
    );
}
